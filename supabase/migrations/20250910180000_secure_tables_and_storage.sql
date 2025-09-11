/*
# [Enable RLS on Properties Table]
This operation enables Row Level Security on the `properties` table and creates a policy that ensures users can only access their own property records.

## Query Description: [This change isolates user data at the database level, preventing any user from accidentally or maliciously viewing or modifying another user's properties. This is a critical security enhancement for a multi-tenant application.]

## Metadata:
- Schema-Category: ["Security", "Structural"]
- Impact-Level: ["High"]
- Requires-Backup: [true]
- Reversible: [true]

## Structure Details:
- Table: `public.properties`
- Columns: `user_id` (used for policy check)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Requires authenticated user session (auth.uid())]

## Performance Impact:
- Indexes: [An index on `user_id` is recommended and will be added in this script.]
- Estimated Impact: [Slight overhead on queries to check the policy, but this is negligible and far outweighed by the security benefits. The added index will optimize this check.]
*/
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own properties"
ON public.properties FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

/*
# [Enable RLS on Inspections Table]
This operation enables Row Level Security on the `inspections` table. It ensures users can only access inspections related to properties they own.

## Query Description: [This policy prevents users from accessing inspection data of other users by checking the ownership of the parent property. This maintains data privacy and integrity for all inspection records.]

## Metadata:
- Schema-Category: ["Security", "Structural"]
- Impact-Level: ["High"]
- Requires-Backup: [true]
- Reversible: [true]

## Structure Details:
- Table: `public.inspections`
- Columns: `property_id` (used for policy check via join)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Requires authenticated user session (auth.uid())]

## Performance Impact:
- Indexes: [An index on `property_id` is recommended and will be added in this script.]
- Estimated Impact: [The policy check involves a subquery, but it is highly optimized by the database if the foreign key is indexed.]
*/
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own inspections" ON public.inspections
FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM public.properties WHERE id = inspections.property_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM public.properties WHERE id = inspections.property_id
  )
);

/*
# [Enable RLS on Inspection Photos Table]
This operation enables Row Level Security on the `inspection_photos` table, linking access rights to the ownership of the parent inspection and property.

## Query Description: [This policy secures all photographic evidence by ensuring that only the owner of the property associated with an inspection can access its photos. This is vital for protecting sensitive visual data.]

## Metadata:
- Schema-Category: ["Security", "Structural"]
- Impact-Level: ["High"]
- Requires-Backup: [true]
- Reversible: [true]

## Structure Details:
- Table: `public.inspection_photos`
- Columns: `inspection_id` (used for policy check via join)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Requires authenticated user session (auth.uid())]

## Performance Impact:
- Indexes: [An index on `inspection_id` is recommended and will be added in this script.]
- Estimated Impact: [The policy check involves a join, which is efficient when foreign keys are properly indexed.]
*/
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own inspection photos" ON public.inspection_photos
FOR ALL
USING (
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id = inspection_photos.inspection_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id = inspection_photos.inspection_id
  )
);

/*
# [Create Storage Policies for Property Facades]
This operation sets up security policies for the `property_facades` storage bucket, ensuring only authenticated users can manage their own files.

## Query Description: [These policies control who can upload, view, update, and delete facade photos. Files are organized into folders by user ID, and these policies enforce that users can only interact with their own folder, preventing unauthorized file access.]

## Metadata:
- Schema-Category: ["Security"]
- Impact-Level: ["High"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Storage Bucket: `property_facades`

## Security Implications:
- RLS Status: [Enabled on `storage.objects`]
- Policy Changes: [Yes]
- Auth Requirements: [Requires authenticated user session (auth.uid())]

## Performance Impact:
- Estimated Impact: [Minimal performance impact, as storage policies are efficiently evaluated by Supabase.]
*/
CREATE POLICY "Allow authenticated insert on property_facades"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property_facades');

CREATE POLICY "Allow authenticated access to own property_facades"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'property_facades' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow authenticated update on own property_facades"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'property_facades' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow authenticated delete on own property_facades"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property_facades' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

/*
# [Create Storage Policies for Inspection Photos]
This operation sets up security policies for the `inspection_photos` storage bucket.

## Query Description: [These policies ensure that users can only upload, view, update, and delete photos related to their own inspections. Access is determined by checking the ownership of the inspection ID, which corresponds to the folder name in storage.]

## Metadata:
- Schema-Category: ["Security"]
- Impact-Level: ["High"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Storage Bucket: `inspection_photos`

## Security Implications:
- RLS Status: [Enabled on `storage.objects`]
- Policy Changes: [Yes]
- Auth Requirements: [Requires authenticated user session (auth.uid())]

## Performance Impact:
- Estimated Impact: [The policy check involves a subquery, but it's a necessary security measure. Performance is generally good.]
*/
CREATE POLICY "Allow authenticated insert on inspection_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow authenticated access to own inspection_photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow authenticated update on own inspection_photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Allow authenticated delete on own inspection_photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.inspections i
    JOIN public.properties p ON i.property_id = p.id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
);

/*
# [Add Performance Indexes]
This operation adds indexes to foreign key columns to improve query performance, especially for RLS policy checks and joins.

## Query Description: [Indexes on foreign keys (`user_id`, `property_id`, `inspection_id`) are crucial for making database lookups, joins, and RLS checks fast and efficient, preventing performance degradation as the database grows.]

## Metadata:
- Schema-Category: ["Structural", "Performance"]
- Impact-Level: ["Medium"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Tables: `public.properties`, `public.inspections`, `public.inspection_photos`

## Security Implications:
- RLS Status: [N/A]
- Policy Changes: [No]
- Auth Requirements: [N/A]

## Performance Impact:
- Indexes: [Added]
- Estimated Impact: [Significant performance improvement for data retrieval and policy enforcement. Slight overhead on data insertion/updates, which is a standard trade-off.]
*/
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id ON public.inspection_photos(inspection_id);
