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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
    } catch (e) {
      console.error("Unexpected error while fetching profile:", e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 3000); // 3 seconds timeout

    // onAuthStateChange is the single source of truth.
    // It fires once on initial load and then on every auth event.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('AuthContext: onAuthStateChange event:', event, 'session:', newSession?.user?.id);
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId);
        
        try {
          const currentUser = newSession?.user ?? null;
          console.log('AuthContext: Setting user:', currentUser?.id);
          setSession(newSession);
          setUser(currentUser);

          if (currentUser) {
            console.log('AuthContext: Fetching profile for user:', currentUser.id);
            await fetchProfile(currentUser.id);
          } else {
            console.log('AuthContext: No user, clearing profile');
            setProfile(null);
          }
        } catch (e) {
          console.error("Error in onAuthStateChange handler:", e);
          // Reset state on error to prevent inconsistent UI
          setUser(null);
          setSession(null);
          setProfile(null);
        } finally {
          // This GUARANTEES that loading is set to false after the initial check,
          // preventing the infinite loading screen.
          console.log('AuthContext: Setting loading to false');
          setLoading(false);
        }
      }
    );

    return () => {
      // Clear timeout on cleanup
      clearTimeout(timeoutId);
      // Safely unsubscribe
      authListener?.subscription.unsubscribe();
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
