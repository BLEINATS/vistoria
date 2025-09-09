-- Script para criar as tabelas básicas do VistorIA
-- Execute este script PRIMEIRO no SQL Editor do Supabase

-- Criar tabela de propriedades
CREATE TABLE IF NOT EXISTS public.properties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    type text NOT NULL,
    description text,
    facade_photo_url text
);

-- Criar tabela de inspeções
CREATE TABLE IF NOT EXISTS public.inspections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    inspection_date timestamp with time zone NOT NULL,
    summary text,
    status text NOT NULL DEFAULT 'pending',
    inspection_type text NOT NULL,
    general_observations text
);

-- Criar tabela de fotos das inspeções
CREATE TABLE IF NOT EXISTS public.inspection_photos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    inspection_id uuid REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
    photo_url text NOT NULL,
    room text NOT NULL,
    ai_analysis_result jsonb
);

-- Adicionar comentários
COMMENT ON TABLE public.properties IS 'Tabela para armazenar informações das propriedades';
COMMENT ON TABLE public.inspections IS 'Tabela para armazenar inspeções realizadas';
COMMENT ON TABLE public.inspection_photos IS 'Tabela para armazenar fotos das inspeções';