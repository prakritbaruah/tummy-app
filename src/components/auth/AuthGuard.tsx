import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingScreen } from './LoadingScreen';
import { AuthNavigator } from '../../navigation/AuthNavigator';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isInitialized, loading } = useAuth();

  // Show loading screen while initializing auth state
  if (!isInitialized || loading) {
    return <LoadingScreen />;
  }

  // Show auth flow if user is not authenticated
  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  // Show protected content if user is authenticated
  return <>{children}</>;
}; 