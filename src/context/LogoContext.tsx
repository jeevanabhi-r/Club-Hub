import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

interface LogoContextType {
  logoUrl: string | null;
  loading: boolean;
}

const LogoContext = createContext<LogoContextType>({ logoUrl: null, loading: true });

export function LogoProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "settings", "website");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setLogoUrl(docSnap.data().logoUrl || null);
        } else {
          setLogoUrl(null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Error reading settings document, falling back to default logo:", error);
        setLogoUrl(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <LogoContext.Provider value={{ logoUrl, loading }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  return useContext(LogoContext);
}
