import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  full_name: string | null;
  company_name: string | null;
  company_logo_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // VERSÃO 2025-09-12 CORRIGIDA - Se você ainda vê mensagens antigas, limpe o cache!
    console.info('🆕 AuthContext v2 - fetchProfile desabilitado para correção de loop');
    return;
    
    /* CÓDIGO ORIGINAL COMENTADO PARA DEBUG
    try {
      // Timeout reduzido para 8 segundos para evitar loops infinitos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na busca do perfil')), 8000);
      });
      
      const queryPromise = supabase
        .from('profiles')
        .select('full_name, company_name, company_logo_url')
        .eq('id', userId)
        .single();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Erro ao buscar perfil, mantendo dados anteriores:', error);
        // Tentar recuperar do localStorage como fallback apenas uma vez
        const savedProfile = localStorage.getItem(`profile_${userId}`);
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
        return; // Sair da função para evitar loop
      } else {
        const newProfile = data ?? null;
        setProfile(newProfile);
        
        // Salvar no localStorage para persistência
        if (newProfile) {
          localStorage.setItem(`profile_${userId}`, JSON.stringify(newProfile));
        }
      }
    } catch (e) {
      console.warn('Timeout ou erro na busca do perfil, mantendo dados anteriores:', e);
      // Tentar recuperar do localStorage como fallback apenas uma vez
      const savedProfile = localStorage.getItem(`profile_${userId}`);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      return; // Sair da função para evitar loop
    }
    */
  }, []); // REMOVIDO dependência [profile] que estava causando loop infinito

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user ?? null;
        setSession(data.session);
        setUser(currentUser);
        
        if (currentUser) {
          // Carregar dados do localStorage primeiro para não deixar interface vazia
          const savedProfile = localStorage.getItem(`profile_${currentUser.id}`);
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
          }
          
          // TEMPORARIAMENTE DESABILITADO para parar o loop
          // await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error getting session:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const currentUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(currentUser);
        
        if (currentUser) {
          // Apenas carregar do localStorage para evitar loops
          const savedProfile = localStorage.getItem(`profile_${currentUser.id}`);
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // REMOVIDO [fetchProfile] para quebrar o loop definitivamente

  const value = {
    user,
    session,
    profile,
    loading,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
