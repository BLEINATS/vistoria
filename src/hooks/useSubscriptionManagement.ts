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
    
    // For free plan, just update locally
    if (plan.price === 0) {
      const subscriptionData = {
        user_id: user.id,
        plan_name: plan.name,
        price: plan.price,
        upgraded_at: new Date().toISOString(),
        status: 'active'
      };
      
      localStorage.setItem('vistoria_subscription', JSON.stringify(subscriptionData));
      
      // Trigger custom event for same-tab synchronization (since storage events don't fire on the same tab)
      window.dispatchEvent(new CustomEvent('subscriptionUpdated', { detail: subscriptionData }));
      
      return {
        success: true,
        message: `Plano ${plan.name} ativado com sucesso!`
      };
    }

    // For paid plans, this should not be used - use createSubscription instead
    return {
      success: false,
      message: 'Para planos pagos, use o sistema de checkout completo'
    };
  };

  const getCurrentPlan = () => {
    const stored = localStorage.getItem('vistoria_subscription');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return data.plan_name;
      } catch {
        return 'Gratuito';
      }
    }
    return 'Gratuito';
  };

  const getPlanLimits = (planName: string) => {
    switch (planName) {
      case 'Básico':
        return {
          plan_name: 'Básico',
          properties_limit: 2,
          environments_limit: null,
          photos_per_environment_limit: 5,
          properties_used: 0,
          environments_used: 0,
          photos_uploaded: 0,
          ai_analyses_used: 0
        };
      case 'Premium':
        return {
          plan_name: 'Premium',
          properties_limit: null,
          environments_limit: null,
          photos_per_environment_limit: 5,
          properties_used: 0,
          environments_used: 0,
          photos_uploaded: 0,
          ai_analyses_used: 0
        };
      default:
        return {
          plan_name: 'Gratuito',
          properties_limit: 1,
          environments_limit: 3,
          photos_per_environment_limit: 5,
          properties_used: 0,
          environments_used: 0,
          photos_uploaded: 0,
          ai_analyses_used: 0
        };
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
