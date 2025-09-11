/*
# [Fix and Idempotent RLS Policies]
This migration script corrects an issue where RLS policies might already exist, causing migration failures. It safely drops and recreates the policies to ensure the database is in a consistent state and uses unique names for storage policies.

## Query Description:
This operation will first remove existing security policies on the `properties`, `inspections`, `inspection_photos` tables and on the `property_facades` and `inspection_photos` storage buckets. It then recreates them with the correct definitions. This ensures that the security rules are applied correctly and prevents errors from duplicate policies. There is no risk to existing data, but it standardizes access control.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (by dropping the new policies)

## Structure Details:
- Affects RLS policies on tables: `properties`, `inspections`, `inspection_photos`
- Affects storage policies on buckets: `property_facades`, `inspection_photos`

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes (recreates existing policies to be idempotent)
- Auth Requirements: Policies are based on `auth.uid()`

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

-- Enable RLS on tables if not already enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- == Policies for 'properties' table ==
DROP POLICY IF EXISTS "Allow full access to own properties" ON public.properties;
CREATE POLICY "Allow full access to own properties"
ON public.properties
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- == Policies for 'inspections' table ==
DROP POLICY IF EXISTS "Allow full access based on property ownership" ON public.inspections;
CREATE POLICY "Allow full access based on property ownership"
ON public.inspections
FOR ALL
USING (
  (SELECT user_id FROM public.properties WHERE id = inspections.property_id) = auth.uid()
)
WITH CHECK (
  (SELECT user_id FROM public.properties WHERE id = inspections.property_id) = auth.uid()
);

-- == Policies for 'inspection_photos' table ==
DROP POLICY IF EXISTS "Allow full access based on inspection ownership" ON public.inspection_photos;
CREATE POLICY "Allow full access based on inspection ownership"
ON public.inspection_photos
FOR ALL
USING (
  (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id = inspection_photos.inspection_id
  ) = auth.uid()
)
WITH CHECK (
  (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id = inspection_photos.inspection_id
  ) = auth.uid()
);

-- == Policies for 'property_facades' bucket ==
-- Drop old, possibly non-unique policies first to clean up
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON storage.objects;

-- Drop new, unique policies if they exist from a previous failed run
DROP POLICY IF EXISTS "Allow facade insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow facade read for authenticated users" ON storage.objects;

-- Recreate with unique names
CREATE POLICY "Allow facade insert for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property_facades');

CREATE POLICY "Allow facade read for authenticated users"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'property_facades');


-- == Policies for 'inspection_photos' bucket ==
-- Drop new, unique policies if they exist from a previous failed run
DROP POLICY IF EXISTS "Allow inspection photo insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow inspection photo read for authenticated users" ON storage.objects;

-- Recreate with unique names
CREATE POLICY "Allow inspection photo insert for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection_photos');

CREATE POLICY "Allow inspection photo read for authenticated users"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'inspection_photos');

-- == Add Indexes for Performance ==
-- Drop indexes if they exist to prevent errors, then recreate them.
DROP INDEX IF EXISTS idx_properties_user_id;
CREATE INDEX idx_properties_user_id ON public.properties(user_id);

DROP INDEX IF EXISTS idx_inspections_property_id;
CREATE INDEX idx_inspections_property_id ON public.inspections(property_id);

DROP INDEX IF EXISTS idx_inspection_photos_inspection_id;
CREATE INDEX idx_inspection_photos_inspection_id ON public.inspection_photos(inspection_id);
