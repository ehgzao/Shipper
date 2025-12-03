-- Create audit_logs table for tracking sensitive actions
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow inserts via service role or authenticated users for their own logs
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create login_attempts table for brute force protection
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public insert needed for tracking before auth)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (needed for login tracking)
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create account_lockouts table
CREATE TABLE public.account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Allow checking lockout status (needed before auth)
CREATE POLICY "Anyone can check lockout status"
ON public.account_lockouts
FOR SELECT
USING (true);

-- Allow inserts and updates for lockout tracking
CREATE POLICY "Anyone can manage lockouts"
ON public.account_lockouts
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.account_lockouts
        WHERE email = p_email
        AND locked_until > now()
    );
END;
$$;

-- Function to record login attempt and handle lockout
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
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

    -- Check if should lock
    IF v_failed_count >= v_max_attempts THEN
        v_locked_until := now() + (v_lockout_minutes || ' minutes')::INTERVAL;
        
        INSERT INTO public.account_lockouts (email, locked_until, failed_attempts)
        VALUES (p_email, v_locked_until, v_failed_count)
        ON CONFLICT (email) DO UPDATE SET
            locked_until = v_locked_until,
            failed_attempts = v_failed_count,
            updated_at = now();

        RETURN jsonb_build_object(
            'locked', true,
            'locked_until', v_locked_until,
            'message', 'Account locked due to too many failed attempts'
        );
    END IF;

    RETURN jsonb_build_object(
        'locked', false,
        'attempts_remaining', v_max_attempts - v_failed_count,
        'message', 'Login failed'
    );
END;
$$;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (p_user_id, p_action, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function for admins to manage user roles
CREATE OR REPLACE FUNCTION public.admin_manage_role(
    p_target_user_id UUID,
    p_role TEXT,
    p_action TEXT -- 'add' or 'remove'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Prevent self-demotion
    IF p_target_user_id = auth.uid() AND p_action = 'remove' AND p_role = 'admin' THEN
        RAISE EXCEPTION 'Cannot remove your own admin role';
    END IF;

    IF p_action = 'add' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_target_user_id, p_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Log the action
        PERFORM public.create_audit_log(
            auth.uid(),
            'admin_role_granted',
            jsonb_build_object('target_user_id', p_target_user_id, 'role', p_role)
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Role added successfully');
    ELSIF p_action = 'remove' THEN
        DELETE FROM public.user_roles
        WHERE user_id = p_target_user_id AND role = p_role;
        
        -- Log the action
        PERFORM public.create_audit_log(
            auth.uid(),
            'admin_role_revoked',
            jsonb_build_object('target_user_id', p_target_user_id, 'role', p_role)
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Role removed successfully');
    ELSE
        RAISE EXCEPTION 'Invalid action. Use "add" or "remove"';
    END IF;
END;
$$;

-- Function to get all users for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::TEXT,
        p.full_name,
        u.created_at,
        EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') as is_admin
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Update get_admin_stats to include audit log info
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'total_opportunities', (SELECT COUNT(*) FROM public.opportunities WHERE is_deleted = false),
        'total_target_companies', (SELECT COUNT(*) FROM public.target_companies),
        'ai_coach_usage_today', (
            SELECT COALESCE(SUM(request_count), 0) 
            FROM public.ai_coach_rate_limits 
            WHERE reset_date = CURRENT_DATE
        ),
        'ai_coach_unique_users_today', (
            SELECT COUNT(DISTINCT user_id) 
            FROM public.ai_coach_rate_limits 
            WHERE reset_date = CURRENT_DATE
        ),
        'failed_logins_today', (
            SELECT COUNT(*) 
            FROM public.login_attempts 
            WHERE success = false 
            AND created_at >= CURRENT_DATE
        ),
        'locked_accounts', (
            SELECT COUNT(*) 
            FROM public.account_lockouts 
            WHERE locked_until > now()
        ),
        'rate_limit_details', (
            SELECT json_agg(json_build_object(
                'user_id', r.user_id,
                'email', u.email,
                'request_count', r.request_count,
                'reset_date', r.reset_date
            ))
            FROM public.ai_coach_rate_limits r
            JOIN auth.users u ON r.user_id = u.id
            WHERE r.reset_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY r.reset_date DESC, r.request_count DESC
        ),
        'recent_audit_logs', (
            SELECT json_agg(json_build_object(
                'id', a.id,
                'user_id', a.user_id,
                'email', u.email,
                'action', a.action,
                'details', a.details,
                'created_at', a.created_at
            ))
            FROM (
                SELECT * FROM public.audit_logs 
                ORDER BY created_at DESC 
                LIMIT 20
            ) a
            LEFT JOIN auth.users u ON a.user_id = u.id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;