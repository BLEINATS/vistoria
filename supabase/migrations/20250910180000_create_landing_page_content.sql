/*
# [Structural] Create Landing Page Content Management System
This migration sets up the necessary database tables and storage policies to allow dynamic management of landing page images directly from the application.

## Query Description: [This operation creates a new table `landing_page_settings` to store image URLs and configures a new public storage bucket `public_assets`. It enables Row Level Security to ensure that only authenticated users can modify the content, while allowing public read access for the landing page.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true] (Dropping the table and policies)

## Structure Details:
- Tables Created: `public.landing_page_settings`
- Storage Buckets Created: `storage.buckets.public_assets`
- Policies Created: RLS policies for `landing_page_settings` and `storage.objects`.

## Security Implications:
- RLS Status: [Enabled] on `landing_page_settings`.
- Policy Changes: [Yes] - New policies are added.
- Auth Requirements: [Authenticated] role is required for modifications.

## Performance Impact:
- Indexes: [Added] - Primary key on `landing_page_settings`.
- Triggers: [None]
- Estimated Impact: [Low] - The table is small and queries will be fast.
*/

-- 1. Create table to store landing page settings
CREATE TABLE IF NOT EXISTS public.landing_page_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
DROP POLICY IF EXISTS "Allow public read-only access" ON public.landing_page_settings;
CREATE POLICY "Allow public read-only access"
  ON public.landing_page_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to upsert" ON public.landing_page_settings;
CREATE POLICY "Allow authenticated users to upsert"
  ON public.landing_page_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Create a public bucket for landing page assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public_assets', 'public_assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 5. Create RLS policies for the new bucket
DROP POLICY IF EXISTS "Public assets are publicly viewable" ON storage.objects;
CREATE POLICY "Public assets are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public_assets');

DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public_assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update their own assets" ON storage.objects;
CREATE POLICY "Authenticated users can update their own assets"
  ON storage.objects FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (bucket_id = 'public_assets');

-- 6. Insert default placeholder values
INSERT INTO public.landing_page_settings (key, value, description)
VALUES
  ('hero_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/1200x750/f3f4f6/4a5568?text=Dashboard+Principal+do+VistorIA', 'Imagem principal na seção Hero'),
  ('feature_analysis_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/800x450/e2e8f0/4a5568?text=Análise+de+Foto+com+IA', 'Imagem para a funcionalidade "Análise Inteligente"'),
  ('feature_comparison_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/e2e8f0/4a5568?text=Comparativo+Lado+a+Lado', 'Imagem para a funcionalidade "Relatórios Comparativos"'),
  ('feature_pdf_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x500/e2e8f0/4a5568?text=Relatório+PDF', 'Imagem para a funcionalidade "PDFs Profissionais"'),
  ('feature_issues_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/800x450/e2e8f0/4a5568?text=Detecção+de+Problemas', 'Imagem para a funcionalidade "Detecção de Problemas"'),
  ('how_it_works_step1_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Upload+de+Foto', 'Imagem para o passo 1 "Fotografe"'),
  ('how_it_works_step2_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Validação+da+Análise', 'Imagem para o passo 2 "Valide"'),
  ('how_it_works_step3_image', 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/e2e8f0/4a5568?text=Geração+de+Relatório', 'Imagem para o passo 3 "Gere"')
ON CONFLICT (key) DO NOTHING;
