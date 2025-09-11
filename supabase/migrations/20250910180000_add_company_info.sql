/*
# [Feature] Add Company Information to Profiles and Reports
This migration adds a 'company_name' field to user profiles and updates database functions to include company information (name and logo) in data queries. This enables personalization of reports with the user's company branding.

## Query Description:
- **ALTER TABLE**: Adds a new `company_name` column to the `public.profiles` table. This is a non-destructive operation.
- **CREATE OR REPLACE FUNCTION (get_properties_with_details)**: Modifies an existing function to include `company_name` and `avatar_url` from the `profiles` table in its results. This allows the application to fetch all necessary branding information in a single query.
- **CREATE OR REPLACE FUNCTION (get_property_details_by_id)**: Similar to the above, this function is updated to include company branding information when fetching details for a single property.

These changes are designed to be safe and will not affect existing data.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (The column can be dropped and functions reverted, but this is not recommended if the application depends on them.)

## Structure Details:
- **Table Modified**: `public.profiles` (new column `company_name` added).
- **Functions Modified**: `public.get_properties_with_details`, `public.get_property_details_by_id`.

## Security Implications:
- RLS Status: Unchanged. Existing policies are respected.
- Policy Changes: No.
- Auth Requirements: Functions continue to use `auth.uid()` to ensure users can only access their own data.

## Performance Impact:
- Indexes: None added or removed.
- Triggers: None added or removed.
- Estimated Impact: Negligible. The changes add a few columns to the select list from an existing join.
*/

-- Add company_name to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update get_properties_with_details function
-- This function is used to get all properties for the logged-in user, with inspection summaries.
-- We are adding company_name and avatar_url to the returned data.
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
                'created_at', i.created_at,
                'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id)
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

-- Update get_property_details_by_id function
-- This function gets details for a single property.
-- We are adding company_name and avatar_url to the returned data.
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
                'created_at', i.created_at,
                'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id)
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
