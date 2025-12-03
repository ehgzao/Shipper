-- Function to unlock accounts (admin only)
CREATE OR REPLACE FUNCTION public.admin_unlock_account(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Delete the lockout record
    DELETE FROM public.account_lockouts WHERE email = p_email;
    
    -- Log the action
    PERFORM public.create_audit_log(
        auth.uid(),
        'admin_account_unlocked',
        jsonb_build_object('unlocked_email', p_email)
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Account unlocked successfully');
END;
$$;

-- Update get_admin_stats to include more activity data
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
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
            SELECT json_agg(json_build_object(
                'email', email,
                'locked_until', locked_until,
                'failed_attempts', failed_attempts,
                'created_at', created_at
            ))
            FROM public.account_lockouts
            WHERE locked_until > now()
        ),
        'active_sessions', (
            SELECT COUNT(*) FROM public.user_sessions 
            WHERE last_active_at > now() - INTERVAL '24 hours'
        ),
        'recent_logins', (
            SELECT json_agg(json_build_object(
                'email', la.email,
                'success', la.success,
                'ip_address', la.ip_address,
                'created_at', la.created_at
            ))
            FROM (
                SELECT * FROM public.login_attempts 
                ORDER BY created_at DESC 
                LIMIT 20
            ) la
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