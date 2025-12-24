import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../config/api';

interface Shop {
  id: string;
  name: string;
  type: string;
  categories?: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  termsAccepted: boolean;
  ownedShops: Shop[];
  shopMemberships: { shop: Shop; role: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLogin: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const verifyToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.verify();
      setUser(response.data);
      // Check if first login (no shops)
      const hasShops = response.data.ownedShops?.length > 0 || response.data.shopMemberships?.length > 0;
      setIsFirstLogin(!hasShops);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('token', token);
    await verifyToken();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsFirstLogin(false);
  };

  const refreshUser = async () => {
    await verifyToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isFirstLogin,
        login,
        logout,
        refreshUser,
      }}
    >
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
