-- Add fit_level column to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS fit_level integer DEFAULT 2;

-- Add opportunity_tag column to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS opportunity_tag text;

-- Add last_checked_at to target_companies if not exists
ALTER TABLE public.target_companies ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone;