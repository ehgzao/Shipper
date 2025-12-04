-- Create table to track password reset attempts
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_created 
ON public.password_reset_attempts (email, created_at DESC);

-- Enable RLS
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- No public policies - all access through SECURITY DEFINER function

-- Create function to check and record password reset attempts
-- Returns: { allowed: boolean, retry_after_seconds: number, message: string }
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(
    p_email text,
    p_ip_address text DEFAULT NULL,
    p_max_attempts_per_hour integer DEFAULT 3,
    p_max_attempts_per_day integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hourly_count integer;
    v_daily_count integer;
    v_oldest_hourly_attempt timestamp with time zone;
    v_retry_after_seconds integer;
BEGIN
    -- Count attempts in the last hour
    SELECT COUNT(*), MIN(created_at)
    INTO v_hourly_count, v_oldest_hourly_attempt
    FROM public.password_reset_attempts
    WHERE email = LOWER(p_email)
    AND created_at > now() - INTERVAL '1 hour';

    -- Check hourly limit
    IF v_hourly_count >= p_max_attempts_per_hour THEN
        v_retry_after_seconds := EXTRACT(EPOCH FROM (v_oldest_hourly_attempt + INTERVAL '1 hour' - now()))::integer;
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', GREATEST(v_retry_after_seconds, 0),
            'message', 'Too many password reset requests. Please try again later.'
        );
    END IF;

    -- Count attempts in the last 24 hours
    SELECT COUNT(*)
    INTO v_daily_count
    FROM public.password_reset_attempts
    WHERE email = LOWER(p_email)
    AND created_at > now() - INTERVAL '24 hours';

    -- Check daily limit
    IF v_daily_count >= p_max_attempts_per_day THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', 3600, -- Suggest retry in 1 hour
            'message', 'Daily limit for password reset requests exceeded. Please try again tomorrow.'
        );
    END IF;

    -- Record the attempt
    INSERT INTO public.password_reset_attempts (email, ip_address)
    VALUES (LOWER(p_email), p_ip_address);

    -- Clean up old attempts (older than 7 days) - opportunistic cleanup
    DELETE FROM public.password_reset_attempts
    WHERE created_at < now() - INTERVAL '7 days';

    RETURN jsonb_build_object(
        'allowed', true,
        'retry_after_seconds', 0,
        'message', 'OK'
    );
END;
$$;