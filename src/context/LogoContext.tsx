import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface LogoContextType {
  logoUrl: string | null;
  loading: boolean;
  refreshLogo: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType>({
  logoUrl: null,
  loading: true,
  refreshLogo: async () => {},
});

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLogo = async () => {
    try {
      const response = await axios.get("/api/settings");
      setLogoUrl(response.data.logoUrl || null);
    } catch (error) {
      console.warn("Error reading settings API, falling back to default logo:", error);
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLogo();
  }, []);

  return (
    <LogoContext.Provider value={{ logoUrl, loading, refreshLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  return useContext(LogoContext);
}
