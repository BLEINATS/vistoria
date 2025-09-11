/*
# [Operation Name] Secure Create User Subscription Function
[Description of what this operation does] This script secures the `create_user_subscription` function by setting a fixed `search_path`. This mitigates a security warning and prevents potential search path hijacking attacks.

## Query Description: [This operation modifies a database function to enhance security. It does not alter any user data and is considered safe to apply. It ensures that the function operates within a controlled and predictable environment.]

## Metadata:
- Schema-Category: ["Security", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Function being affected: `public.create_user_subscription`

## Security Implications:
- RLS Status: [Not Applicable]
- Policy Changes: [No]
- Auth Requirements: [None]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible performance impact. This is a security-hardening change.]
*/

ALTER FUNCTION public.create_user_subscription(user_uuid uuid, plan_name_param text, price_param numeric, asaas_subscription_id_param text, asaas_customer_id_param text, status_param text, billing_type_param text)
SET search_path = public;
