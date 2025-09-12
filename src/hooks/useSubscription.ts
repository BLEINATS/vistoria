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

  // Static plan limits mapping to prevent dependency loops
  const PLAN_LIMITS = {
    'Gratuito': {
      properties_limit: 1,
      environments_limit: 3,
      photos_per_environment_limit: 5,
      ai_analysis_limit: null
    },
    'Básico': {
      properties_limit: 5,
      environments_limit: null,
      photos_per_environment_limit: 10,
      ai_analysis_limit: null
    },
    'Profissional': {
      properties_limit: 10,
      environments_limit: null,
      photos_per_environment_limit: 15,
      ai_analysis_limit: null
    },
    'Empresarial': {
      properties_limit: null,
      environments_limit: null,
      photos_per_environment_limit: null,
      ai_analysis_limit: null
    },
    'Pay-per-use': {
      properties_limit: null, // Based on credits purchased
      environments_limit: null,
      photos_per_environment_limit: 10,
      ai_analysis_limit: null
    }
  };

  // Use static plans to prevent database cache issues
  const fetchPlans = useCallback(async () => {
    // Updated plans according to monetization strategy
    setPlans([
      {
        id: '7d66e56a-bea2-4c10-b9ca-0f23f2231a56',
        name: 'Gratuito',
        price: 0,
        currency: 'BRL',
        interval_type: 'month',
        properties_limit: 1,
        environments_limit: 3,
        photos_per_environment_limit: 5,
        ai_analysis_limit: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'f9de3820-0950-4370-99e2-f3bf517ba85d',
        name: 'Básico',
        price: 97.00,
        currency: 'BRL',
        interval_type: 'month',
        properties_limit: 5,
        environments_limit: null,
        photos_per_environment_limit: 10,
        ai_analysis_limit: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'd6fa6dd4-bb8c-4461-9172-6d90b4832a43',
        name: 'Profissional',
        price: 147.00,
        currency: 'BRL',
        interval_type: 'month',
        properties_limit: 10,
        environments_limit: null,
        photos_per_environment_limit: 15,
        ai_analysis_limit: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'e8fa7dd5-cc9d-5572-0283-7e91c5943b54',
        name: 'Empresarial',
        price: 170.00,
        currency: 'BRL',
        interval_type: 'month',
        properties_limit: null,
        environments_limit: null,
        photos_per_environment_limit: null,
        ai_analysis_limit: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
    
    // No delay needed - data is already static
  }, []);

  // Fetch user's current limits and usage (real data from database)
  const fetchUserLimits = useCallback(async () => {
    if (!user) return;

    try {
      // Get current plan from localStorage with better error handling
      let planName = 'Gratuito';
      
      const stored = localStorage.getItem('vistoria_subscription');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          planName = data.plan_name || 'Gratuito';
          
          // Ensure data is from this specific user
          if (data.user_id !== user.id) {
            localStorage.removeItem('vistoria_subscription');
            planName = 'Gratuito';
          }
        } catch {
          // Clear corrupted data
          localStorage.removeItem('vistoria_subscription');
          planName = 'Gratuito';
        }
      }

      // Get real usage from database using RPC function that already works
      let properties_used = 0;
      let environments_used = 0;
      let photos_uploaded = 0;

      try {
        // Use the existing RPC function to get properties with details
        const { data: propertiesData } = await supabase.rpc('get_properties_with_details');
        
        if (propertiesData && Array.isArray(propertiesData)) {
          // Count user's properties
          properties_used = propertiesData.filter(p => p.user_id === user.id).length;
          
          // Count environments - each inspection represents an environment/room being inspected
          environments_used = propertiesData
            .filter(p => p.user_id === user.id)
            .reduce((total, property) => {
              return total + (property.inspections?.length || 0);
            }, 0);
          
          // Count photos from all inspections
          photos_uploaded = propertiesData
            .filter(p => p.user_id === user.id)
            .reduce((total, property) => {
              const inspectionPhotos = property.inspections?.reduce((photoCount: number, inspection: any) => {
                return photoCount + (inspection.photos?.length || 0);
              }, 0) || 0;
              return total + inspectionPhotos;
            }, 0);
        }
      } catch (error) {
        console.error('Error fetching usage data:', error);
        // Use fallback values
        properties_used = 0;
        environments_used = 0;
        photos_uploaded = 0;
      }

      // Set limits based on plan using static mapping
      const planLimits = PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] || PLAN_LIMITS['Gratuito'];
      setUserLimits({
        plan_name: planName,
        properties_limit: planLimits.properties_limit,
        environments_limit: planLimits.environments_limit,
        photos_per_environment_limit: planLimits.photos_per_environment_limit,
        ai_analysis_limit: planLimits.ai_analysis_limit,
        properties_used: properties_used,
        environments_used: environments_used,
        photos_uploaded: photos_uploaded,
        ai_analyses_used: 0 // For now, not tracking this specifically
      });
    } catch (err) {
      console.error('Error fetching user limits:', err);
      setError('Erro ao carregar limites do usuário');
    }
  }, [user]);

  // Update ref for cross-tab sync
  useEffect(() => {
    fetchUserLimitsRef.current = fetchUserLimits;
  });

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vistoria_subscription' && user && fetchUserLimitsRef.current) {
        // Refresh user limits when subscription changes in other tabs
        fetchUserLimitsRef.current();
      }
    };

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

    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom subscription update events (same tab)
    window.addEventListener('subscriptionUpdated', handleCustomEvent as EventListener);
    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('subscriptionUpdated', handleCustomEvent as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Fetch current user subscription - using localStorage temporarily due to Supabase cache issues
  const fetchCurrentSubscription = useCallback(async () => {
    if (!user) {
      setCurrentSubscription(null);
      return;
    }
    
    try {
      // TEMPORARY: Use localStorage until Supabase cache issues are resolved
      // Try to get from localStorage first (for recent subscriptions)
      const stored = localStorage.getItem('vistoria_subscription');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.user_id === user.id && data.status === 'active') {
            // Convert localStorage format to subscription format
            setCurrentSubscription({
              id: data.id || 1,
              user_id: data.user_id,
              plan_name: data.plan_name,
              price: data.price,
              asaas_subscription_id: data.asaas_subscription_id || null,
              asaas_customer_id: data.asaas_customer_id || null,
              status: data.status,
              billing_type: data.billing_type || 'CREDIT_CARD',
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString()
            } as Subscription);
            return;
          }
        } catch (e) {
          console.warn('Invalid subscription data in localStorage:', e);
        }
      }
      
      // No valid subscription found, user is on free plan
      setCurrentSubscription(null);
      
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentSubscription(null);
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

  // Update usage (refresh from database)
  const updateUsage = useCallback(async (_type: 'properties' | 'environments' | 'photos' | 'ai_analyses', _count = 1) => {
    if (!user) return false;

    try {
      // Instead of manually tracking, just refresh the counts from database
      // This ensures we always have accurate counts
      await fetchUserLimits();
      return true;
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

  // Set loading to false when data is ready
  useEffect(() => {
    if (plans.length > 0 && (userLimits !== null || !user)) {
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
