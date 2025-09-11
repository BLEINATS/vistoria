/*
# [SECURITY] Secure Database Functions
This migration enhances the security of existing database functions by setting a fixed, secure `search_path`. This mitigates the risk of "search path" attacks, where a malicious user could potentially create objects in a public schema to intercept function calls.

## Query Description:
- This operation modifies the configuration of existing functions (`get_properties_with_details`, `get_property_details_by_id`, `create_user_subscription`).
- It does NOT alter the logic or data returned by these functions.
- The change is safe and improves the security posture of the application.

## Metadata:
- Schema-Category: "Security"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by removing the SET search_path clause)

## Structure Details:
- Functions affected:
  - public.get_properties_with_details()
  - public.get_property_details_by_id(p_id uuid)
  - public.create_user_subscription(...)

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: Unchanged
- Mitigates: Search path hijacking vulnerabilities.

## Performance Impact:
- Indexes: Unchanged
- Triggers: Unchanged
- Estimated Impact: Negligible. May slightly improve performance by providing a more direct path for object resolution.
*/

-- Secure function: get_properties_with_details
ALTER FUNCTION public.get_properties_with_details()
SET search_path = public, extensions;

-- Secure function: get_property_details_by_id
ALTER FUNCTION public.get_property_details_by_id(p_id uuid)
SET search_path = public, extensions;

-- Secure function: create_user_subscription
ALTER FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
SET search_path = public, extensions;
