-- Remove the permissive INSERT policy on login_attempts
-- The record_login_attempt SECURITY DEFINER function handles inserts securely
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;