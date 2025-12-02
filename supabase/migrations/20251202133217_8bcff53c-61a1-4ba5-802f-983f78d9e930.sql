-- Add column for country work preferences (stores country -> work_models mapping)
-- Example: {"brazil": ["remote"], "portugal": ["onsite", "hybrid"]}
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_work_preferences JSONB DEFAULT '{}'::jsonb;