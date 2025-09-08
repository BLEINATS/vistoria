-- This script replaces the properties_with_details view with RPC functions
-- to prevent browser caching and solve the stale data issue.
-- Please execute this code in the SQL Editor of your Supabase project.

/*
# [REFACTOR] Replace View with RPC Functions
This script refactors the data access layer by replacing the `properties_with_details` VIEW with two dedicated RPC (Remote Procedure Call) functions.
## Query Description:
This is a critical architectural improvement to solve a persistent stale data issue caused by browser caching of VIEW results.
1. `DROP VIEW`: The existing `properties_with_details` view is removed.
2. `CREATE FUNCTION get_properties_with_details`: This function returns a list of all properties for the currently authenticated user, along with aggregated inspection data and the owner's name. As an RPC, it's called via POST requests, which are not cached by browsers.
3. `CREATE FUNCTION get_property_details_by_id`: This function returns the complete details for a single property, ensuring data is always fresh when viewing a specific property.
This change guarantees that the UI always displays the most up-to-date information.
## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true (by recreating the view)
## Security Implications:
- RLS Status: The new functions use `auth.uid()` internally, respecting and enforcing Row Level Security.
- Policy Changes: No
- Auth Requirements: All data access through these functions requires an authenticated user.
*/

-- Step 1: Drop the existing view
DROP VIEW IF EXISTS public.properties_with_details;

-- Step 2: Create a function to get all properties for the current user
CREATE OR REPLACE FUNCTION public.get_properties_with_details()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  name text,
  address text,
  type text,
  description text,
  facade_photo_url text,
  user_id uuid,
  inspections json,
  responsible_name text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.created_at,
    p.name,
    p.address,
    p.type,
    p.description,
    p.facade_photo_url,
    p.user_id,
    (
      SELECT json_agg(inspection_details)
      FROM (
        SELECT
          i.id,
          i.status,
          i.inspection_type,
          i.created_at,
          (SELECT count(*) FROM public.inspection_photos ip WHERE ip.inspection_id = i.id) AS "photoCount"
        FROM public.inspections i
        WHERE i.property_id = p.id
      ) AS inspection_details
    ) AS inspections,
    prof.full_name AS responsible_name
  FROM
    public.properties p
  LEFT JOIN public.profiles prof ON p.user_id = prof.id
  WHERE
    p.user_id = auth.uid()
  ORDER BY
    p.created_at DESC;
$$;

-- Step 3: Create a function to get a single property by its ID
CREATE OR REPLACE FUNCTION public.get_property_details_by_id(p_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  name text,
  address text,
  type text,
  description text,
  facade_photo_url text,
  user_id uuid,
  inspections json,
  responsible_name text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.created_at,
    p.name,
    p.address,
    p.type,
    p.description,
    p.facade_photo_url,
    p.user_id,
    (
      SELECT json_agg(inspection_details)
      FROM (
        SELECT
          i.id,
          i.status,
          i.inspection_type,
          i.created_at,
          (SELECT count(*) FROM public.inspection_photos ip WHERE ip.inspection_id = i.id) AS "photoCount"
        FROM public.inspections i
        WHERE i.property_id = p.id
      ) AS inspection_details
    ) AS inspections,
    prof.full_name AS responsible_name
  FROM
    public.properties p
  LEFT JOIN public.profiles prof ON p.user_id = prof.id
  WHERE
    p.id = p_id AND p.user_id = auth.uid();
$$;
