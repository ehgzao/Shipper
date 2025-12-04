-- Fix get_admin_stats function to resolve GROUP BY error with rate_limit_details
-- This version uses a completely different approach without ORDER BY inside json_agg
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    v_rate_limit_details JSON;
    v_recent_audit_logs JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Build rate_limit_details separately to avoid GROUP BY issues
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO v_rate_limit_details
    FROM (
        SELECT 
            r.user_id,
            u.email,
            r.request_count,
            r.reset_date
        FROM public.ai_coach_rate_limits r
        JOIN auth.users u ON r.user_id = u.id
        WHERE r.reset_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY r.reset_date DESC, r.request_count DESC
    ) t;
    
    -- Build recent_audit_logs separately
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO v_recent_audit_logs
    FROM (
        SELECT 
            a.id,
            a.user_id,
            u.email,
            a.action,
            a.details,
            a.created_at
        FROM public.audit_logs a
        LEFT JOIN auth.users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 20
    ) t;
    
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'total_opportunities', (SELECT COUNT(*) FROM public.opportunities WHERE is_deleted = false OR is_deleted IS NULL),
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
        'successful_logins_today', (
            SELECT COUNT(*) 
            FROM public.login_attempts 
            WHERE success = true 
            AND created_at >= CURRENT_DATE
        ),
        'locked_accounts', (
            SELECT COUNT(*) 
            FROM public.account_lockouts 
            WHERE locked_until > now()
        ),
        'locked_account_details', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT email, locked_until, failed_attempts, created_at
                FROM public.account_lockouts
                WHERE locked_until > now()
            ) t
        ),
        'active_sessions', (
            SELECT COUNT(*) FROM public.user_sessions 
            WHERE last_active_at > now() - INTERVAL '24 hours'
        ),
        'recent_logins', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT email, success, ip_address, created_at
                FROM public.login_attempts 
                ORDER BY created_at DESC 
                LIMIT 20
            ) t
        ),
        'user_engagement', (
            SELECT json_build_object(
                'users_active_today', (SELECT COUNT(DISTINCT user_id) FROM public.opportunities WHERE updated_at >= CURRENT_DATE),
                'users_active_week', (SELECT COUNT(DISTINCT user_id) FROM public.opportunities WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'),
                'new_users_today', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE),
                'new_users_week', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
                'opportunities_created_today', (SELECT COUNT(*) FROM public.opportunities WHERE created_at >= CURRENT_DATE),
                'opportunities_created_week', (SELECT COUNT(*) FROM public.opportunities WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
            )
        ),
        'rate_limit_details', v_rate_limit_details,
        'recent_audit_logs', v_recent_audit_logs
    ) INTO result;
    
    RETURN result;
END;
$$;
