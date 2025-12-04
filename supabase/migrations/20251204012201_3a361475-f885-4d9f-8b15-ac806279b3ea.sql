-- Add latitude/longitude columns to login_attempts for geolocation tracking
ALTER TABLE public.login_attempts 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create function to check for impossible travel
-- Returns: { suspicious: boolean, reason: string, details: jsonb }
CREATE OR REPLACE FUNCTION public.check_impossible_travel(
    p_email text,
    p_current_lat numeric DEFAULT NULL,
    p_current_lng numeric DEFAULT NULL,
    p_max_speed_kmh numeric DEFAULT 1000 -- Max realistic travel speed (flight speed ~900km/h + buffer)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_attempt RECORD;
    v_time_diff_hours numeric;
    v_distance_km numeric;
    v_required_speed_kmh numeric;
BEGIN
    -- If no coordinates provided, can't check
    IF p_current_lat IS NULL OR p_current_lng IS NULL THEN
        RETURN jsonb_build_object(
            'suspicious', false,
            'reason', 'No location data available',
            'details', NULL
        );
    END IF;

    -- Get the last successful login with location data
    SELECT 
        latitude,
        longitude,
        created_at,
        city,
        country
    INTO v_last_attempt
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
    AND success = true
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no previous login with location, not suspicious
    IF v_last_attempt IS NULL THEN
        RETURN jsonb_build_object(
            'suspicious', false,
            'reason', 'No previous login location to compare',
            'details', NULL
        );
    END IF;

    -- Calculate time difference in hours
    v_time_diff_hours := EXTRACT(EPOCH FROM (now() - v_last_attempt.created_at)) / 3600.0;

    -- Don't flag if more than 24 hours have passed (plenty of time to travel anywhere)
    IF v_time_diff_hours > 24 THEN
        RETURN jsonb_build_object(
            'suspicious', false,
            'reason', 'Sufficient time has passed for travel',
            'details', NULL
        );
    END IF;

    -- Calculate approximate distance using Haversine formula
    -- Earth's radius in km: 6371
    v_distance_km := 2 * 6371 * ASIN(
        SQRT(
            POWER(SIN(RADIANS(p_current_lat - v_last_attempt.latitude) / 2), 2) +
            COS(RADIANS(v_last_attempt.latitude)) * COS(RADIANS(p_current_lat)) *
            POWER(SIN(RADIANS(p_current_lng - v_last_attempt.longitude) / 2), 2)
        )
    );

    -- Calculate required speed to travel this distance
    IF v_time_diff_hours > 0 THEN
        v_required_speed_kmh := v_distance_km / v_time_diff_hours;
    ELSE
        -- If same minute, any significant distance is suspicious
        v_required_speed_kmh := CASE WHEN v_distance_km > 50 THEN 99999 ELSE 0 END;
    END IF;

    -- Check if travel is impossible (faster than commercial flight)
    IF v_required_speed_kmh > p_max_speed_kmh AND v_distance_km > 100 THEN
        RETURN jsonb_build_object(
            'suspicious', true,
            'reason', 'Impossible travel detected',
            'details', jsonb_build_object(
                'distance_km', ROUND(v_distance_km::numeric, 2),
                'time_hours', ROUND(v_time_diff_hours::numeric, 2),
                'required_speed_kmh', ROUND(v_required_speed_kmh::numeric, 2),
                'last_location', COALESCE(v_last_attempt.city || ', ' || v_last_attempt.country, 'Unknown'),
                'last_login_at', v_last_attempt.created_at
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'suspicious', false,
        'reason', 'Travel speed within acceptable limits',
        'details', NULL
    );
END;
$$;

-- Create function to record login attempt with geolocation
CREATE OR REPLACE FUNCTION public.record_login_attempt_with_geo(
    p_email text,
    p_success boolean,
    p_ip_address text DEFAULT NULL,
    p_latitude numeric DEFAULT NULL,
    p_longitude numeric DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_country text DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_device_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_attempts INTEGER := 5;
    v_lockout_minutes INTEGER := 15;
    v_failed_count INTEGER;
    v_is_locked BOOLEAN;
    v_locked_until TIMESTAMP WITH TIME ZONE;
    v_should_alert BOOLEAN := false;
    v_alert_type TEXT;
    v_impossible_travel jsonb;
BEGIN
    -- Check for impossible travel before recording attempt
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        v_impossible_travel := public.check_impossible_travel(p_email, p_latitude, p_longitude);
    ELSE
        v_impossible_travel := jsonb_build_object('suspicious', false, 'reason', 'No location data');
    END IF;

    -- Record the attempt with full geo data
    INSERT INTO public.login_attempts (
        email, ip_address, success, latitude, longitude, 
        city, country, user_agent, device_fingerprint
    )
    VALUES (
        LOWER(p_email), p_ip_address, p_success, p_latitude, p_longitude,
        p_city, p_country, p_user_agent, p_device_fingerprint
    );

    -- If successful, clear lockout
    IF p_success THEN
        DELETE FROM public.account_lockouts WHERE email = LOWER(p_email);
        
        -- Return with impossible travel info
        RETURN jsonb_build_object(
            'locked', false, 
            'message', 'Login successful',
            'impossible_travel', v_impossible_travel
        );
    END IF;

    -- Count recent failed attempts (last 15 minutes)
    SELECT COUNT(*) INTO v_failed_count
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

    -- Alert on 3+ failed attempts (before lock)
    IF v_failed_count >= 3 AND v_failed_count < v_max_attempts THEN
        v_should_alert := true;
        v_alert_type := 'multiple_failed_logins';
    END IF;

    -- Check if should lock
    IF v_failed_count >= v_max_attempts THEN
        v_locked_until := now() + (v_lockout_minutes || ' minutes')::INTERVAL;
        
        INSERT INTO public.account_lockouts (email, locked_until, failed_attempts)
        VALUES (LOWER(p_email), v_locked_until, v_failed_count)
        ON CONFLICT (email) DO UPDATE SET
            locked_until = v_locked_until,
            failed_attempts = v_failed_count,
            updated_at = now();

        v_should_alert := true;
        v_alert_type := 'account_locked';

        RETURN jsonb_build_object(
            'locked', true,
            'locked_until', v_locked_until,
            'message', 'Account locked due to too many failed attempts',
            'should_alert', v_should_alert,
            'alert_type', v_alert_type,
            'alert_details', jsonb_build_object(
                'email', p_email,
                'failed_attempts', v_failed_count,
                'ip_address', p_ip_address,
                'location', COALESCE(p_city || ', ' || p_country, 'Unknown')
            ),
            'impossible_travel', v_impossible_travel
        );
    END IF;

    RETURN jsonb_build_object(
        'locked', false,
        'attempts_remaining', v_max_attempts - v_failed_count,
        'message', 'Login failed',
        'should_alert', v_should_alert,
        'alert_type', v_alert_type,
        'alert_details', CASE WHEN v_should_alert THEN jsonb_build_object(
            'email', p_email,
            'attempt_count', v_failed_count,
            'ip_address', p_ip_address,
            'location', COALESCE(p_city || ', ' || p_country, 'Unknown')
        ) ELSE NULL END,
        'impossible_travel', v_impossible_travel
    );
END;
$$;