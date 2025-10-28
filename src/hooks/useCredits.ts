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

      // TODO: Replace with proper RPC function once available  
      // For now, provide fallback data to make the app functional
      const initialCredits: UserCredits = {
        total_credits: 0,
        used_credits: 0,
        remaining_credits: 0,
        last_updated: new Date().toISOString()
      };
      setUserCredits(initialCredits);

    } catch (error) {
      console.error('Error fetching user credits:', error);
      setError('Erro ao carregar créditos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Use credit for a property inspection using server-side validation
  const useCredit = useCallback(async (_propertyId?: string, _description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      
      // TODO: Replace with proper RPC function once available
      // For now, simulate credit usage for app functionality
      if (!userCredits || userCredits.remaining_credits <= 0) {
        setError('Créditos insuficientes. Compre mais créditos para continuar.');
        return false;
      }

      // Simulate credit usage
      setUserCredits(prev => prev ? {
        ...prev,
        used_credits: prev.used_credits + 1,
        remaining_credits: prev.remaining_credits - 1,
        last_updated: new Date().toISOString()
      } : null);
      
      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      setError('Erro ao usar crédito');
      return false;
    }
  }, [user, userCredits]);

  // Purchase credits through secure backend (no direct credit addition allowed)
  const purchaseCredits = useCallback(async (packageId: string, paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): Promise<{
    success: boolean;
    message: string;
    paymentId?: string;
    pixCode?: string;
    qrCodeUrl?: string;
    boletoUrl?: string;
    invoiceUrl?: string;
    dueDate?: string;
  }> => {
    if (!user) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    try {
      setError(null);
      
      // Call secure backend function for credit purchase
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.access_token) {
        return { success: false, message: 'Sessão expirada' };
      }

      const response = await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/create-credit-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({
          packageId,
          paymentMethod,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      if (result.success) {
        // Payment created successfully, credits will be added after webhook confirmation
        return {
          success: true,
          message: result.message,
          paymentId: result.payment?.paymentId,
          pixCode: result.payment?.pixCode,
          qrCodeUrl: result.payment?.qrCodeUrl,
          boletoUrl: result.payment?.boletoUrl,
          invoiceUrl: result.payment?.invoiceUrl,
          dueDate: result.payment?.dueDate,
        };
      } else {
        return { success: false, message: result.message || 'Erro desconhecido' };
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao comprar créditos';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [user]);

  // Check if user can perform action (requires credit) using server-side validation
  const canUseCredit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // TODO: Replace with proper RPC function once available
      // For now, check credit availability from local state
      return userCredits ? userCredits.remaining_credits > 0 : false;
    } catch (error) {
      console.error('Error checking credit availability:', error);
      return false;
    }
  }, [user, userCredits]);

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
    purchaseCredits,
    canUseCredit,
    getCreditPrice,
    refetchCredits: fetchUserCredits
  };
};
