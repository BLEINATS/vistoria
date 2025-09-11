/*
# [Operation Name]
Recreate get_all_users_with_details function

## Query Description: [This operation first drops the existing 'get_all_users_with_details' function and then recreates it. This is necessary because the function's return structure was changed. The new function removes the dependency on the non-existent 'subscriptions' table and returns a hardcoded 'Gratuito' (Free) plan for all users. This will fix the error and allow the user management page to load correctly.]

## Metadata:
- Schema-Category: ["Dangerous"]
- Impact-Level: ["Medium"]
- Requires-Backup: [false]
- Reversible: [false]

## Structure Details:
- Drops function: public.get_all_users_with_details()
- Creates function: public.get_all_users_with_details()

## Security Implications:
- RLS Status: [N/A]
- Policy Changes: [No]
- Auth Requirements: [Requires 'service_role' privileges to execute]

## Performance Impact:
- Indexes: [N/A]
- Triggers: [N/A]
- Estimated Impact: [Low, temporary function drop might affect concurrent calls, but it's unlikely for this admin function.]
*/

-- Drop the existing function first to allow changing the return type
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function without the dependency on the 'subscriptions' table
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
    id uuid,
    full_name text,
    email text,
    company_name text,
    company_logo_url text,
    plan_tier text,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set a secure search path
    SET search_path = public, auth;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email,
        p.company_name,
        p.company_logo_url,
        'Gratuito'::text as plan_tier, -- Hardcoded to 'Gratuito' as subscriptions table does not exist
        (u.last_sign_in_at IS NOT NULL) as is_active
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id;
END;
$$;
