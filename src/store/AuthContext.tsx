import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@gyneclinics:session";

type Role = "patient" | "doctor";

type Session = {
  accessToken: string;
  role: Role;
  phone: string;
  profileCompleted: boolean;
  approvalStatus?: string;
};

type AuthState = {
  isLoggedIn: boolean;
  isProfileDone: boolean;
  isLoading: boolean;
  token: string | null;
  role: Role | null;
  phone: string | null;
  approvalStatus: string | null;
  login: (session: Session) => Promise<void>;
  completeProfile: () => Promise<void>;
  setApprovalStatus: (status: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSession(JSON.parse(raw));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (next: Session) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  };

  const completeProfile = async () => {
    if (!session) return;
    const next = { ...session, profileCompleted: true };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  };

  const setApprovalStatus = async (status: string) => {
    if (!session) return;
    const next = { ...session, approvalStatus: status };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!session,
        isProfileDone: session?.profileCompleted ?? false,
        isLoading,
        token: session?.accessToken ?? null,
        role: session?.role ?? null,
        phone: session?.phone ?? null,
        approvalStatus: session?.approvalStatus ?? null,
        login,
        completeProfile,
        setApprovalStatus,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
