/*
          # [SECURITY] Set Search Path for All Public Functions
          This script dynamically finds all user-created functions in the 'public' schema and sets a secure 'search_path' for them. This mitigates the "Function Search Path Mutable" security warning by preventing potential highjacking attacks where a malicious user could create objects (like tables or functions) in a temporary schema that get executed with the privileges of the function owner.

          ## Query Description:
          - This operation is safe and does not alter data.
          - It iterates through all functions in the 'public' schema.
          - For each function, it applies `ALTER FUNCTION ... SET search_path`, which is a standard security best practice.
          - This change is reversible but not recommended to be reverted.
          
          ## Metadata:
          - Schema-Category: ["Security", "Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Affects all functions within the 'public' schema.
          
          ## Security Implications:
          - RLS Status: Not applicable
          - Policy Changes: No
          - Auth Requirements: Requires admin privileges to run.
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: None
          - Estimated Impact: Negligible. This is a metadata change on function definitions.
          */
DO $$
DECLARE
    function_signature TEXT;
BEGIN
    FOR function_signature IN
        SELECT p.oid::regprocedure::text
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f' -- 'f' for normal functions
    LOOP
        EXECUTE 'ALTER FUNCTION ' || function_signature || ' SET search_path = "$user", public;';
        RAISE NOTICE 'Set search_path for function: %', function_signature;
    END LOOP;
END;
$$;
