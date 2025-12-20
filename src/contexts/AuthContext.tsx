import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SignUpResult {
  error: AuthError | null;
  needsEmailConfirmation: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  
  // Track the user ID for the current profile load to prevent stale data from overwriting
  // when a user logs out and a new user logs in quickly
  const activeProfileLoadUserIdRef = useRef<string | null>(null);

  /**
   * Loads the user's display name from the profiles table.
   * Only updates state if the user hasn't changed since the load started.
   */
  const loadProfileForUser = async (targetUser: User | null) => {
    if (!targetUser) {
      setDisplayName(null);
      activeProfileLoadUserIdRef.current = null;
      return;
    }

    // Mark this load as active for this user
    const targetUserId = targetUser.id;
    activeProfileLoadUserIdRef.current = targetUserId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single();

      // Only update if this user is still the active user (prevent stale data from
      // previous user overwriting new user's profile)
      if (activeProfileLoadUserIdRef.current !== targetUserId) {
        return;
      }

      if (error) {
        console.error('Error loading profile:', error);
        // On error, set displayName to null to indicate we couldn't load the profile
        // This is safer than leaving stale data
        setDisplayName(null);
        return;
      }

      // Use the profile name if available, otherwise fall back to null
      // Profiles table is the source of truth
      const profileName = data?.full_name?.trim() || null;
      setDisplayName(profileName);
    } catch (err) {
      console.error('Error loading profile:', err);
      
      // Only update if this user is still the active user (prevent stale exceptions from
      // previous user overwriting new user's profile)
      if (activeProfileLoadUserIdRef.current !== targetUserId) {
        return;
      }
      
      // On unexpected exception (network error, etc.), set displayName to null
      // This ensures we don't display stale data if the profile load failed
      setDisplayName(null);
    }
  };

  /**
   * Handles auth state changes: updates user state and loads their profile.
   */
  const handleAuthStateChange = (session: Session | null) => {
    const nextUser = session?.user ?? null;
    setSession(session);
    setUser(nextUser);
    void loadProfileForUser(nextUser);
    setLoading(false);
  };

  useEffect(() => {
    // Load initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://www.trytummy.com/account-confirmed',
      },
    });
    
    // If there's no error but also no session, email confirmation is likely required
    const needsEmailConfirmation = !error && !data.session;
    
    return { 
      error,
      needsEmailConfirmation,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  /**
   * Updates the user's display name in both auth metadata and profiles table.
   * After updating, reloads from the profiles table to ensure we display the actual value.
   */
  const updateDisplayName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty');
    }

    if (!user?.id) {
      throw new Error('No user logged in');
    }

    // Update auth metadata (for Supabase auth user object)
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });

    if (authError) {
      throw authError;
    }

    // Update the user object if auth returned a new one
    const updatedUser = authData.user ?? user;
    if (authData.user) {
      setUser(authData.user);
    }

    // Persist to profiles table (source of truth for display name)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile record:', profileError);
      throw new Error('Failed to update profile');
    }

    // Reload from profiles table to get the actual value from the database
    // This ensures we never display stale information
    await loadProfileForUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    displayName,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
