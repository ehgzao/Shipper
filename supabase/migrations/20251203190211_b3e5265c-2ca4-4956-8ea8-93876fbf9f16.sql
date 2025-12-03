-- Function for admins to view user data (impersonation/view mode)
CREATE OR REPLACE FUNCTION public.admin_get_user_data(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    user_email TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = p_target_user_id;

    -- Build comprehensive user data view
    SELECT jsonb_build_object(
        'user_id', p_target_user_id,
        'email', user_email,
        'profile', (
            SELECT row_to_json(p.*)::jsonb
            FROM public.profiles p
            WHERE p.id = p_target_user_id
        ),
        'opportunities', (
            SELECT COALESCE(jsonb_agg(row_to_json(o.*)::jsonb), '[]'::jsonb)
            FROM public.opportunities o
            WHERE o.user_id = p_target_user_id
            AND (o.is_deleted = false OR o.is_deleted IS NULL)
        ),
        'target_companies', (
            SELECT COALESCE(jsonb_agg(row_to_json(tc.*)::jsonb), '[]'::jsonb)
            FROM public.target_companies tc
            WHERE tc.user_id = p_target_user_id
        ),
        'stats', jsonb_build_object(
            'total_opportunities', (SELECT COUNT(*) FROM public.opportunities WHERE user_id = p_target_user_id AND (is_deleted = false OR is_deleted IS NULL)),
            'total_target_companies', (SELECT COUNT(*) FROM public.target_companies WHERE user_id = p_target_user_id),
            'ai_coach_usage_today', (SELECT COALESCE(request_count, 0) FROM public.ai_coach_rate_limits WHERE user_id = p_target_user_id AND reset_date = CURRENT_DATE),
            'opportunities_by_status', (
                SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
                FROM (
                    SELECT status, COUNT(*) as cnt
                    FROM public.opportunities
                    WHERE user_id = p_target_user_id AND (is_deleted = false OR is_deleted IS NULL)
                    GROUP BY status
                ) s
            )
        ),
        'recent_activity', (
            SELECT COALESCE(jsonb_agg(row_to_json(a.*)::jsonb), '[]'::jsonb)
            FROM (
                SELECT id, action, details, created_at
                FROM public.audit_logs
                WHERE user_id = p_target_user_id
                ORDER BY created_at DESC
                LIMIT 10
            ) a
        )
    ) INTO result;

    -- Log the impersonation action
    PERFORM public.create_audit_log(
        auth.uid(),
        'admin_viewed_user_data',
        jsonb_build_object('viewed_user_id', p_target_user_id, 'viewed_email', user_email)
    );

    RETURN result;
END;
$$;

-- Update record_login_attempt to trigger alerts on account lock
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean, p_ip_address text DEFAULT NULL::text)
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
BEGIN
    -- Record the attempt
    INSERT INTO public.login_attempts (email, ip_address, success)
    VALUES (p_email, p_ip_address, p_success);

    -- If successful, clear lockout
    IF p_success THEN
        DELETE FROM public.account_lockouts WHERE email = p_email;
        RETURN jsonb_build_object('locked', false, 'message', 'Login successful');
    END IF;

    -- Count recent failed attempts (last 15 minutes)
    SELECT COUNT(*) INTO v_failed_count
    FROM public.login_attempts
    WHERE email = p_email
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
        VALUES (p_email, v_locked_until, v_failed_count)
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
                'ip_address', p_ip_address
            )
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
            'ip_address', p_ip_address
        ) ELSE NULL END
    );
END;
$$;