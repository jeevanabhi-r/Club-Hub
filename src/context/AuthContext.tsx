import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Axios authorization header immediately if token is present in localStorage
const initialToken = localStorage.getItem("clubhub_token");
if (initialToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem("clubhub_token", receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      
      // Setup axios authorization headers
      axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
    } catch (error: any) {
      let msg = error.response?.data?.error || "Invalid credentials";
      if (msg && typeof msg === "object") {
        msg = msg.message || msg.error || JSON.stringify(msg);
      }
      throw new Error(typeof msg === "string" ? msg : "Invalid credentials");
    }
  };

  const register = async (data: any) => {
    try {
      const response = await axios.post("/api/auth/register", data);
      
      if (response.data.token) {
        const { token: receivedToken, user: receivedUser } = response.data;
        localStorage.setItem("clubhub_token", receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
      } else {
        // Awaiting approval, no token returned
        return response.data;
      }
    } catch (error: any) {
      let msg = error.response?.data?.error || "Registration failed";
      if (msg && typeof msg === "object") {
        msg = msg.message || msg.error || JSON.stringify(msg);
      }
      throw new Error(typeof msg === "string" ? msg : "Registration failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("clubhub_token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.post("/api/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Session expired, logging out...", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
