-- Migration to consolidate profile changes, fix functions, and set up storage.

-- Step 1: Ensure profile table has the necessary columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Step 2: Set up storage bucket for avatars/logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 3: Set up policies for the avatars bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- Step 4: Drop potentially problematic functions from previous failed migrations
DROP FUNCTION IF EXISTS public.get_properties_with_details();
DROP FUNCTION IF EXISTS public.get_property_details_by_id(uuid);
DROP FUNCTION IF EXISTS public.create_user_subscription(uuid, text, numeric, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_user_subscription(uuid, text, text, text, text, text);

-- Step 5: Recreate the database functions correctly

-- Function to get all properties with details
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
    responsible_name text,
    company_name text,
    company_logo_url text,
    inspections jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    JOIN
        profiles prof ON p.user_id = prof.id
    WHERE
        p.user_id = auth.uid()
    ORDER BY
        p.created_at DESC;
$$;

-- Function to get a single property's details
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
    responsible_name text,
    company_name text,
    company_logo_url text,
    inspections jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    JOIN
        profiles prof ON p.user_id = prof.id
    WHERE
        p.id = p_id AND p.user_id = auth.uid();
$$;

-- Function to create a user subscription
CREATE OR REPLACE FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO subscriptions (
        user_id,
        plan_name,
        price,
        asaas_subscription_id,
        asaas_customer_id,
        status,
        billing_type,
        current_period_start,
        current_period_end
    )
    VALUES (
        user_uuid,
        plan_name_param,
        price_param,
        asaas_subscription_id_param,
        asaas_customer_id_param,
        status_param::subscription_status,
        billing_type_param,
        NOW(),
        NOW() + interval '1 month'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        price = EXCLUDED.price,
        asaas_subscription_id = EXCLUDED.asaas_subscription_id,
        status = EXCLUDED.status,
        billing_type = EXCLUDED.billing_type,
        updated_at = NOW(),
        current_period_start = NOW(),
        current_period_end = NOW() + interval '1 month';
END;
$$;
