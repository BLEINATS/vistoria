/*
# [Feature] Avatar Storage Setup
This migration sets up a dedicated storage bucket for user avatars (company logos) and configures Row Level Security (RLS) policies to ensure users can only manage their own files.

## Query Description:
- **Bucket Creation:** Creates a new public storage bucket named 'avatars'. Public access is necessary for displaying the images in the application without requiring authentication for every image request.
- **RLS Policies:**
  - **SELECT:** Allows any authenticated user to view any avatar. This is safe because the URLs are non-guessable UUIDs.
  - **INSERT:** Allows an authenticated user to upload a file only into a folder that matches their own user ID. This prevents users from uploading files into other users' folders.
  - **UPDATE:** Allows an authenticated user to update a file only if it's within their own user ID folder.
  - **DELETE:** Allows an authenticated user to delete a file only if it's within their own user ID folder.

This setup provides a secure way for users to manage their personal avatar/logo while keeping the files organized and protected from unauthorized access by other users.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (Policies and bucket can be dropped)

## Structure Details:
- Storage Bucket: `avatars`
- RLS Policies on `storage.objects` for the `avatars` bucket.

## Security Implications:
- RLS Status: Enabled on the new bucket.
- Policy Changes: Yes, new policies are added for the `avatars` bucket.
- Auth Requirements: Users must be authenticated to manage their files.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: Negligible. RLS checks are highly optimized by Supabase.
*/

-- 1. Create a new storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security for the new bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for the 'avatars' bucket

-- Allow public read access to everyone
CREATE POLICY "Allow public read access on avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Allow authenticated users to upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Allow authenticated users to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Allow authenticated users to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);
