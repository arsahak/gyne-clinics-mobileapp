import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY_AUTH    = "@gyneclinics:logged_in";
const STORAGE_KEY_PROFILE = "@gyneclinics:profile_done";

type AuthState = {
  isLoggedIn:    boolean;
  isProfileDone: boolean;
  isLoading:     boolean;
  login:         () => Promise<void>;
  completeProfile: () => Promise<void>;
  logout:        () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn,    setLoggedIn]    = useState(false);
  const [isProfileDone, setProfileDone] = useState(false);
  const [isLoading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [auth, profile] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_AUTH),
          AsyncStorage.getItem(STORAGE_KEY_PROFILE),
        ]);
        setLoggedIn(auth === "true");
        setProfileDone(profile === "true");
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async () => {
    await AsyncStorage.setItem(STORAGE_KEY_AUTH, "true");
    setLoggedIn(true);
  };

  const completeProfile = async () => {
    await AsyncStorage.setItem(STORAGE_KEY_PROFILE, "true");
    setProfileDone(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY_AUTH, STORAGE_KEY_PROFILE]);
    setLoggedIn(false);
    setProfileDone(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isProfileDone, isLoading, login, completeProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
