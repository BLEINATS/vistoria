import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createAsaasCustomer, createAsaasSubscription } from '../lib/asaas';
import type { SubscriptionPlan } from '../types/subscription';

// Real subscription management with Asaas integration
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
      // Get user profile for additional data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const userName = profile?.full_name || user.email.split('@')[0];

      console.log('Creating Asaas customer for:', userName, user.email);

      // 1. Create customer in Asaas
      const asaasCustomer = await createAsaasCustomer({
        name: userName,
        email: user.email,
      });

      console.log('Asaas customer created:', asaasCustomer.id);

      // 2. Create subscription in Asaas
      const asaasSubscription = await createAsaasSubscription({
        customer: asaasCustomer.id,
        billingType: paymentMethod,
        cycle: 'MONTHLY',
        value: plan.price,
        description: `VistorIA - Plano ${plan.name}`,
      });

      console.log('Asaas subscription created:', asaasSubscription.id);

      // 3. Store subscription in our database
      const { error: dbError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_name: plan.name,
          price: plan.price,
          asaas_subscription_id: asaasSubscription.id,
          asaas_customer_id: asaasCustomer.id,
          status: 'PENDING',
          billing_type: paymentMethod,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return {
          success: false,
          message: 'Erro ao salvar assinatura no banco de dados'
        };
      }

      return {
        success: true,
        message: `Assinatura ${plan.name} criada com sucesso! Finalize o pagamento para ativar seu plano.`,
        subscriptionId: asaasSubscription.id,
        paymentMethod
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