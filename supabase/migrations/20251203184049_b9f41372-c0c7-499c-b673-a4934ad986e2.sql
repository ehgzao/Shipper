-- Remove overly permissive RLS policies on account_lockouts
-- All lockout operations are handled by SECURITY DEFINER functions (record_login_attempt, is_account_locked)
-- No direct client access is needed

DROP POLICY IF EXISTS "Anyone can manage lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Anyone can check lockout status" ON public.account_lockouts;