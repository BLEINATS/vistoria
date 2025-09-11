/*
# [Fix Admin Check for User Listing]
[This operation updates the security check within the `get_all_users_with_details` function to correctly identify the administrator, allowing them to view the full user list.]

## Query Description: [This operation modifies a database function. It replaces the previous, unreliable role check with a direct check against the administrator's email address. This is a safe change that only affects the function's internal logic and has no impact on existing data. It is fully reversible by redeploying the previous version of the function.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Modifies function: `public.get_all_users_with_details()`

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [The function now checks for a specific admin email.]

## Performance Impact:
- Indexes: [No change]
- Triggers: [No change]
- Estimated Impact: [None. The change is a simple condition check.]
*/

-- Drop the existing function to allow for modification
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function with the corrected admin check
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
SET search_path = public, auth
AS $$
BEGIN
    -- Check if the current user is an admin by checking their email
    IF (
        SELECT u.email FROM auth.users u WHERE u.id = auth.uid()
    ) != 'klaus@bleinat.com.br' THEN
        RAISE EXCEPTION 'Only admins can access this function';
    END IF;

    -- If the check passes, return the user data
    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email::text, -- Explicitly cast email to text to match return type
        p.company_name,
        p.company_logo_url,
        'Gratuito'::text AS plan_tier, -- Placeholder for plan
        TRUE AS is_active -- Placeholder for status
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id
    ORDER BY
        u.created_at DESC;
END;
$$;
