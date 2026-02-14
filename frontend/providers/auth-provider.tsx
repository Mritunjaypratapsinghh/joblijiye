"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { auth } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const userData = await auth.me(storedToken);
          setUser(userData);
        } catch {
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    const userData = await auth.me(res.access_token);
    setUser(userData);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const res = await auth.register({ email, password, full_name: fullName });
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    const userData = await auth.me(res.access_token);
    setUser(userData);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await auth.google(credential);
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    const userData = await auth.me(res.access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
