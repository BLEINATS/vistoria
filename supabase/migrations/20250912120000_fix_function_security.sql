/*
# [SECURITY] Set Search Path for create_user_subscription Function
[This operation enhances the security of the `create_user_subscription` function by explicitly setting its search path. This prevents potential "search path hijacking" attacks, where a malicious user could trick the function into executing unintended code.]

## Query Description: [This operation modifies the definition of an existing database function. It is a non-destructive change and does not affect any stored data. It is a standard security best practice.]

## Metadata:
- Schema-Category: ["Security", "Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Function: `public.create_user_subscription`

## Security Implications:
- RLS Status: [Not Applicable]
- Policy Changes: [No]
- Auth Requirements: [Admin privileges to alter functions]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible. This is a metadata change.]
*/

-- Apply security setting to the create_user_subscription function
ALTER FUNCTION public.create_user_subscription(user_uuid uuid, plan_name_param text, price_param numeric, asaas_subscription_id_param text, asaas_customer_id_param text, status_param text, billing_type_param text) SET search_path = public;
