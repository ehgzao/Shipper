-- Add theme_preference and display_order columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system';

-- Add display_order to opportunities for ordering within columns
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;