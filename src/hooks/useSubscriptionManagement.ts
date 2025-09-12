import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../types/subscription';

// Secure subscription management using backend Edge Functions
export const useSubscriptionManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const createSubscription = async (
    plan: SubscriptionPlan,
    paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  ) => {
    if (!user || !user.email || plan.price === 0) {
      return { success: false, message: 'Dados de usuário ou plano inválidos para criar uma assinatura paga.' };
    }

    setLoading(true);
    setSelectedPlan(plan.id);
    try {
      // Invoking the 'create-subscription' Edge Function which handles the Asaas integration
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          planId: plan.id,
          paymentMethod: paymentMethod,
        },
      });

      if (error) {
        console.error('Edge function invocation error:', error);
        const errorMessage = (error as any).context?.error?.message || error.message || 'Falha ao criar a assinatura. Tente novamente.';
        throw new Error(errorMessage);
      }

      // The function's return value is in the 'data' property
      return data;

    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao se comunicar com o serviço de pagamento.',
      };
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const simulateUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) return { success: false, message: 'Usuário não encontrado' };
    
    // For free plan, create/update subscription in database
    if (plan.price === 0) {
      try {
        // Use server-side RPC function to create/update subscription
        const { error } = await supabase.rpc('create_user_subscription', {
          user_uuid: user.id,
          plan_name_param: plan.name,
          price_param: plan.price,
          asaas_subscription_id_param: null,
          asaas_customer_id_param: null,
          status_param: 'active',
          billing_type_param: 'free'
        });
        
        if (error) {
          console.error('Error creating free subscription:', error);
          throw error;
        }
        
        // Trigger custom event for same-tab synchronization
        window.dispatchEvent(new CustomEvent('subscriptionUpdated', { detail: { plan_name: plan.name } }));
        
        return {
          success: true,
          message: `Plano ${plan.name} ativado com sucesso!`
        };
      } catch (error) {
        console.error('Error upgrading to free plan:', error);
        return {
          success: false,
          message: 'Erro ao ativar o plano. Tente novamente.'
        };
      }
    }

    // For paid plans, this should not be used - use createSubscription instead
    return {
      success: false,
      message: 'Para planos pagos, use o sistema de checkout completo'
    };
  };

  const getCurrentPlan = async () => {
    if (!user) return 'Gratuito';
    
    try {
      // Fetch current subscription from database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching current plan:', error);
      }

      return data?.plan_name || 'Gratuito';
    } catch (error) {
      console.error('Error getting current plan:', error);
      return 'Gratuito';
    }
  };

  const getPlanLimits = async () => {
    if (!user) return null;
    
    try {
      // TODO: Replace with proper RPC function once available
      // For now, return fallback plan limits to make the app functional
      return {
        plan_name: 'Gratuito',
        properties_limit: 1,
        environments_limit: 3,
        photos_per_environment_limit: 5,
        ai_analysis_limit: null,
        properties_used: 0,
        environments_used: 0,
        photos_uploaded: 0,
        ai_analyses_used: 0
      };
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return null;
    }
  };

  return {
    createSubscription,
    simulateUpgrade,
    getCurrentPlan,
    getPlanLimits,
    loading,
    selectedPlan,
  };
};
