import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('🔍 fetchProfile: Iniciando busca do perfil para userId:', userId);
    try {
      // Add a timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });
      
      const fetchPromise = supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      console.log('📊 fetchProfile: Resultado da busca:', { data, error });
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.warn('⚠️ fetchProfile: Erro na busca, usando perfil vazio:', error);
        setProfile(null);
      } else {
        console.log('✅ fetchProfile: Perfil encontrado:', data);
        setProfile(data ?? null);
      }
    } catch (e) {
      console.warn("⚠️ fetchProfile: Erro inesperado, continuando sem perfil:", e);
      setProfile(null);
    }
    console.log('🏁 fetchProfile: Finalizando busca do perfil');
  }, []);

  useEffect(() => {
    const getSession = async () => {
      console.log('🔍 AuthContext: Iniciando getSession...');
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log('📊 AuthContext: getSession resultado:', { 
          hasSession: !!data.session,
          userId: data.session?.user?.id,
          error 
        });
        
        const currentUser = data.session?.user ?? null;
        setSession(data.session);
        setUser(currentUser);
        
        if (currentUser) {
          console.log('✅ AuthContext: Usuário encontrado, buscando perfil...');
          await fetchProfile(currentUser.id);
          console.log('📝 AuthContext: Perfil carregado, finalizando loading');
        } else {
          console.log('❌ AuthContext: Nenhum usuário encontrado');
          setProfile(null);
        }
      } catch (err) {
        console.error('💥 AuthContext: Erro no getSession:', err);
      } finally {
        console.log('🏁 AuthContext: Finalizando loading');
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`🔄 AuthContext: onAuthStateChange - ${event}`, {
          hasSession: !!newSession,
          userId: newSession?.user?.id
        });
        
        const currentUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(currentUser);
        
        if (currentUser) {
          console.log('✅ AuthContext: Usuário autenticado, buscando perfil...');
          try {
            await fetchProfile(currentUser.id);
            console.log('📝 AuthContext: Perfil carregado com sucesso');
          } catch (error) {
            console.warn('⚠️ AuthContext: Erro ao buscar perfil, continuando sem perfil:', error);
            setProfile(null);
          }
        } else {
          console.log('❌ AuthContext: Usuário deslogado');
          setProfile(null);
        }
        console.log('🏁 AuthContext: Estado atualizado, setLoading(false)');
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = {
    user,
    session,
    profile,
    loading,
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
