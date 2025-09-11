/*
# [Operation Name]
Fix User Fetching Function Security

[Description of what this operation does]
This operation corrects the `get_all_users_with_details` function by updating its `search_path` to include the `auth` schema. This is necessary for the function to find and use authentication helpers like `auth.jwt()`, which are required to verify if the calling user has administrative privileges. This change fixes the "function does not exist" error.

## Query Description: [This operation will replace the existing `get_all_users_with_details` function. It is a safe, non-destructive change that only affects how user data is queried by administrators. No user data will be altered or lost.]
          
## Metadata:
- Schema-Category: ["Safe", "Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]
          
## Structure Details:
[Affects the function `public.get_all_users_with_details`]
          
## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [Admin user]
          
## Performance Impact:
- Indexes: [Not Affected]
- Triggers: [Not Affected]
- Estimated Impact: [Low, no significant performance change is expected.]
*/
DROP FUNCTION IF EXISTS public.get_all_users_with_details();
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
    id uuid,
    full_name text,
    email text,
    company_name text,
    company_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Correctly set the search path to include 'auth'
SET search_path = public, auth, extensions
AS $$
BEGIN
    -- Check if the user has the 'admin' role from JWT claims
    -- This requires the 'auth' schema to be in the search_path
    IF (auth.jwt()->>'role') != 'admin' THEN
        RAISE EXCEPTION 'Only admins can access this function';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email,
        p.company_name,
        p.company_logo_url
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id;
END;
$$;
