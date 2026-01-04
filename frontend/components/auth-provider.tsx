'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LoginResponse,
  getStoredUser,
  getAuthToken,
  login as authLogin,
  logout as authLogout,
  isAuthenticated as checkAuth,
} from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isReceptionist: boolean;
  isCleaner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getAuthToken();
    
    if (storedUser && token) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username,
        password,
      });
      
      authLogin(response.data);
      setUser(response.data.user);
      const role = response.data.user.role;
      if (role === 'admin') {
        router.push('/staff/admin/dashboard');
      } else if (role === 'receptionist') {
        router.push('/staff/receptionist/dashboard');
      } else if (role === 'cleaner') {
        router.push('/staff/cleaner/dashboard');
      }
      else {
        router.push('/staff/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    router.push('/staff/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    isAuthenticated: checkAuth() && user !== null,
    isLoading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isReceptionist: user?.role === 'receptionist',
    isCleaner: user?.role === 'cleaner',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider'); 
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: 'admin' | 'receptionist' | 'cleaner'
) {
  return function ProtectedRoute(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      }
      
      if (!isLoading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
        // User doesn't have required role
        router.push('/');
      }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (requiredRole && user?.role !== requiredRole) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

