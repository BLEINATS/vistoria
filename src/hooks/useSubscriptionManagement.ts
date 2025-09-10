import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionPlan } from '../types/subscription';

// Simplified subscription management without external payment processor
export const useSubscriptionManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const simulateUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) return { success: false, message: 'Usuário não encontrado' };
    
    setLoading(true);
    try {
      // Simulate successful upgrade
      // In a real app, this would integrate with Asaas
      
      // For now, we'll just simulate the success
      console.log(`Simulating upgrade to ${plan.name} plan for user ${user.id}`);
      
      // Create a simple tracking in localStorage for demo
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
        message: `Plano ${plan.name} ativado com sucesso! (Demonstração)`
      };

    } catch (error) {
      console.error('Error upgrading plan:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar plano'
      };
    } finally {
      setLoading(false);
    }
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
    simulateUpgrade,
    getCurrentPlan,
    getPlanLimits,
    loading
  };
};