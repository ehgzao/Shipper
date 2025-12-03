-- Enable realtime for login_attempts and audit_logs tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_lockouts;

-- Set REPLICA IDENTITY to FULL for complete row data in realtime updates
ALTER TABLE public.login_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.account_lockouts REPLICA IDENTITY FULL;