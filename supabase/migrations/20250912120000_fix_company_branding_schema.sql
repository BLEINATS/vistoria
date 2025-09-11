/*
  # [Fix] Schema Update for Company Branding
  This migration ensures the database schema is correctly updated to support company branding on reports. It fixes a dependency issue from a previous migration.

  ## Query Description:
  This operation is safe and structural. It first adds the `company_name` and `company_logo_url` columns to the `profiles` table if they don't already exist. Then, it safely drops and recreates the database functions (`get_properties_with_details` and `get_property_details_by_id`) to include these new company branding fields. This ensures data consistency and proper report generation.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (manually)

  ## Structure Details:
  - Adds `company_name` (TEXT) to `public.profiles`.
  - Adds `company_logo_url` (TEXT) to `public.profiles`.
  - Recreates function `public.get_properties_with_details()`.
  - Recreates function `public.get_property_details_by_id(uuid)`.

  ## Security Implications:
  - RLS Status: Unchanged.
  - Policy Changes: No.
  - Auth Requirements: None for this migration.

  ## Performance Impact:
  - Indexes: None.
  - Triggers: None.
  - Estimated Impact: Negligible. Recreating functions is a fast metadata operation.
*/

-- Step 1: Add company_name and company_logo_url columns to profiles if they don't exist
-- The previous migration failed, so we ensure these columns are present before proceeding.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Step 2: Drop the old functions safely to avoid conflicts
DROP FUNCTION IF EXISTS public.get_properties_with_details();
DROP FUNCTION IF EXISTS public.get_property_details_by_id(p_id uuid);

-- Step 3: Recreate get_properties_with_details with the new company fields
CREATE OR REPLACE FUNCTION public.get_properties_with_details()
RETURNS TABLE(
    id uuid,
    created_at timestamptz,
    name text,
    address text,
    type text,
    description text,
    facade_photo_url text,
    user_id uuid,
    responsible_name text,
    company_name text,
    company_logo_url text,
    inspections jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
      p.id,
      p.created_at,
      p.name,
      p.address,
      p.type,
      p.description,
      p.facade_photo_url,
      p.user_id,
      prof.full_name AS responsible_name,
      prof.company_name,
      prof.avatar_url AS company_logo_url,
      (
          SELECT jsonb_agg(jsonb_build_object(
              'id', i.id,
              'status', i.status,
              'inspection_type', i.inspection_type,
              'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id),
              'general_observations', i.general_observations,
              'created_at', i.created_at
          ))
          FROM inspections i
          WHERE i.property_id = p.id
      ) AS inspections
  FROM
      properties p
  LEFT JOIN
      profiles prof ON p.user_id = prof.id
  WHERE
      p.user_id = auth.uid()
  ORDER BY
      p.created_at DESC;
END;
$$;

-- Step 4: Recreate get_property_details_by_id with the new company fields
CREATE OR REPLACE FUNCTION public.get_property_details_by_id(p_id uuid)
RETURNS TABLE(
    id uuid,
    created_at timestamptz,
    name text,
    address text,
    type text,
    description text,
    facade_photo_url text,
    user_id uuid,
    responsible_name text,
    company_name text,
    company_logo_url text,
    inspections jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
      p.id,
      p.created_at,
      p.name,
      p.address,
      p.type,
      p.description,
      p.facade_photo_url,
      p.user_id,
      prof.full_name AS responsible_name,
      prof.company_name,
      prof.avatar_url AS company_logo_url,
      (
          SELECT jsonb_agg(jsonb_build_object(
              'id', i.id,
              'status', i.status,
              'inspection_type', i.inspection_type,
              'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id),
              'general_observations', i.general_observations,
              'created_at', i.created_at
          ))
          FROM inspections i
          WHERE i.property_id = p.id
      ) AS inspections
  FROM
      properties p
  LEFT JOIN
      profiles prof ON p.user_id = prof.id
  WHERE
      p.id = p_id AND p.user_id = auth.uid();
END;
$$;
