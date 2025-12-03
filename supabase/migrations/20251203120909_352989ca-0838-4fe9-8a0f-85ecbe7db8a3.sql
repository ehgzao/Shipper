-- Create rate limiting table for AI Coach
CREATE TABLE public.ai_coach_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reset_date)
);

-- Enable RLS
ALTER TABLE public.ai_coach_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own rate limits
CREATE POLICY "Users can view their own rate limits"
ON public.ai_coach_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
ON public.ai_coach_rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
ON public.ai_coach_rate_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to check and increment rate limit (returns true if allowed)
CREATE OR REPLACE FUNCTION public.check_ai_coach_rate_limit(p_user_id UUID, p_daily_limit INTEGER DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert or update rate limit record for today
  INSERT INTO public.ai_coach_rate_limits (user_id, request_count, reset_date)
  VALUES (p_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id, reset_date)
  DO UPDATE SET 
    request_count = ai_coach_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_count;
  
  -- Return true if under limit
  RETURN v_count <= p_daily_limit;
END;
$$;

-- Function to get remaining requests
CREATE OR REPLACE FUNCTION public.get_ai_coach_remaining_requests(p_user_id UUID, p_daily_limit INTEGER DEFAULT 10)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT request_count INTO v_count
  FROM public.ai_coach_rate_limits
  WHERE user_id = p_user_id AND reset_date = CURRENT_DATE;
  
  IF v_count IS NULL THEN
    RETURN p_daily_limit;
  END IF;
  
  RETURN GREATEST(0, p_daily_limit - v_count);
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_ai_coach_rate_limits_updated_at
BEFORE UPDATE ON public.ai_coach_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();