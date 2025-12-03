-- Add device and geolocation fields to login_attempts
ALTER TABLE public.login_attempts 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Create index for better query performance on security analytics
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON public.login_attempts(email, created_at DESC);