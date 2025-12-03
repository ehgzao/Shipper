-- Add previous_status column to track last status for restoration
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS previous_status text DEFAULT NULL;

-- Add is_favorite column for favorites feature
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Add is_favorite to target_companies
ALTER TABLE public.target_companies 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Add notes to target_companies for research notes
ALTER TABLE public.target_companies 
ADD COLUMN IF NOT EXISTS research_notes text DEFAULT NULL;

-- Add notes_updated_at for tracking
ALTER TABLE public.target_companies 
ADD COLUMN IF NOT EXISTS notes_updated_at timestamp with time zone DEFAULT NULL;