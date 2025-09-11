/*
# [SEGURANÇA] Definir Caminho de Busca das Funções
Esta migração aborda um aviso de segurança ao definir explicitamente o `search_path` para as funções existentes no banco de dados. Isso previne potenciais ataques de "sequestro de caminho de busca" (search path hijacking), garantindo que as funções procurem objetos apenas nos esquemas especificados (neste caso, `public`).

## Descrição da Query: Esta operação modifica a configuração de três funções existentes (`get_properties_with_details`, `get_property_details_by_id`, `create_user_subscription`) para torná-las mais seguras. Não altera a lógica ou os dados da aplicação. É uma melhoria de segurança recomendada e segura.

## Metadados:
- Categoria do Esquema: ["Segura", "Segurança"]
- Nível de Impacto: ["Baixo"]
- Requer Backup: false
- Reversível: true (removendo a configuração do search_path)

## Detalhes da Estrutura:
- Modifica `public.get_properties_with_details()`
- Modifica `public.get_property_details_by_id(uuid)`
- Modifica `public.create_user_subscription(uuid, text, numeric, text, text, text, text)`

## Implicações de Segurança:
- Status do RLS: Não alterado
- Mudanças de Política: Não
- Requisitos de Autenticação: Não
- Corrige o aviso de segurança "Function Search Path Mutable".

## Impacto de Performance:
- Índices: Nenhum
- Gatilhos: Nenhum
- Impacto Estimado: Insignificante. Esta é uma mudança de metadados.
*/

-- Define um search_path seguro para a função get_properties_with_details
ALTER FUNCTION public.get_properties_with_details()
SET search_path = public;

-- Define um search_path seguro para a função get_property_details_by_id
-- Assumindo que o argumento é do tipo uuid
ALTER FUNCTION public.get_property_details_by_id(p_id uuid)
SET search_path = public;

-- Define um search_path seguro para a função create_user_subscription
-- Assumindo os tipos de argumento com base no uso na Edge Function
ALTER FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
SET search_path = public;
