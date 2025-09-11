/*
# [Function Update] Corrige a tipagem da função de busca de usuários
[Esta operação corrige um erro de incompatibilidade de tipos na função que lista todos os usuários para o administrador. A função estava retornando um tipo de dado diferente do esperado, causando falha na página de perfil.]

## Query Description: [Esta operação irá atualizar a função `get_all_users_with_details`. A nova versão garante que o campo de e-mail seja retornado com o tipo `text`, resolvendo o erro de incompatibilidade. Nenhuma perda de dados está prevista, pois a operação afeta apenas a definição da função.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [false]

## Structure Details:
- Function affected: `public.get_all_users_with_details`

## Security Implications:
- RLS Status: [N/A]
- Policy Changes: [No]
- Auth Requirements: [Admin role check inside function]
- Addresses "Function Search Path Mutable" warning by setting a fixed search_path.

## Performance Impact:
- Indexes: [N/A]
- Triggers: [N/A]
- Estimated Impact: [Nenhum impacto de performance esperado.]
*/

CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
    id uuid,
    full_name text,
    email text,
    company_name text,
    company_logo_url text,
    plan_tier text,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Define o search_path para evitar problemas de segurança e contexto
SET search_path = public, auth
AS $$
BEGIN
    -- Verifica se o usuário tem a role 'admin'
    IF NOT (
        SELECT 'admin' = get_my_claim('user_role')
        FROM auth.users
        WHERE auth.users.id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta função.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email::text, -- Cast explícito para garantir a compatibilidade de tipo
        p.company_name,
        p.company_logo_url,
        'Gratuito'::text AS plan_tier, -- Valor temporário
        TRUE AS is_active
    FROM
        auth.users u
    LEFT JOIN
        public.profiles p ON u.id = p.id;
END;
$$;
