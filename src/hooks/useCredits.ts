import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

  // Fetch user's current credits
  const fetchUserCredits = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user credits from localStorage as fallback (for demo)
      const stored = localStorage.getItem('vistoria_credits');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.user_id === user.id) {
            setUserCredits(data);
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem('vistoria_credits');
        }
      }

      // Initialize with zero credits if no data found
      const initialCredits: UserCredits = {
        total_credits: 0,
        used_credits: 0,
        remaining_credits: 0,
        last_updated: new Date().toISOString()
      };

      setUserCredits(initialCredits);
      localStorage.setItem('vistoria_credits', JSON.stringify({
        ...initialCredits,
        user_id: user.id
      }));

    } catch (error) {
      console.error('Error fetching user credits:', error);
      setError('Erro ao carregar créditos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Use credit for a property inspection
  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user || !userCredits) return false;

    if (userCredits.remaining_credits <= 0) {
      setError('Créditos insuficientes. Compre mais créditos para continuar.');
      return false;
    }

    try {
      const updatedCredits: UserCredits = {
        ...userCredits,
        used_credits: userCredits.used_credits + 1,
        remaining_credits: userCredits.remaining_credits - 1,
        last_updated: new Date().toISOString()
      };

      setUserCredits(updatedCredits);
      localStorage.setItem('vistoria_credits', JSON.stringify({
        ...updatedCredits,
        user_id: user.id
      }));

      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      setError('Erro ao usar crédito');
      return false;
    }
  }, [user, userCredits]);

  // Add credits (after purchase)
  const addCredits = useCallback(async (credits: number): Promise<boolean> => {
    if (!user || !userCredits) return false;

    try {
      const updatedCredits: UserCredits = {
        ...userCredits,
        total_credits: userCredits.total_credits + credits,
        remaining_credits: userCredits.remaining_credits + credits,
        last_updated: new Date().toISOString()
      };

      setUserCredits(updatedCredits);
      localStorage.setItem('vistoria_credits', JSON.stringify({
        ...updatedCredits,
        user_id: user.id
      }));

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      setError('Erro ao adicionar créditos');
      return false;
    }
  }, [user, userCredits]);

  // Check if user can perform action (requires credit)
  const canUseCredit = useCallback((): boolean => {
    return userCredits ? userCredits.remaining_credits > 0 : false;
  }, [userCredits]);

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