-- Migration: Create Credits System
-- This creates the complete credits system for pay-per-use functionality

-- Create user_credits table to track credit balances
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_credits integer NOT NULL DEFAULT 0,
  used_credits integer NOT NULL DEFAULT 0,
  remaining_credits integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- One credit balance per user
);

-- Create credit_transactions table to track credit purchases and usage
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund')),
  credits_amount integer NOT NULL,
  description text,
  asaas_payment_id text, -- For purchase transactions
  property_id uuid REFERENCES properties(id), -- For usage transactions
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to get user's current credit balance
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id uuid)
RETURNS TABLE (
  total_credits integer,
  used_credits integer,
  remaining_credits integer,
  last_updated timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(uc.total_credits, 0) as total_credits,
    COALESCE(uc.used_credits, 0) as used_credits,
    COALESCE(uc.remaining_credits, 0) as remaining_credits,
    COALESCE(uc.last_updated, now()) as last_updated
  FROM public.user_credits uc
  WHERE uc.user_id = p_user_id;
$$;

-- Function to use a credit (decrement remaining credits)
CREATE OR REPLACE FUNCTION public.use_credit(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_description text DEFAULT 'Property inspection'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_remaining integer;
BEGIN
  -- Check if user has credits
  SELECT remaining_credits INTO current_remaining
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  IF current_remaining IS NULL OR current_remaining <= 0 THEN
    RETURN false; -- No credits available
  END IF;
  
  -- Use one credit
  UPDATE public.user_credits
  SET 
    used_credits = used_credits + 1,
    remaining_credits = remaining_credits - 1,
    last_updated = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    description,
    property_id
  ) VALUES (
    p_user_id,
    'usage',
    -1,
    p_description,
    p_property_id
  );
  
  RETURN true;
END;
$$;

-- Function to add credits (after purchase)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_credits integer,
  p_asaas_payment_id text DEFAULT NULL,
  p_description text DEFAULT 'Credit purchase'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user credits
  INSERT INTO public.user_credits (
    user_id,
    total_credits,
    used_credits,
    remaining_credits,
    last_updated
  )
  VALUES (
    p_user_id,
    p_credits,
    0,
    p_credits,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_credits = user_credits.total_credits + p_credits,
    remaining_credits = user_credits.remaining_credits + p_credits,
    last_updated = now();
    
  -- Record the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    credits_amount,
    description,
    asaas_payment_id
  ) VALUES (
    p_user_id,
    'purchase',
    p_credits,
    p_description,
    p_asaas_payment_id
  );
  
  RETURN true;
END;
$$;

-- Function to check if user can use credit
CREATE OR REPLACE FUNCTION public.can_use_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(uc.remaining_credits, 0) > 0
  FROM public.user_credits uc
  WHERE uc.user_id = p_user_id;
$$;

-- Enable RLS on new tables
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits
CREATE POLICY "Users can see their own credits" 
ON public.user_credits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can manage credits" 
ON public.user_credits FOR ALL 
USING (true); -- Functions run with SECURITY DEFINER

-- Create policies for credit_transactions  
CREATE POLICY "Users can see their own transactions" 
ON public.credit_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert transactions" 
ON public.credit_transactions FOR INSERT 
WITH CHECK (true); -- Functions run with SECURITY DEFINER

-- Initialize credits for existing users (zero credits)
INSERT INTO public.user_credits (user_id, total_credits, used_credits, remaining_credits)
SELECT DISTINCT 
  p.user_id,
  0,
  0,
  0
FROM public.properties p
WHERE p.user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;