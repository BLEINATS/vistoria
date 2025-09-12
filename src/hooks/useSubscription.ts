import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { SubscriptionPlan, UserPlanLimits, Subscription } from '../types/subscription';

export const useSubscription = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userLimits, setUserLimits] = useState<UserPlanLimits | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref for fetchUserLimits to avoid stale closures in event listeners
  const fetchUserLimitsRef = useRef<(() => Promise<void>) | null>(null);

  // No longer needed - plan limits are now fetched from server-side database

  // Fetch subscription plans from server-side database
  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }

      // Handle both error case and empty results case with fallback plans
      if (!data || data.length === 0) {
        console.log('No active plans found, using fallback plans');
        setPlans(getDefaultPlans());
      } else {
        setPlans(data.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          interval_type: plan.interval_type as 'month' | 'year',
          properties_limit: plan.properties_limit,
          environments_limit: plan.environments_limit,
          photos_per_environment_limit: plan.photos_per_environment_limit,
          ai_analysis_limit: plan.ai_analysis_limit,
          is_active: plan.is_active,
          created_at: plan.created_at,
          updated_at: plan.updated_at
        })));
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      // Fallback to basic plans if database is unavailable
      setPlans(getDefaultPlans());
    }
  }, []);

  // Default fallback plans to ensure the app always has plans to display
  const getDefaultPlans = () => ([
    {
      id: 'fallback-gratuito',
      name: 'Gratuito',
      price: 0,
      currency: 'BRL',
      interval_type: 'month' as const,
      properties_limit: 1,
      environments_limit: 3,
      photos_per_environment_limit: 5,
      ai_analysis_limit: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-basico',
      name: 'Básico',
      price: 97,
      currency: 'BRL',
      interval_type: 'month' as const,
      properties_limit: null,
      environments_limit: null,
      photos_per_environment_limit: 20,
      ai_analysis_limit: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-profissional',
      name: 'Profissional',
      price: 147,
      currency: 'BRL',
      interval_type: 'month' as const,
      properties_limit: null,
      environments_limit: null,
      photos_per_environment_limit: null,
      ai_analysis_limit: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  // Fetch user's current limits and usage from server-side database
  const fetchUserLimits = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      
      // Get real user limits and usage from database via RPC
      const { data, error } = await supabase.rpc('get_user_limits', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching user limits:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const userLimitsData = data[0];
        setUserLimits({
          plan_name: userLimitsData.plan_name,
          properties_limit: userLimitsData.properties_limit,
          environments_limit: userLimitsData.environments_limit,
          photos_per_environment_limit: userLimitsData.photos_per_environment_limit,
          ai_analysis_limit: userLimitsData.ai_analysis_limit,
          properties_used: userLimitsData.properties_used,
          environments_used: userLimitsData.environments_used,
          photos_uploaded: userLimitsData.photos_uploaded,
          ai_analyses_used: userLimitsData.ai_analyses_used
        });
      } else {
        // Fallback if no data is returned
        setUserLimits({
          plan_name: 'Gratuito',
          properties_limit: 1,
          environments_limit: 3,
          photos_per_environment_limit: 5,
          ai_analysis_limit: null,
          properties_used: 0,
          environments_used: 0,
          photos_uploaded: 0,
          ai_analyses_used: 0
        });
      }

    } catch (err) {
      console.error('Error fetching user limits:', err);
      setError('Erro ao carregar limites do usuário');
      
      // Provide fallback data on error
      setUserLimits({
        plan_name: 'Gratuito',
        properties_limit: 1,
        environments_limit: 3,
        photos_per_environment_limit: 5,
        ai_analysis_limit: null,
        properties_used: 0,
        environments_used: 0,
        photos_uploaded: 0,
        ai_analyses_used: 0
      });
    }
  }, [user]);

  // Update ref for cross-tab sync
  useEffect(() => {
    fetchUserLimitsRef.current = fetchUserLimits;
  });

  // Cross-tab synchronization and real-time updates
  useEffect(() => {
    const handleCustomEvent = (_e: CustomEvent) => {
      if (user && fetchUserLimitsRef.current) {
        // Refresh user limits when subscription changes in same tab
        fetchUserLimitsRef.current();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user && fetchUserLimitsRef.current) {
        // Refresh data when tab becomes visible (user switches back to this tab)
        fetchUserLimitsRef.current();
      }
    };

    // Listen for custom subscription update events (same tab)
    window.addEventListener('subscriptionUpdated', handleCustomEvent as EventListener);
    // Listen for tab visibility changes to ensure fresh data
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('subscriptionUpdated', handleCustomEvent as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Fetch current user subscription from server-side database
  const fetchCurrentSubscription = useCallback(async () => {
    if (!user) {
      setCurrentSubscription(null);
      return;
    }
    
    try {
      // Fetch subscription directly from database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching subscription:', error);
        throw error;
      }

      if (data) {
        setCurrentSubscription({
          id: data.id,
          user_id: data.user_id,
          plan_id: data.plan_id,
          asaas_subscription_id: data.asaas_subscription_id,
          asaas_customer_id: data.asaas_customer_id,
          status: data.status,
          current_period_start: data.current_period_start,
          current_period_end: data.current_period_end,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      } else {
        // No active subscription found, user is on free plan
        setCurrentSubscription(null);
      }
      
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentSubscription(null);
    }
  }, [user, plans]);

  // Check if user can perform an action based on limits
  const canPerformAction = useCallback((action: 'create_property' | 'add_environment' | 'upload_photo' | 'use_ai_analysis' | 'generate_report') => {
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
      
      case 'use_ai_analysis':
        return userLimits.ai_analysis_limit === null || 
               userLimits.ai_analyses_used < userLimits.ai_analysis_limit;
      
      case 'generate_report':
        // Reports are generally allowed unless specifically limited
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

  // Update usage using server-side RPC function
  const updateUsage = useCallback(async (type: 'properties' | 'environments' | 'photos' | 'ai_analyses', count = 1) => {
    if (!user) return false;

    try {
      // Use server-side RPC function to increment usage
      const { data, error } = await supabase.rpc('increment_user_usage', {
        p_user_id: user.id,
        p_type: type,
        p_count: count
      });

      if (error) {
        console.error('Error updating usage:', error);
        return false;
      }

      // Refresh user limits to reflect the updated usage
      await fetchUserLimits();
      return data; // Should return true if successful
    } catch (err) {
      console.error('Error updating usage:', err);
      return false;
    }
  }, [user, fetchUserLimits]);

  // Initialize plans once
  useEffect(() => {
    fetchPlans();
  }, []);

  // Initialize user limits when user changes
  useEffect(() => {
    if (user) {
      fetchUserLimits();
    }
  }, [user, fetchUserLimits]);

  // Initialize subscription when user changes
  useEffect(() => {
    if (user) {
      fetchCurrentSubscription();
    }
  }, [user, fetchCurrentSubscription]);

  // Set loading to false when data is ready (fixed loading logic)
  useEffect(() => {
    // Always set loading to false after plans are fetched and userLimits are ready
    // Don't depend on plans.length since empty results are valid
    if (plans !== null && (userLimits !== null || !user)) {
      setLoading(false);
    }
  }, [plans, userLimits, user]);

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
