import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionPlan, UserPlanLimits, Subscription } from '../types/subscription';

export const useSubscription = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      name: 'Gratuito',
      price: 0,
      currency: 'BRL',
      interval_type: 'month',
      properties_limit: 1,
      environments_limit: 3,
      photos_per_environment_limit: 5,
      ai_analysis_limit: null,
      is_active: true,
      created_at: '',
      updated_at: ''
    },
    {
      id: '2',
      name: 'Básico',
      price: 47.00,
      currency: 'BRL',
      interval_type: 'month',
      properties_limit: 2,
      environments_limit: null,
      photos_per_environment_limit: 5,
      ai_analysis_limit: null,
      is_active: true,
      created_at: '',
      updated_at: ''
    },
    {
      id: '3',
      name: 'Premium',
      price: 77.00,
      currency: 'BRL',
      interval_type: 'month',
      properties_limit: null,
      environments_limit: null,
      photos_per_environment_limit: 5,
      ai_analysis_limit: null,
      is_active: true,
      created_at: '',
      updated_at: ''
    }
  ]);
  const [userLimits, setUserLimits] = useState<UserPlanLimits | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available plans (using hardcoded data for demo)
  const fetchPlans = useCallback(async () => {
    // Plans are already set in state, no need to fetch
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate loading
  }, []);

  // Fetch user's current limits and usage (using localStorage for demo)
  const fetchUserLimits = useCallback(async () => {
    if (!user) return;

    try {
      // Get current plan from localStorage
      const stored = localStorage.getItem('vistoria_subscription');
      let planName = 'Gratuito';
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          planName = data.plan_name || 'Gratuito';
        } catch {
          planName = 'Gratuito';
        }
      }

      // Get current usage from localStorage
      const usageKey = `vistoria_usage_${user.id}`;
      const usageStored = localStorage.getItem(usageKey);
      let usage = { properties_used: 0, environments_used: 0, photos_uploaded: 0, ai_analyses_used: 0 };
      
      if (usageStored) {
        try {
          usage = JSON.parse(usageStored);
        } catch {
          // Use defaults
        }
      }

      // Set limits based on plan
      const planLimits = plans.find(p => p.name === planName);
      if (planLimits) {
        setUserLimits({
          plan_name: planName,
          properties_limit: planLimits.properties_limit,
          environments_limit: planLimits.environments_limit,
          photos_per_environment_limit: planLimits.photos_per_environment_limit,
          ai_analysis_limit: planLimits.ai_analysis_limit,
          ...usage
        });
      }
    } catch (err) {
      console.error('Error fetching user limits:', err);
      setError('Erro ao carregar limites do usuário');
    }
  }, [user, plans]);

  // Fetch user's current subscription
  const fetchCurrentSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setCurrentSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      // Don't set error here - user might not have a subscription
    }
  }, [user]);

  // Check if user can perform an action based on limits
  const canPerformAction = useCallback((action: 'create_property' | 'add_environment' | 'upload_photo') => {
    if (!userLimits) return false;

    switch (action) {
      case 'create_property':
        return userLimits.properties_limit === null || 
               userLimits.properties_used < userLimits.properties_limit;
      
      case 'add_environment':
        return userLimits.environments_limit === null || 
               userLimits.environments_used < userLimits.environments_limit;
      
      case 'upload_photo':
        // This is handled per-environment in the component
        return true;
      
      default:
        return false;
    }
  }, [userLimits]);

  // Get remaining usage for a specific limit
  const getRemainingUsage = useCallback((type: 'properties' | 'environments') => {
    if (!userLimits) return { used: 0, remaining: 0, unlimited: false };

    const limit = type === 'properties' ? userLimits.properties_limit : userLimits.environments_limit;
    const used = type === 'properties' ? userLimits.properties_used : userLimits.environments_used;

    if (limit === null) {
      return { used, remaining: Infinity, unlimited: true };
    }

    return { used, remaining: Math.max(0, limit - used), unlimited: false };
  }, [userLimits]);

  // Update usage (using localStorage for demo)
  const updateUsage = useCallback(async (type: 'properties' | 'environments' | 'photos' | 'ai_analyses', count = 1) => {
    if (!user) return false;

    try {
      const usageKey = `vistoria_usage_${user.id}`;
      const usageStored = localStorage.getItem(usageKey);
      let usage = { properties_used: 0, environments_used: 0, photos_uploaded: 0, ai_analyses_used: 0 };
      
      if (usageStored) {
        try {
          usage = JSON.parse(usageStored);
        } catch {
          // Use defaults
        }
      }

      // Update the specific type
      switch (type) {
        case 'properties':
          usage.properties_used += count;
          break;
        case 'environments':
          usage.environments_used += count;
          break;
        case 'photos':
          usage.photos_uploaded += count;
          break;
        case 'ai_analyses':
          usage.ai_analyses_used += count;
          break;
      }

      // Save back to localStorage
      localStorage.setItem(usageKey, JSON.stringify(usage));
      
      // Refresh limits
      await fetchUserLimits();
      return true;
    } catch (err) {
      console.error('Error updating usage:', err);
      return false;
    }
  }, [user, fetchUserLimits]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPlans(),
        fetchUserLimits(),
        fetchCurrentSubscription()
      ]);
      setLoading(false);
    };

    initializeData();
  }, [fetchPlans, fetchUserLimits, fetchCurrentSubscription]);

  return {
    plans,
    userLimits,
    currentSubscription,
    loading,
    error,
    canPerformAction,
    getRemainingUsage,
    updateUsage,
    refetchLimits: fetchUserLimits,
    refetchSubscription: fetchCurrentSubscription
  };
};