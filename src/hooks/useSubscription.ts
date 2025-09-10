import { useState, useEffect, useCallback } from 'react';
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

  // Fetch available plans from database
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

      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Erro ao carregar planos');
      // Fallback to empty array if fetch fails
      setPlans([]);
    }
  }, []);

  // Fetch user's current limits and usage (real data from database)
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

      // Set limits based on plan
      const planLimits = plans.find(p => p.name === planName);
      if (planLimits) {
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