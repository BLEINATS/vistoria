/*
  # [SECURITY] Secure All Function Search Paths
  [This migration secures all relevant database functions by explicitly setting the search_path. This mitigates potential security risks related to search path hijacking and resolves the "Function Search Path Mutable" security advisory for all functions.]

  ## Query Description: [This operation modifies existing database functions to improve security. It is a safe, non-destructive change and does not affect existing data. No backup is required.]
  
  ## Metadata:
  - Schema-Category: ["Security", "Structural"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true]
  
  ## Structure Details:
  - Modifies function: public.create_user_subscription
  - Modifies function: public.get_properties_with_details
  - Modifies function: public.get_property_details_by_id
  
  ## Security Implications:
  - RLS Status: [Not Applicable]
  - Policy Changes: [No]
  - Auth Requirements: [Not Applicable]
  
  ## Performance Impact:
  - Indexes: [Not Applicable]
  - Triggers: [Not Applicable]
  - Estimated Impact: [None]
*/

-- Function: create_user_subscription
CREATE OR REPLACE FUNCTION public.create_user_subscription(
    user_uuid uuid,
    plan_name_param text,
    price_param numeric,
    asaas_subscription_id_param text,
    asaas_customer_id_param text,
    status_param text,
    billing_type_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET search_path = public;
  INSERT INTO public.subscriptions (user_id, plan_name, price, asaas_subscription_id, asaas_customer_id, status, billing_type, current_period_start, current_period_end)
  VALUES (user_uuid, plan_name_param, price_param, asaas_subscription_id_param, asaas_customer_id_param, status_param::subscription_status, billing_type_param::billing_type, NOW(), NOW() + interval '1 month');
END;
$$;

-- Function: get_properties_with_details
CREATE OR REPLACE FUNCTION public.get_properties_with_details()
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    name text,
    address text,
    type text,
    description text,
    facade_photo_url text,
    user_id uuid,
    inspections json,
    responsible_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  SET search_path = public;
  RETURN QUERY
  SELECT
      p.id,
      p.created_at,
      p.name,
      p.address,
      p.type,
      p.description,
      p.facade_photo_url,
      p.user_id,
      (
          SELECT json_agg(json_build_object(
              'id', i.id,
              'status', i.status,
              'inspection_type', i.inspection_type,
              'created_at', i.created_at,
              'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id)
          ))
          FROM inspections i
          WHERE i.property_id = p.id
      ) AS inspections,
      pr.full_name AS responsible_name
  FROM
      properties p
  LEFT JOIN
      profiles pr ON p.user_id = pr.id
  WHERE
      p.user_id = auth.uid();
END;
$$;

-- Function: get_property_details_by_id
CREATE OR REPLACE FUNCTION public.get_property_details_by_id(p_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    name text,
    address text,
    type text,
    description text,
    facade_photo_url text,
    user_id uuid,
    inspections json,
    responsible_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  SET search_path = public;
  RETURN QUERY
  SELECT
      p.id,
      p.created_at,
      p.name,
      p.address,
      p.type,
      p.description,
      p.facade_photo_url,
      p.user_id,
      (
          SELECT json_agg(json_build_object(
              'id', i.id,
              'status', i.status,
              'inspection_type', i.inspection_type,
              'created_at', i.created_at,
              'photoCount', (SELECT COUNT(*) FROM inspection_photos ip WHERE ip.inspection_id = i.id)
          ))
          FROM inspections i
          WHERE i.property_id = p.id
      ) AS inspections,
      pr.full_name AS responsible_name
  FROM
      properties p
  LEFT JOIN
      profiles pr ON p.user_id = pr.id
  WHERE
      p.id = p_id AND p.user_id = auth.uid();
END;
$$;
