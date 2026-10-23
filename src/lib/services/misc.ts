import { api, type ApiResult } from "@/lib/api";
import { AD_SLOTS, type AdSlot, type ServedAds } from "@/lib/ads";
import type { RegionId } from "@/lib/locale/regions";
import { type BackendNotification, type InboxItem, toInboxItem } from "@/lib/notifications";

// Notifications, ads, regional prices, earnings and the test video call.
// Same endpoints as the webapp.

// ── Notifications ───────────────────────────────────────────────────────────

export async function getMyNotifications(limit = 50): Promise<ApiResult<{ items: InboxItem[]; unread: number }>> {
  const result = await api<{ notifications: BackendNotification[]; unread: number }>(`/notifications/mine?limit=${limit}`);
  return result.ok ? { ...result, data: { items: result.data.notifications.map(toInboxItem), unread: result.data.unread } } : result;
}

export async function getUnreadCount(): Promise<number | null> {
  const result = await api<{ unread: number }>("/notifications/mine?limit=1");
  return result.ok ? result.data.unread : null;
}

export function markNotificationRead(id: string) {
  return api(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return api("/notifications/read-all", { method: "PATCH" });
}

// ── Ads (set up in the admin dashboard) ─────────────────────────────────────

/** The live ad for each slot. Ads are optional: on any error, none. */
export async function getServedAds(slots: AdSlot[] = AD_SLOTS): Promise<ServedAds> {
  const result = await api<ServedAds>(`/advertisements/serve?slots=${slots.join(",")}`);
  return result.ok && result.data ? result.data : {};
}

/** Counts a view or a click. Best effort. */
export function trackAd(id: string, event: "impression" | "click") {
  if (!/^[a-f\d]{24}$/i.test(id)) return;
  void api(`/advertisements/${id}/track`, { method: "POST", body: { event } });
}

// ── Regional prices (Fees & Commission) ─────────────────────────────────────

export async function getPricing(): Promise<Partial<Record<RegionId, number>> | null> {
  const result = await api<{ regions: { id: RegionId; multiplier: number }[] }>("/settings/pricing", { token: null });
  return result.ok ? Object.fromEntries(result.data.regions.map((r) => [r.id, r.multiplier])) : null;
}

// ── Doctor earnings ─────────────────────────────────────────────────────────

export interface StripeStatus {
  status: "not_connected" | "incomplete" | "review" | "ready";
  destination: string | null;
  requirementsDue: number;
  disabledReason?: string | null;
}

export interface Earnings {
  balance: {
    clearingGBP: number;
    clearedGBP: number;
    requestedGBP: number;
    paidOutGBP: number;
    availableGBP: number;
    lifetimeGBP: number;
    consultations: number;
  };
  minWithdrawalGBP: number;
  payoutSchedule: "on_request" | "weekly";
  stripe: StripeStatus;
  withdrawals: {
    _id: string;
    amountGBP: number;
    status: "requested" | "processing" | "paid" | "rejected";
    createdAt: string;
    paidAt?: string;
    rejectionReason?: string;
    destination: string;
  }[];
}

export function getMyEarnings() {
  return api<Earnings>("/payouts/me");
}

/** A link to Stripe's sign-up form (or the doctor's Stripe dashboard once set up). */
export function stripeLink(returnUrl: string) {
  return api<{ url: string; kind: "onboarding" | "dashboard" }>("/payouts/me/stripe", { method: "POST", body: { returnUrl } });
}

export function requestWithdrawal(amountGBP: number) {
  return api("/payouts/me/withdraw", { method: "POST", body: { amountGBP } });
}

// ── Video ───────────────────────────────────────────────────────────────────

export interface TestCallTicket {
  token: string;
  roomName: string;
  maxMinutes: number;
}

/** A Twilio Video token for the shared 30-minute test room. */
export function joinTestCall() {
  return api<TestCallTicket>("/video/test-call", { method: "POST" });
}
