-- This migration script sets up the database for user authentication.
-- It creates a profiles table, links properties to users, and enables Row Level Security.
-- Please execute this code in the SQL Editor of your Supabase project.

/*
# [AUTH SETUP] Initial Schema for User Authentication
This script prepares the database for a full user authentication system.
## Query Description:
This is a major structural and security update. It performs the following actions:
1.  Adds a 'user_id' column to the 'properties' table to associate each property with its owner.
2.  Creates a 'profiles' table to store public user data (like full name).
3.  Sets up a trigger ('on_auth_user_created') to automatically create a profile when a new user signs up.
4.  Enables and configures Row Level Security (RLS) on all tables. This is a critical security enhancement that makes all data private by default. From now on, users will only be able to see and manage their own data.
## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: true
- Reversible: false (without significant manual work)
## Security Implications:
- RLS Status: Enabled on all tables.
- Policy Changes: Yes. Replaces permissive policies with strict, ownership-based policies.
- Auth Requirements: All data operations will now require an authenticated user session.
*/

-- 1. Add user_id to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  avatar_url text
);
COMMENT ON TABLE public.profiles IS 'Public profile information for each user.';

-- 3. Set up a trigger to create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Enable RLS and create security policies
-- Profiles Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own profile." ON public.profiles;
CREATE POLICY "Users can see their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Properties Table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own properties." ON public.properties;
CREATE POLICY "Users can manage their own properties." ON public.properties FOR ALL
USING (auth.uid() = user_id);

-- Inspections Table
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage inspections for their own properties." ON public.inspections;
CREATE POLICY "Users can manage inspections for their own properties." ON public.inspections FOR ALL
USING (auth.uid() = (SELECT user_id FROM public.properties WHERE id = inspections.property_id));

-- Inspection Photos Table
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage photos for their own inspections." ON public.inspection_photos;
CREATE POLICY "Users can manage photos for their own inspections." ON public.inspection_photos FOR ALL
USING (
  auth.uid() = (
    SELECT p.user_id
    FROM public.properties p
    JOIN public.inspections i ON p.id = i.property_id
    WHERE i.id = inspection_photos.inspection_id
  )
);

-- Storage Policies
-- property_facades bucket
DROP POLICY IF EXISTS "Users can manage their own property facades." ON storage.objects;
CREATE POLICY "Users can manage their own property facades." ON storage.objects FOR ALL
USING (bucket_id = 'property_facades' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'property_facades' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- inspection_photos bucket
DROP POLICY IF EXISTS "Users can manage their own inspection photos." ON storage.objects;
CREATE POLICY "Users can manage their own inspection photos." ON storage.objects FOR ALL
USING (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.properties p
    JOIN public.inspections i ON p.id = i.property_id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'inspection_photos' AND
  auth.uid() = (
    SELECT p.user_id
    FROM public.properties p
    JOIN public.inspections i ON p.id = i.property_id
    WHERE i.id::text = (storage.foldername(name))[1]
  )
);
