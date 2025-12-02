-- Add new status values to the opportunity_status enum
ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'technical_test';
ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'final_interview';