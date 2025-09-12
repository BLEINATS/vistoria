-- Migration: Create credit_payments table for tracking pending credit purchases
-- This table stores payment records that are confirmed via webhook

-- Create credit_payments table to track pending and completed credit purchases
CREATE TABLE IF NOT EXISTS public.credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asaas_payment_id text UNIQUE NOT NULL,
  asaas_customer_id text NOT NULL,
  package_id text NOT NULL,
  package_name text NOT NULL,
  credits_amount integer NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('PIX', 'BOLETO', 'CREDIT_CARD')),
  status text NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
  external_reference text,
  webhook_processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_payments_user_id ON public.credit_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_asaas_payment_id ON public.credit_payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_status ON public.credit_payments(status);
CREATE INDEX IF NOT EXISTS idx_credit_payments_external_reference ON public.credit_payments(external_reference);

-- Enable RLS
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_payments
CREATE POLICY "Users can see their own credit payments" 
ON public.credit_payments FOR SELECT 
USING (auth.uid() = user_id);

-- Allow service role to manage all credit payments (for webhook processing)
CREATE POLICY "Service can manage credit payments" 
ON public.credit_payments FOR ALL 
USING (true);

-- Function to process credit payment confirmation (called by webhook)
CREATE OR REPLACE FUNCTION public.process_credit_payment_confirmation(
  p_asaas_payment_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record record;
BEGIN
  -- Get the pending payment record
  SELECT * INTO payment_record
  FROM public.credit_payments
  WHERE asaas_payment_id = p_asaas_payment_id
  AND status = 'PENDING';
  
  IF NOT FOUND THEN
    -- No pending payment found
    RETURN false;
  END IF;
  
  -- Mark payment as confirmed
  UPDATE public.credit_payments
  SET 
    status = 'CONFIRMED',
    webhook_processed_at = now(),
    updated_at = now()
  WHERE asaas_payment_id = p_asaas_payment_id;
  
  -- Add credits to user's balance using existing function
  PERFORM public.add_credits(
    payment_record.user_id,
    payment_record.credits_amount,
    payment_record.asaas_payment_id,
    'Credit purchase: ' || payment_record.package_name
  );
  
  RETURN true;
END;
$$;

-- Function to handle failed credit payments
CREATE OR REPLACE FUNCTION public.process_credit_payment_failure(
  p_asaas_payment_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark payment as failed
  UPDATE public.credit_payments
  SET 
    status = 'FAILED',
    webhook_processed_at = now(),
    updated_at = now()
  WHERE asaas_payment_id = p_asaas_payment_id
  AND status = 'PENDING';
  
  RETURN FOUND;
END;
$$;