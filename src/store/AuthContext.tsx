import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Account, NextStep } from "@/lib/account";
import { setSessionToken, setUnauthorizedHandler } from "@/lib/api";
import { getSession, type SignedIn } from "@/lib/services/auth";
import type { AppRole } from "@/lib/types";

// The signed-in user. The login token and the last known account are kept on
// the phone so the app opens straight away; the account is then refreshed
// from the backend (GET /auth/me), so approvals and profile changes made
// elsewhere (webapp, admin dashboard) show up here too.

const STORAGE_KEY = "@gyneclinics:session";

type Stored = SignedIn;

type AuthState = {
  isLoading: boolean;
  isLoggedIn: boolean;
  token: string | null;
  role: AppRole | null;
  phone: string | null;
  account: Account | null;
  nextStep: NextStep | null;
  /** Onboarding (health or doctor profile) is done. */
  isProfileDone: boolean;
  /** Doctors: pending, approved or rejected. */
  approvalStatus: string | null;
  signIn: (session: SignedIn) => Promise<void>;
  /** Loads the account again from the backend. Returns it, or null if that failed. */
  refresh: () => Promise<Account | null>;
  /** Uses an account the backend just returned (e.g. after consent). */
  setAccount: (account: Account) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Stored | null>(null);
  const [isLoading, setLoading] = useState(true);

  const save = useCallback(async (next: Stored | null) => {
    setSessionToken(next?.token ?? null);
    setSession(next);
    try {
      if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the session still works until the app closes.
    }
  }, []);

  const logout = useCallback(() => save(null), [save]);

  // The backend refused the token (expired, or the account was blocked).
  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      let stored: Stored | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<Stored>) : null;
        // Sessions from the old app version (without an account) need a fresh sign-in.
        if (parsed?.token && parsed.account) stored = parsed as Stored;
        else if (raw) await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {
        // Unreadable: start signed out.
      }
      if (stored) {
        setSessionToken(stored.token);
        setSession(stored);
        // Fresh account in the background; offline, the saved one is used.
        const fresh = await getSession(stored.token);
        if (fresh.ok) await save({ token: stored.token, account: fresh.data });
      }
      setLoading(false);
    })();
  }, [save]);

  const refresh = useCallback(async () => {
    if (!session) return null;
    const fresh = await getSession(session.token);
    if (!fresh.ok) return null;
    await save({ token: session.token, account: fresh.data });
    return fresh.data;
  }, [session, save]);

  const value = useMemo<AuthState>(() => {
    const account = session?.account ?? null;
    return {
      isLoading,
      isLoggedIn: Boolean(session),
      token: session?.token ?? null,
      role: account?.role ?? null,
      phone: account?.phone ?? null,
      account,
      nextStep: account?.nextStep ?? null,
      isProfileDone: Boolean(account) && account!.nextStep !== "onboarding",
      approvalStatus: account?.doctorStatus ?? null,
      signIn: (next) => save(next),
      refresh,
      setAccount: async (next) => {
        if (session) await save({ token: session.token, account: next });
      },
      logout,
    };
  }, [session, isLoading, save, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

/** The screen for where the account is in sign-up: onboarding, consent, waiting for approval, or home. */
export function routeForAccount(account: Account | null) {
  if (!account) return "/login" as const;
  const step = account.nextStep;
  if (account.role === "doctor") {
    if (step === "onboarding" || step === "consent") return "/doctor-profile" as const;
    if (step === "verification_pending" || step === "verification_rejected") return "/doctor-pending" as const;
    return "/(doctor-tabs)/home" as const;
  }
  if (step === "onboarding" || step === "consent") return "/health-profile" as const;
  return "/(tabs)" as const;
}
