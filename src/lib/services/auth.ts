import { type Account, type BackendSession, toAccount } from "@/lib/account";
import { api, type ApiResult } from "@/lib/api";
import type { AppRole } from "@/lib/types";

// Sign-in and the account: same flow as the webapp (authAction.ts).
//   1. sendOtp → the backend texts a code
//   2. verifyOtp → known number: signed in; new number: a signup token
//   3. register (new numbers) → patient or doctor is chosen, the account is created
// Then `nextStep` says where to go: onboarding, consent, waiting for
// verification (doctors) or home.

export type SignedIn = { token: string; account: Account };

const E164 = /^\+[1-9]\d{7,14}$/;

export async function sendOtp(phone: string): Promise<ApiResult<{ phone: string }>> {
  const normalized = phone.replace(/[\s().-]/g, "");
  if (!E164.test(normalized)) return { ok: false, status: 422, message: "Please enter a valid mobile number." };
  const result = await api("/auth/otp/send", { method: "POST", body: { phone: normalized }, token: null });
  return result.ok ? { ...result, data: { phone: normalized } } : result;
}

type VerifyData = { isNewUser: true; phone: string; signupToken: string } | ({ isNewUser: false; token: string } & BackendSession);

export type Verified = { kind: "signedIn"; session: SignedIn } | { kind: "newUser"; phone: string; signupToken: string };

/**
 * Checks the code. A known number signs in with the role it has; a new
 * number gets a signup token to create the account with (see register).
 */
export async function verifyOtp(phone: string, code: string): Promise<ApiResult<Verified>> {
  const result = await api<VerifyData>("/auth/otp/verify", { method: "POST", body: { phone, code }, token: null });
  if (!result.ok) return result;
  const data = result.data;
  if (data.isNewUser) return { ...result, data: { kind: "newUser", phone: data.phone, signupToken: data.signupToken } };

  const role = data.user.role;
  if (role !== "patient" && role !== "doctor") {
    return { ok: false, status: 403, message: "This number belongs to an account that can't use the patient and doctor app." };
  }
  return { ...result, data: { kind: "signedIn", session: { token: data.token, account: toAccount(data) } } };
}

/** Creates the account for a verified new number. The name is asked in onboarding. */
export async function register(signupToken: string, role: AppRole): Promise<ApiResult<SignedIn>> {
  const created = await api<{ token: string } & BackendSession>("/auth/register", {
    method: "POST",
    body: { signupToken, role },
    token: null,
  });
  if (!created.ok) return created;
  return { ...created, data: { token: created.data.token, account: toAccount(created.data) } };
}

/** The signed-in account, fresh from the backend (GET /auth/me). */
export async function getSession(token?: string): Promise<ApiResult<Account>> {
  const result = await api<BackendSession>("/auth/me", token ? { token } : {});
  return result.ok ? { ...result, data: toAccount(result.data) } : result;
}

/** Records the disclaimer and data consent. Returns the updated account. */
export async function acceptConsent(): Promise<ApiResult<Account>> {
  const result = await api<BackendSession>("/auth/consent", { method: "POST" });
  return result.ok ? { ...result, data: toAccount(result.data) } : result;
}

/** Deletes the account and everything in it. */
export function deleteAccount() {
  return api("/users/me", { method: "DELETE" });
}
