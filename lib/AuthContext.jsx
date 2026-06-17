"use client"

import React, { createContext, useContext } from 'react';
import { useConvexAuth, useAuthActions } from '@convex-dev/auth/react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  const logout = async (shouldRedirect = true) => {
    await signOut();
    if (shouldRedirect) {
      window.location.href = "/";
    }
  };

  const navigateToLogin = () => {
    window.location.href = `/login?from=${encodeURIComponent(window.location.href)}`;
  };

  const checkAuth = async () => isAuthenticated;

  return (
    <AuthContext.Provider value={{
      user: null,
      isAuthenticated,
      isLoadingAuth: isLoading,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked: !isLoading,
      logout,
      navigateToLogin,
      checkUserAuth: checkAuth,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
