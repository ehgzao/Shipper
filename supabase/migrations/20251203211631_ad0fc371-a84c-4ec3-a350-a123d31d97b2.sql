-- Create table for recovery emails with verification
CREATE TABLE public.recovery_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  verification_token text,
  verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.recovery_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for recovery_emails
CREATE POLICY "Users can view own recovery email"
ON public.recovery_emails FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery email"
ON public.recovery_emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery email"
ON public.recovery_emails FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery email"
ON public.recovery_emails FOR DELETE
USING (auth.uid() = user_id);

-- Create table for backup codes (hashed)
CREATE TABLE public.backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_codes
CREATE POLICY "Users can view own backup codes"
ON public.backup_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup codes"
ON public.backup_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backup codes"
ON public.backup_codes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup codes"
ON public.backup_codes FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view user backup codes count (not actual codes)
CREATE POLICY "Admins can view backup codes"
ON public.backup_codes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view recovery emails
CREATE POLICY "Admins can view recovery emails"
ON public.recovery_emails FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to verify recovery email
CREATE OR REPLACE FUNCTION public.verify_recovery_email(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find and update the recovery email
  UPDATE public.recovery_emails
  SET verified = true, verified_at = now(), verification_token = NULL, updated_at = now()
  WHERE verification_token = p_token AND verified = false
  RETURNING user_id INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired token');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Email verified successfully');
END;
$$;