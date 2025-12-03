-- Add soft delete columns to opportunities
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Create index for faster queries on deleted items
CREATE INDEX IF NOT EXISTS idx_opportunities_deleted ON public.opportunities(is_deleted, deleted_at);