import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  discount: number;
  popular?: boolean;
}

export interface UserCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  last_updated: string;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Static credit packages based on the monetization strategy
  const CREDIT_PACKAGES: CreditPackage[] = [
    {
      id: 'credit-1',
      name: '1 Crédito',
      credits: 1,
      price: 49.90,
      discount: 0
    },
    {
      id: 'credit-3',
      name: 'Pacote 3 Créditos',
      credits: 3,
      price: 119.90,
      discount: 20,
      popular: true
    },
    {
      id: 'credit-5',
      name: 'Pacote 5 Créditos',
      credits: 5,
      price: 174.90,
      discount: 30
    }
  ];

  // Fetch user's current credits from server-side database
  const fetchUserCredits = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Use server-side RPC function to get user's credit balance
      const { data, error: rpcError } = await supabase.rpc('get_user_credits', {
        p_user_id: user.id
      });

      if (rpcError) {
        console.error('Error fetching user credits from RPC:', rpcError);
        throw rpcError;
      }

      if (data && data.length > 0) {
        const creditData = data[0]; // RPC returns array, take first result
        setUserCredits({
          total_credits: creditData.total_credits,
          used_credits: creditData.used_credits,
          remaining_credits: creditData.remaining_credits,
          last_updated: creditData.last_updated
        });
      } else {
        // Initialize with zero credits if no data found
        const initialCredits: UserCredits = {
          total_credits: 0,
          used_credits: 0,
          remaining_credits: 0,
          last_updated: new Date().toISOString()
        };
        setUserCredits(initialCredits);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setError('Erro ao carregar créditos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Use credit for a property inspection using server-side validation
  const useCredit = useCallback(async (propertyId?: string, description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      
      // Use server-side RPC function to use a credit
      const { data, error: rpcError } = await supabase.rpc('use_credit', {
        p_user_id: user.id,
        p_property_id: propertyId || null,
        p_description: description || 'Property inspection'
      });

      if (rpcError) {
        console.error('Error using credit:', rpcError);
        setError('Erro ao usar crédito');
        return false;
      }

      if (!data) {
        setError('Créditos insuficientes. Compre mais créditos para continuar.');
        return false;
      }

      // Refresh credit balance after using a credit
      await fetchUserCredits();
      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      setError('Erro ao usar crédito');
      return false;
    }
  }, [user, fetchUserCredits]);

  // Add credits (after purchase) using server-side RPC function
  const addCredits = useCallback(async (credits: number, asaasPaymentId?: string, description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      
      // Use server-side RPC function to add credits
      const { data, error: rpcError } = await supabase.rpc('add_credits', {
        p_user_id: user.id,
        p_credits: credits,
        p_asaas_payment_id: asaasPaymentId || null,
        p_description: description || 'Credit purchase'
      });

      if (rpcError) {
        console.error('Error adding credits:', rpcError);
        setError('Erro ao adicionar créditos');
        return false;
      }

      // Refresh credit balance after adding credits
      await fetchUserCredits();
      return data; // Should return true if successful
    } catch (error) {
      console.error('Error adding credits:', error);
      setError('Erro ao adicionar créditos');
      return false;
    }
  }, [user, fetchUserCredits]);

  // Check if user can perform action (requires credit) using server-side validation
  const canUseCredit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Use server-side RPC function to check if user can use credit
      const { data, error } = await supabase.rpc('can_use_credit', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking credit availability:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking credit availability:', error);
      return false;
    }
  }, [user]);

  // Get credit price per property
  const getCreditPrice = (packageId: string): number => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    return pkg ? pkg.price / pkg.credits : 49.90;
  };

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  return {
    userCredits,
    creditPackages: CREDIT_PACKAGES,
    loading,
    error,
    useCredit,
    addCredits,
    canUseCredit,
    getCreditPrice,
    refetchCredits: fetchUserCredits
  };
};