/*
# [Function] Create User Subscription Procedure
This script creates or replaces the database function `create_user_subscription`, which is essential for the payment system to work. This function is called by the backend (Edge Function) to record a new user subscription in the database after it has been created with the payment provider (Asaas).

## Query Description:
This operation is safe and does not affect existing data. It only adds a new function to the database schema. If the function already exists, it will be replaced with this corrected version, ensuring the application's payment flow can complete successfully.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (the function can be dropped)

## Structure Details:
- Creates a new PL/pgSQL function named `public.create_user_subscription`.
- The function accepts parameters for user ID, plan details, and payment provider IDs.
- It inserts a new record into the `public.subscriptions` table.

## Security Implications:
- RLS Status: Not applicable to functions directly, but this function will respect RLS on the `subscriptions` table if called by a user role.
- Policy Changes: No
- Auth Requirements: The function is set with `SECURITY DEFINER`, meaning it runs with the privileges of the function owner. This is necessary to allow the Edge Function (running as `authenticated` user) to insert into the `subscriptions` table. The `search_path` is explicitly set to `public` to prevent security vulnerabilities.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. This is a simple insert operation.
*/

CREATE OR REPLACE FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY DEFINER is required to allow the function to insert into the subscriptions table
-- when called by an authenticated user from an Edge Function.
SECURITY DEFINER
-- Set a secure search_path to prevent hijacking.
SET search_path = public
AS $$
BEGIN
    -- This function inserts a new subscription record for a user.
    -- It's designed to be called from a trusted server-side environment (like an Edge Function)
    -- after a subscription is successfully created in the payment provider (Asaas).
    INSERT INTO public.subscriptions (
        user_id,
        plan_name,
        price,
        asaas_subscription_id,
        asaas_customer_id,
        status,
        billing_type
    )
    VALUES (
        user_uuid,
        plan_name_param,
        price_param,
        asaas_subscription_id_param,
        asaas_customer_id_param,
        status_param,
        billing_type_param
    );
END;
$$;
