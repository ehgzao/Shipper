-- Create function for admin to reset user rate limit
CREATE OR REPLACE FUNCTION public.admin_reset_rate_limit(p_target_user_id uuid)
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

    -- Delete today's rate limit record for the user
    DELETE FROM public.ai_coach_rate_limits
    WHERE user_id = p_target_user_id AND reset_date = CURRENT_DATE;
    
    -- Log the action
    PERFORM public.create_audit_log(
        auth.uid(),
        'admin_rate_limit_reset',
        jsonb_build_object('target_user_id', p_target_user_id)
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Rate limit reset successfully');
END;
$$;

-- Create function for admin to set custom rate limit for a user
CREATE OR REPLACE FUNCTION public.admin_set_rate_limit(p_target_user_id uuid, p_new_count integer)
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

    -- Ensure count is valid
    IF p_new_count < 0 THEN
        RAISE EXCEPTION 'Count must be non-negative';
    END IF;

    -- Insert or update the rate limit record
    INSERT INTO public.ai_coach_rate_limits (user_id, request_count, reset_date)
    VALUES (p_target_user_id, p_new_count, CURRENT_DATE)
    ON CONFLICT (user_id, reset_date)
    DO UPDATE SET 
        request_count = p_new_count,
        updated_at = now();
    
    -- Log the action
    PERFORM public.create_audit_log(
        auth.uid(),
        'admin_rate_limit_set',
        jsonb_build_object('target_user_id', p_target_user_id, 'new_count', p_new_count)
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Rate limit updated successfully');
END;
$$;