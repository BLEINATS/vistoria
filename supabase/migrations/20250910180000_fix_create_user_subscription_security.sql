/*
          # [SECURITY] Set Search Path for create_user_subscription

          This migration enhances security by setting a fixed `search_path` for the `create_user_subscription` function. This prevents potential hijacking attacks by ensuring the function only looks for tables and other functions within the `public` schema.

          ## Query Description:
          - **Safety:** This is a safe, non-destructive operation. It only modifies the function's metadata and does not affect any data.
          - **Impact:** No impact on existing data. The function's behavior remains the same, but it becomes more secure.
          - **Reversibility:** This change is reversible by altering the function again, but it is not recommended as it would reintroduce a security vulnerability.
          
          ## Metadata:
          - Schema-Category: "Safe"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Security Implications:
          - RLS Status: Not applicable to function definition.
          - Policy Changes: No.
          - Auth Requirements: None.
          - **Benefit:** Mitigates the "Function Search Path Mutable" security warning by preventing search path manipulation.
          
          ## Performance Impact:
          - Indexes: None.
          - Triggers: None.
          - Estimated Impact: Negligible. This is a metadata change.
          */

ALTER FUNCTION public.create_user_subscription(user_uuid uuid, plan_name_param text, price_param numeric, asaas_subscription_id_param text, asaas_customer_id_param text, status_param text, billing_type_param text)
SET search_path = public;
