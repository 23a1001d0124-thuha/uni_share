"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  universityName?: string;
  universityShortName?: string;
  universityCity?: string;
  studentEmail?: string;
  isStudentVerified: boolean;
  rating: number;
  reviewCount: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserDirectly: (updatedUser: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync token from localStorage on boot
  useEffect(() => {
    const storedToken = localStorage.getItem("unishare_token");
    if (storedToken) {
      setToken(storedToken);
      bootstrapUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const bootstrapUser = async (authToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        // Token might have expired
        logout();
      }
    } catch (err) {
      console.error("Failed to bootstrap user from stored token:", err);
      // Attempt login fallback representation if offline
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success && data.token && data.user) {
        localStorage.setItem("unishare_token", data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message || "Đăng nhập thành công!" };
      } else {
        return { success: false, message: data.message || "Thông tin đăng nhập không hợp lệ!" };
      }
    } catch (err: any) {
      console.error("Login API error:", err);
      return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại!" };
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, displayName })
      });
      const data = await response.json();
      if (data.success) {
        return await login(email, password);
      }
      return {
        success: false,
        message: data.message || "Registration failed."
      };
    } catch (err: any) {
      console.error("Register API error:", err);
      return { success: false, message: "Không thể kết nối kết nối máy chủ để đăng ký!" };
    }
  };

  const logout = () => {
    localStorage.removeItem("unishare_token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const activeToken = token || localStorage.getItem("unishare_token");
    if (!activeToken) return;

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Failed to refresh user profile data:", err);
    }
  };

  const updateUserDirectly = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        token,
        login,
        register,
        logout,
        refreshUser,
        updateUserDirectly
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
