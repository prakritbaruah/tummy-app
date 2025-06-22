import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  signUp as signUpAction, 
  signIn as signInAction, 
  signOut as signOutAction,
  resetPassword as resetPasswordAction,
  initializeAuth,
  clearError,
  setUser
} from '../store/authSlice';
import { authService } from '../services/authService';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // Initialize auth on mount
  useEffect(() => {
    if (!authState.isInitialized) {
      dispatch(initializeAuth());
    }
  }, [dispatch, authState.isInitialized]);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      dispatch(setUser(user));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  // Auth actions
  const signUp = useCallback(async (email: string, password: string) => {
    return dispatch(signUpAction({ email, password }));
  }, [dispatch]);

  const signIn = useCallback(async (email: string, password: string) => {
    return dispatch(signInAction({ email, password }));
  }, [dispatch]);

  const signOut = useCallback(async () => {
    return dispatch(signOutAction());
  }, [dispatch]);

  const resetPassword = useCallback(async (email: string) => {
    return dispatch(resetPasswordAction(email));
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: authState.isAuthenticated,
    isInitialized: authState.isInitialized,
    
    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError: clearAuthError,
  };
}; 