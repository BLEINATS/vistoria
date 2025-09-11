/*
          # [Fix Function Return Type]
          Corrige o erro de tipo de retorno ao tentar alterar as funções `get_properties_with_details` e `get_property_details_by_id`. O script primeiro remove as funções existentes e depois as recria com a estrutura correta, incluindo os novos campos para informações da empresa.

          ## Query Description: ["Esta operação remove e recria duas funções do banco de dados para adicionar novos campos. É uma operação segura e não afeta os dados existentes, mas é crucial para que as novas funcionalidades de personalização de relatórios funcionem corretamente."]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Funções Removidas: `get_properties_with_details`, `get_property_details_by_id`
          - Funções Criadas: `get_properties_with_details`, `get_property_details_by_id` (com novos campos de retorno)
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [Nenhum]
          
          ## Performance Impact:
          - Indexes: [No]
          - Triggers: [No]
          - Estimated Impact: [Nenhum impacto de performance esperado.]
          */

-- Drop the old functions first to avoid return type conflict
DROP FUNCTION IF EXISTS public.get_properties_with_details();
DROP FUNCTION IF EXISTS public.get_property_details_by_id(uuid);

-- Recreate the get_properties_with_details function with the correct return type
CREATE OR REPLACE FUNCTION public.get_properties_with_details()
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
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
STABLE
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
            'general_observations', i.general_observations,
            'photoCount', (
                SELECT COUNT(*)
                FROM inspection_photos ip
                WHERE ip.inspection_id = i.id
            )
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

-- Recreate the get_property_details_by_id function with the correct return type
CREATE OR REPLACE FUNCTION public.get_property_details_by_id(p_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
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
STABLE
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
            'general_observations', i.general_observations,
            'photoCount', (
                SELECT COUNT(*)
                FROM inspection_photos ip
                WHERE ip.inspection_id = i.id
            )
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
