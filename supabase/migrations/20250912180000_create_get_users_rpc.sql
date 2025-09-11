/*
  # [Function] get_all_users_with_details
  Cria uma função RPC para o administrador buscar todos os usuários com seus detalhes de perfil e e-mail.

  ## Query Description: [Esta função permite que o administrador consulte informações combinadas das tabelas 'auth.users' e 'public.profiles'. A função é segura, pois contém uma verificação interna para garantir que apenas o usuário administrador ('klaus@bleinat.com.br') possa executá-la.]

  ## Metadata:
  - Schema-Category: ["Structural"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true]

  ## Structure Details:
  - Function: public.get_all_users_with_details()

  ## Security Implications:
  - RLS Status: [N/A]
  - Policy Changes: [No]
  - Auth Requirements: [A função só pode ser executada pelo usuário administrador com ID '3189b78e-bbed-427a-b0fa-b184a394ffba'.]
*/

create or replace function public.get_all_users_with_details()
returns table (
    id uuid,
    full_name text,
    company_name text,
    company_logo_url text,
    email text,
    plan_name text,
    subscription_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Verificação de segurança: Apenas o ID do usuário administrador pode executar esta função.
    if auth.uid() <> '3189b78e-bbed-427a-b0fa-b184a394ffba' then
        raise exception 'acesso negado: somente administradores podem executar esta função';
    end if;

    return query
    select
        p.id,
        p.full_name,
        p.company_name,
        p.company_logo_url,
        au.email,
        coalesce(s.plan_name, 'Gratuito') as plan_name,
        s.status as subscription_status
    from
        auth.users as au
    left join
        public.profiles as p on au.id = p.id
    left join
        public.subscriptions as s on au.id = s.user_id
    order by
        au.created_at desc;
end;
$$;

grant execute on function public.get_all_users_with_details() to authenticated;
