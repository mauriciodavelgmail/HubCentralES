'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChange, getCurrentUser, getUserProfile, AuthUser, UserProfile } from './auth';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.id);
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            user_metadata: currentUser.user_metadata,
          });
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen to auth changes
    const { data: subscription } = onAuthStateChange((authUser, userProfile) => {
      setUser(authUser);
      setProfile(userProfile);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
