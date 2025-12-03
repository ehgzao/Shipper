-- Create app_role enum (already exists from types, but let's ensure it's there)
DO $$ BEGIN
    CREATE TYPE public.app_role_admin AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only allow admins to manage roles (via edge function)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create sessions tracking table
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_current BOOLEAN DEFAULT false,
    UNIQUE (user_id, session_id)
);

-- Enable RLS for sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
ON public.user_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Insert admin role for lima.ehg@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'lima.ehg@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to get admin stats
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
        )
    ) INTO result;
    
    RETURN result;
END;
$$;