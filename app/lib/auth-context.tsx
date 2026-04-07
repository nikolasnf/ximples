'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { tokensService } from '@/services/tokens.service';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenBalance: number;
  refreshBalance: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(0);

  const refreshBalance = useCallback(async () => {
    try {
      const balance = await tokensService.getBalance();
      setTokenBalance(balance);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ximples_token');
    const storedUser = localStorage.getItem('ximples_user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      authService.me()
        .then((result) => {
          setUser(result.user);
          setTokenBalance(result.balance);
          localStorage.setItem('ximples_user', JSON.stringify(result.user));
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('ximples_token');
          localStorage.removeItem('ximples_user');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem('ximples_token', response.token);
    localStorage.setItem('ximples_user', JSON.stringify(response.user));
    setUser(response.user);
    setTokenBalance(response.balance);
  };

  const signup = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const response = await authService.signup({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    localStorage.setItem('ximples_token', response.token);
    localStorage.setItem('ximples_user', JSON.stringify(response.user));
    setUser(response.user);
    setTokenBalance(response.balance);
  };

  const logout = () => {
    const token = localStorage.getItem('ximples_token');
    setUser(null);
    setTokenBalance(0);
    localStorage.removeItem('ximples_token');
    localStorage.removeItem('ximples_user');
    // Only call API if token exists (skip if account was deleted)
    if (token) {
      authService.logout().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      tokenBalance, refreshBalance,
      login, signup, logout,
    }}>
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
