"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db } from "./tauri-db";

export interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  isDbConnected: boolean;
  refreshDbStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

    // Check DB Status
    const checkDb = async () => {
      try {
        const connected = await db.getDbStatus();
        setIsDbConnected(connected);
      } catch (err) {
        setIsDbConnected(false);
      }
    };

    const refreshDbStatus = async () => {
      await checkDb();
    };

  useEffect(() => {
    // Load user from local storage on mount (since it's a desktop app, localStorage is fine)
    const storedUser = localStorage.getItem("tracker_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    checkDb().finally(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    // Basic route protection
    if (!isLoading) {
      // If DB is not connected and we aren't already on setup, go to setup
      if (!isDbConnected && pathname !== "/setup") {
        router.push("/setup");
        return;
      }

      // If DB is connected and we are on setup, go to main or login
      if (isDbConnected && pathname === "/setup") {
        router.push(user ? "/" : "/login");
        return;
      }

      const isAuthRoute = pathname === "/login" || pathname === "/register";
      if (!user && !isAuthRoute && pathname !== "/setup") {
        router.push("/login"); // Redirect to login if not authenticated
      } else if (user && isAuthRoute) {
        router.push("/"); // Redirect away from login/register if already authenticated
      }
    }
  }, [user, isLoading, isDbConnected, pathname, router]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("tracker_user", JSON.stringify(userData));
    router.push("/");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tracker_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isDbConnected, refreshDbStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
