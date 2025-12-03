-- Add sort_preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kanban_sort_preference text DEFAULT 'manual';