-- Migration: Create Subscription System with Plans and Limits
-- This creates the complete subscription system for VistorIA

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  interval_type text NOT NULL DEFAULT 'month', -- 'month' or 'year'
  properties_limit integer,
  environments_limit integer,
  photos_per_environment_limit integer NOT NULL DEFAULT 5,
  ai_analysis_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, properties_limit, environments_limit, photos_per_environment_limit) VALUES 
('Gratuito', 0, 1, 3, 5),
('Básico', 47.00, 2, NULL, 5),
('Premium', 77.00, NULL, NULL, 5);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id varchar REFERENCES public.subscription_plans(id) NOT NULL,
  asaas_customer_id text,
  asaas_subscription_id text,
  status text NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'suspended'
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT now() + interval '1 month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- One subscription per user
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.user_usage (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
  properties_used integer NOT NULL DEFAULT 0,
  environments_used integer NOT NULL DEFAULT 0,
  photos_uploaded integer NOT NULL DEFAULT 0,
  ai_analyses_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start) -- One record per user per period
);

-- Function to get user's current plan with limits
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
RETURNS TABLE (
  plan_name text,
  properties_limit integer,
  environments_limit integer,
  photos_per_environment_limit integer,
  ai_analysis_limit integer,
  properties_used integer,
  environments_used integer,
  photos_uploaded integer,
  ai_analyses_used integer
)
LANGUAGE sql
STABLE
AS $$
  WITH user_plan AS (
    SELECT sp.*
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id 
    AND s.status = 'active'
  ),
  current_usage AS (
    SELECT *
    FROM public.user_usage
    WHERE user_id = p_user_id 
    AND period_start <= now() 
    AND period_end >= now()
  )
  SELECT 
    COALESCE(up.name, 'Gratuito') as plan_name,
    COALESCE(up.properties_limit, 1) as properties_limit,
    COALESCE(up.environments_limit, 3) as environments_limit,
    COALESCE(up.photos_per_environment_limit, 5) as photos_per_environment_limit,
    up.ai_analysis_limit,
    COALESCE(cu.properties_used, 0) as properties_used,
    COALESCE(cu.environments_used, 0) as environments_used,
    COALESCE(cu.photos_uploaded, 0) as photos_uploaded,
    COALESCE(cu.ai_analyses_used, 0) as ai_analyses_used
  FROM user_plan up
  LEFT JOIN current_usage cu ON cu.user_id = p_user_id
  
  UNION ALL
  
  -- Default to free plan if no subscription
  SELECT 
    'Gratuito' as plan_name,
    1 as properties_limit,
    3 as environments_limit,
    5 as photos_per_environment_limit,
    NULL as ai_analysis_limit,
    COALESCE(cu.properties_used, 0) as properties_used,
    COALESCE(cu.environments_used, 0) as environments_used,
    COALESCE(cu.photos_uploaded, 0) as photos_uploaded,
    COALESCE(cu.ai_analyses_used, 0) as ai_analyses_used
  FROM current_usage cu
  RIGHT JOIN (SELECT p_user_id as user_id) dummy ON cu.user_id = dummy.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id AND status = 'active'
  )
  LIMIT 1;
$$;

-- Function to update user usage
CREATE OR REPLACE FUNCTION public.increment_user_usage(
  p_user_id uuid,
  p_type text, -- 'properties', 'environments', 'photos', 'ai_analyses'
  p_count integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update usage for current period
  INSERT INTO public.user_usage (
    user_id, 
    period_start, 
    period_end,
    properties_used,
    environments_used, 
    photos_uploaded,
    ai_analyses_used
  )
  VALUES (
    p_user_id,
    date_trunc('month', now()),
    (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
    CASE WHEN p_type = 'properties' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'environments' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'photos' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'ai_analyses' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    properties_used = CASE WHEN p_type = 'properties' THEN user_usage.properties_used + p_count ELSE user_usage.properties_used END,
    environments_used = CASE WHEN p_type = 'environments' THEN user_usage.environments_used + p_count ELSE user_usage.environments_used END,
    photos_uploaded = CASE WHEN p_type = 'photos' THEN user_usage.photos_uploaded + p_count ELSE user_usage.photos_uploaded END,
    ai_analyses_used = CASE WHEN p_type = 'ai_analyses' THEN user_usage.ai_analyses_used + p_count ELSE user_usage.ai_analyses_used END,
    updated_at = now();
    
  RETURN true;
END;
$$;

-- Create default subscription for existing users (free plan)
DO $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  SELECT DISTINCT 
    p.user_id, 
    (SELECT id FROM public.subscription_plans WHERE name = 'Gratuito' LIMIT 1),
    'active'
  FROM public.properties p
  WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.user_id
  );
END $$;

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Plans are visible to everyone (public)
CREATE POLICY "Plans are publicly visible" ON public.subscription_plans FOR SELECT USING (true);

-- Users can see their own subscription
CREATE POLICY "Users can see their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Users can see their own usage
CREATE POLICY "Users can see their own usage" ON public.user_usage FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own usage (for the usage tracking functions)
CREATE POLICY "Service can update usage" ON public.user_usage FOR ALL USING (true);
