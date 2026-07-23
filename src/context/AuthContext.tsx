import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { User } from "../types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

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
const getSafeInitialToken = () => {
  const t = localStorage.getItem("clubhub_token");
  if (!t || t === "undefined" || t === "null") {
    return null;
  }
  return t;
};
const initialToken = getSafeInitialToken();
if (initialToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

// Global Axios Response Interceptor to normalize all backend errors
// This guarantees that error properties of response data are always clean strings
// and completely prevents [object Object] errors in the UI.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data.error && typeof data.error === "object") {
        data.error = data.error.message || data.error.error || JSON.stringify(data.error);
      }
    }
    return Promise.reject(error);
  }
);

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

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!token || !user?.id) return;

    const targetUserId = user.id;
    const docRef = doc(db, "system_data", "database");
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.users) {
          const foundUser = data.users.find((u: any) => u.id === targetUserId);
          if (foundUser) {
            // Exclude password for safety
            const { password, ...safeUser } = foundUser;
            const resolvedUser = { ...safeUser };
            
            // Dynamically resolve assigned club name if any
            if (safeUser.role === "club_admin" && safeUser.clubId && data.clubs) {
              const assignedClub = data.clubs.find((c: any) => c.id === safeUser.clubId);
              if (assignedClub) {
                resolvedUser.clubName = assignedClub.name;
              }
            }

            // Deep comparison to prevent infinite re-renders
            const currentUser = userRef.current;
            if (JSON.stringify(resolvedUser) !== JSON.stringify(currentUser)) {
              setUser(resolvedUser);
            }
          }
        }
      }
    }, (error) => {
      console.warn("[AuthContext] Real-time user document sync connection issue (likely offline/unreachable):", error);
    });

    return () => unsubscribe();
  }, [token, user?.id]);

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
