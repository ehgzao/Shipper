-- Add custom tags column to opportunities table
ALTER TABLE public.opportunities 
ADD COLUMN tags text[] DEFAULT '{}'::text[];