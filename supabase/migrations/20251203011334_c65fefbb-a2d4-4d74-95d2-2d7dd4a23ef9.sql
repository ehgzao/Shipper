-- Add display_order column to target_companies for drag-drop sorting
ALTER TABLE public.target_companies 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;