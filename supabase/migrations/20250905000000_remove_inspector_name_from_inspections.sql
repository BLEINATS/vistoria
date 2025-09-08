-- This script removes the now-redundant 'inspector_name' column from the 'inspections' table.
-- This resolves the "not-null constraint" error when creating a new inspection.
-- Please execute this code in the SQL Editor of your Supabase project.

/*
# [SCHEMA UPDATE] Remove Inspector Name Column from Inspections
This script removes the 'inspector_name' column from the 'inspections' table.

## Query Description:
This operation is a structural change that deletes a column from the database. It's being done to resolve a "not-null constraint" error that occurs when creating a new inspection. The application logic was updated to derive the inspector's identity from the logged-in user, making this column obsolete. This change synchronizes the database schema with the application code.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: true
- Reversible: false (without data loss)

## Security Implications:
- RLS Status: Not applicable
- Policy Changes: No
- Auth Requirements: Not applicable
*/

ALTER TABLE public.inspections
DROP COLUMN IF EXISTS inspector_name;
