/*
# [SECURITY] Secure All Database Functions
This migration secures all user-defined functions by setting a fixed `search_path`. This resolves the "Function Search Path Mutable" security advisory by preventing potential hijacking of function execution by malicious actors who might have permissions to create objects in other schemas.

## Query Description:
This operation modifies the configuration of existing database functions. It does not alter the logic or data. It is a safe and recommended security enhancement.

## Metadata:
- Schema-Category: "Security"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by removing the search_path setting)

## Structure Details:
- Modifies function: `public.get_properties_with_details()`
- Modifies function: `public.get_property_details_by_id(uuid)`
- Modifies function: `public.create_user_subscription(...)`
- Modifies function: `public.handle_new_user()`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: None

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. May slightly improve performance by removing ambiguity in object resolution.
*/

-- Secure the get_properties_with_details function
ALTER FUNCTION public.get_properties_with_details()
SET search_path = public;

-- Secure the get_property_details_by_id function
ALTER FUNCTION public.get_property_details_by_id(p_id uuid)
SET search_path = public;

-- Secure the handle_new_user function
ALTER FUNCTION public.handle_new_user()
SET search_path = public;

-- Secure the create_user_subscription function
-- The signature must match exactly what's in the database.
ALTER FUNCTION public.create_user_subscription(uuid, text, numeric, text, text, text, text)
SET search_path = public;
