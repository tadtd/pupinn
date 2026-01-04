"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { GuestUser } from "@/lib/validators";
import {
  getGuestToken,
  getGuestUser,
  logoutGuest,
  getCurrentGuest,
} from "@/lib/guest-auth";

interface GuestAuthContextType {
  user: GuestUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(
  undefined
);

interface GuestAuthProviderProps {
  children: ReactNode;
}

export function GuestAuthProvider({ children }: GuestAuthProviderProps) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = getGuestToken();
        const storedUser = getGuestUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Optionally validate token by fetching current user
          try {
            const freshUser = await getCurrentGuest();
            setUser(freshUser);
          } catch {
            // Token invalid, clear auth
            logoutGuest();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = useCallback(() => {
    logoutGuest();
    setToken(null);
    setUser(null);
    router.push("/guest/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getCurrentGuest();
      setUser(freshUser);
    } catch {
      // Token invalid, log out
      logout();
    }
  }, [logout]);

  // Update state when localStorage changes (e.g., after login/register)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = getGuestToken();
      const storedUser = getGuestUser();
      setToken(storedToken);
      setUser(storedUser);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value: GuestAuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    logout,
    refreshUser,
  };

  return (
    <GuestAuthContext.Provider value={value}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth(): GuestAuthContextType {
  const context = useContext(GuestAuthContext);
  if (context === undefined) {
    throw new Error("useGuestAuth must be used within a GuestAuthProvider");
  }
  return context;
}

// HOC for protected guest routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function ProtectedRoute(props: P) {
    const { isAuthenticated, isLoading } = useGuestAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/guest/login");
      }
    }, [isLoading, isAuthenticated, router]);

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

    return <WrappedComponent {...props} />;
  };
}
