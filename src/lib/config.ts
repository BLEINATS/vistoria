// Configuration for Supabase Edge Functions
const getSupabaseUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('VITE_SUPABASE_URL is not configured');
  return url;
};

// Convert Supabase URL to Edge Functions URL
export const getEdgeFunctionUrl = (functionName: string) => {
  const supabaseUrl = getSupabaseUrl();
  // Convert https://xxx.supabase.co to https://xxx.functions.supabase.co
  const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
  return `${functionsUrl}/v1/${functionName}`;
};

export const EDGE_FUNCTIONS = {
  CREATE_SUBSCRIPTION: 'create-subscription',
  ASAAS_WEBHOOK: 'asaas-webhook',
};