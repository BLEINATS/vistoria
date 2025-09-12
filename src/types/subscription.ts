export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval_type: 'month' | 'year';
  properties_limit: number | null;
  environments_limit: number | null;
  photos_per_environment_limit: number | null;
  ai_analysis_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'suspended';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  properties_used: number;
  environments_used: number;
  photos_uploaded: number;
  ai_analyses_used: number;
  created_at: string;
  updated_at: string;
}

export interface UserPlanLimits {
  plan_name: string;
  properties_limit: number | null;
  environments_limit: number | null;
  photos_per_environment_limit: number | null;
  ai_analysis_limit: number | null;
  properties_used: number;
  environments_used: number;
  photos_uploaded: number;
  ai_analyses_used: number;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  cycle: 'MONTHLY' | 'YEARLY';
  value: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
}

// Interface for subscription data stored in localStorage
export interface LocalStorageSubscription {
  id?: string | number;
  user_id: string;
  plan_name: string;
  price: number;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'suspended';
  billing_type?: string;
  created_at?: string;
  updated_at?: string;
}
