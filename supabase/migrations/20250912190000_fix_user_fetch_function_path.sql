/*
          # [Operation Name]
          Fix User Fetching Function Search Path

          ## Query Description: [This operation updates the 'get_all_users_with_details' function to include the 'auth' schema in its search path. This is a critical fix to resolve an error where the function could not access authentication details, preventing the admin user list from loading. This change is safe and does not affect user data.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Modifies the function: public.get_all_users_with_details()
          
          ## Security Implications:
          - RLS Status: [N/A]
          - Policy Changes: [No]
          - Auth Requirements: [Function requires admin privileges]
          
          ## Performance Impact:
          - Indexes: [N/A]
          - Triggers: [N/A]
          - Estimated Impact: [None]
          */
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    company_name TEXT,
    company_logo_url TEXT,
    plan_tier TEXT,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if the user is an admin
    IF (
        SELECT raw_app_meta_data->>'is_admin'
        FROM auth.users
        WHERE auth.users.id = auth.uid()
    )::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'Only admins can access this function';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email,
        p.company_name,
        p.company_logo_url,
        'Gratuito'::TEXT AS plan_tier, -- Placeholder for plan
        TRUE AS is_active -- Placeholder for status
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_with_details() TO authenticated;
