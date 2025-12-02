-- First, convert status column to text to allow manipulation
ALTER TABLE public.opportunities 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE TEXT;

-- Update existing data to map old statuses to new ones
UPDATE public.opportunities SET status = 'assessment' WHERE status IN ('technical_test', 'final_interview');

-- Drop old enum
DROP TYPE IF EXISTS opportunity_status;

-- Create new status enum with consolidated statuses
CREATE TYPE opportunity_status AS ENUM ('researching', 'applied', 'interviewing', 'assessment', 'offer', 'rejected', 'ghosted', 'withdrawn');

-- Convert back to enum
ALTER TABLE public.opportunities 
  ALTER COLUMN status TYPE opportunity_status USING status::opportunity_status,
  ALTER COLUMN status SET DEFAULT 'researching';

-- Drop the new enum type if it was created from failed migration
DROP TYPE IF EXISTS opportunity_status_new;