/*
# [Subscription Logic & Security]
This migration adds the core database procedure for creating subscriptions and enforces Row Level Security (RLS) to protect user data.

## Query Description:
1.  **`create_user_subscription` Function**: This procedure is called by the `create-subscription` Edge Function. It safely inserts a new subscription record into the `subscriptions` table. Using `SECURITY DEFINER` ensures it runs with elevated privileges, so individual users don't need direct insert permissions, which is a security best practice.
2.  **RLS for `subscriptions`**: This enables Row Level Security on the `subscriptions` table and adds a policy ensuring that users can only read their own subscription data. This prevents one user from seeing another user's subscription details.
3.  **RLS for `subscription_plans`**: This enables RLS on the `subscription_plans` table and adds a policy that allows any authenticated user to read all available plans. This is necessary for the subscription page to display the plans to users.

## Metadata:
- Schema-Category: ["Structural", "Security"]
- Impact-Level: ["Medium"]
- Requires-Backup: false
- Reversible: true (Policies and functions can be dropped)

## Structure Details:
- **Functions Created**: `public.create_user_subscription`
- **Tables Affected**: `public.subscriptions`, `public.subscription_plans`
- **Policies Created**:
  - "Allow users to view their own subscriptions" on `public.subscriptions`
  - "Allow authenticated users to view all plans" on `public.subscription_plans`

## Security Implications:
- RLS Status: Enabled on `subscriptions` and `subscription_plans`.
- Policy Changes: Yes. New policies are added to enforce data privacy and access control.
- Auth Requirements: Policies rely on `auth.uid()` to identify the current user.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: Low. RLS policies on `user_id` are highly performant if `user_id` is indexed.
*/

-- 1. Create the RPC function to insert a new subscription
-- This function is called by the 'create-subscription' Edge Function.
-- It runs with the privileges of the user who defines it, which is safer.
CREATE OR REPLACE FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        plan_name,
        price,
        asaas_subscription_id,
        asaas_customer_id,
        status,
        billing_type,
        updated_at
    )
    VALUES (
        user_uuid,
        plan_name_param,
        price_param,
        asaas_subscription_id_param,
        asaas_customer_id_param,
        status_param,
        billing_type_param,
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Secure the subscriptions table with Row Level Security (RLS)
-- Enable RLS on the table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create it
DROP POLICY IF EXISTS "Allow users to view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Allow users to view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Secure the subscription_plans table with RLS
-- Enable RLS on the table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create it
DROP POLICY IF EXISTS "Allow authenticated users to view all plans" ON public.subscription_plans;
CREATE POLICY "Allow authenticated users to view all plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);
