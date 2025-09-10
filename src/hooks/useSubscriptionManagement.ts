import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../types/subscription';

// Secure subscription management using backend Edge Functions
export const useSubscriptionManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createSubscription = async (
    plan: SubscriptionPlan, 
    paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  ) => {
    if (!user || !user.email || plan.price === 0) return { success: false, message: 'Dados inválidos' };
    
    setLoading(true);
    try {
      // Get user's session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Call secure backend Edge Function
      const response = await fetch(`https://cmrukbrqkjvqeoxueltt.functions.supabase.co/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const result = await response.json();

      return {
        success: true,
        message: result.message,
        subscriptionId: result.subscriptionId,
        paymentMethod: result.paymentMethod,
        // Payment details for different methods
        pixCode: result.pixCode,
        qrCodeUrl: result.qrCodeUrl,
        boletoUrl: result.boletoUrl,
        invoiceUrl: result.invoiceUrl,
        dueDate: result.dueDate,
      };

    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar assinatura'
      };
    } finally {
      setLoading(false);
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
    loading
  };
};