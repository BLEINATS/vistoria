/*
          # [Alter RPC Function: get_all_users_with_details]
          Updates the function to remove the dependency on the non-existent 'subscriptions' table.

          ## Query Description: [This operation modifies the `get_all_users_with_details` function. The original function attempted to join with a `public.subscriptions` table which does not exist, causing an error. This fix removes the join and temporarily defaults the `plan_tier` for all users to 'Gratuito'. This allows the user list to be displayed while the subscription system is being properly integrated.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Function: `public.get_all_users_with_details()`
          
          ## Security Implications:
          - RLS Status: [Not Applicable]
          - Policy Changes: [No]
          - Auth Requirements: [Requires authenticated user]
          */
create or replace function public.get_all_users_with_details()
returns table (
    id uuid,
    email text,
    full_name text,
    company_name text,
    company_logo_url text,
    plan_tier text
)
language sql
security definer
set search_path = public
as $$
    select
        u.id,
        u.email,
        p.full_name,
        p.company_name,
        p.company_logo_url,
        'Gratuito' as plan_tier -- Temporarily defaulting to 'Gratuito' as subscriptions table does not exist
    from
        auth.users u
    left join
        public.profiles p on u.id = p.id
    order by
        u.created_at desc;
$$;

grant execute on function public.get_all_users_with_details() to authenticated;
