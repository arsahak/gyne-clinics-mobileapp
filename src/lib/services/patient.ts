import { api, apiForm, type ApiResult, filePart } from "@/lib/api";
import {
  type BackendBabyGrowth,
  type BackendPeriod,
  type BackendWeight,
  DEFAULT_REMINDERS,
  type ReminderSettings,
  toBabyGrowth,
  toPeriod,
  type TrackerData,
  toWeight,
} from "@/lib/tracker";
import type { BabyGrowthEntry, PatientProfile, PeriodEntry, WeightEntry } from "@/lib/types";

// The patient's own data: health profile, tracker logs (periods, weight, baby
// growth), reminders, saved articles and profile photo. Same endpoints as
// the webapp (profileAction.ts, trackerAction.ts, lib/services/tracker.ts).

const profileBody = (profile: PatientProfile) => ({
  ...profile,
  lastPeriodStart: profile.lastPeriodStart || undefined,
  dueDate: profile.pregnancyStatus === "pregnant" ? profile.dueDate : undefined,
});

/** Onboarding and profile edit (PUT /patients/me). */
export function savePatientProfile(profile: PatientProfile) {
  return api("/patients/me", { method: "PUT", body: profileBody(profile) });
}

// ── Tracker ─────────────────────────────────────────────────────────────────

/** Periods, weights, scans and reminders. The onboarding answers are the first entries. */
export async function getTracker(): Promise<ApiResult<TrackerData>> {
  const result = await api<{ periods: BackendPeriod[]; weights: BackendWeight[]; babyGrowth: BackendBabyGrowth[]; reminders?: ReminderSettings }>("/tracker");
  if (!result.ok) return result;
  const d = result.data;
  return {
    ...result,
    data: {
      periods: d.periods.map(toPeriod),
      weights: d.weights.map(toWeight),
      babyGrowth: d.babyGrowth.map(toBabyGrowth),
      reminders: { ...DEFAULT_REMINDERS, ...d.reminders },
    },
  };
}

const mapped = <B, T>(result: ApiResult<B>, map: (b: B) => T): ApiResult<T> => (result.ok ? { ...result, data: map(result.data) } : result);

export async function addPeriod(entry: Omit<PeriodEntry, "id">) {
  return mapped(await api<BackendPeriod>("/tracker/periods", { method: "POST", body: entry }), toPeriod);
}

export async function updatePeriod(id: string, entry: Omit<PeriodEntry, "id">) {
  return mapped(await api<BackendPeriod>(`/tracker/periods/${encodeURIComponent(id)}`, { method: "PATCH", body: entry }), toPeriod);
}

export function deletePeriod(id: string) {
  return api(`/tracker/periods/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addWeight(entry: Omit<WeightEntry, "id">) {
  return mapped(await api<BackendWeight>("/tracker/weights", { method: "POST", body: entry }), toWeight);
}

export function deleteWeight(id: string) {
  return api(`/tracker/weights/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function addBabyGrowth(entry: Omit<BabyGrowthEntry, "id">) {
  return mapped(await api<BackendBabyGrowth>("/tracker/baby", { method: "POST", body: entry }), toBabyGrowth);
}

export function deleteBabyGrowth(id: string) {
  return api(`/tracker/baby/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Deletes every period, weight and scan entry. */
export function clearTracker() {
  return api("/tracker", { method: "DELETE" });
}

export function saveReminders(changes: Partial<ReminderSettings>) {
  return api<ReminderSettings>("/patients/me/reminders", { method: "PATCH", body: changes });
}

// ── Saved articles ──────────────────────────────────────────────────────────

/** Saves or un-saves a Learn article. Returns the saved slugs, newest first. */
export function setBookmark(slug: string, saved: boolean) {
  return api<string[]>(`/patients/me/bookmarks/${encodeURIComponent(slug)}`, { method: saved ? "PUT" : "DELETE" });
}

export function getBookmarks() {
  return api<string[]>("/patients/me/bookmarks");
}

// ── Profile photo (patients and doctors) ────────────────────────────────────

/** Replaces the profile photo. `inReview`: an approved doctor's photo waits for an admin. */
export async function uploadAvatar(localUri: string): Promise<ApiResult<{ avatar: string; inReview: boolean }>> {
  const form = new FormData();
  form.append("avatar", filePart(localUri, "avatar.jpg"));
  const result = await apiForm<{ avatar?: string; inReview?: boolean }>("/users/me/avatar", form, "PATCH");
  return result.ok ? { ...result, data: { avatar: result.data?.avatar ?? "", inReview: Boolean(result.data?.inReview) } } : result;
}

export function removeAvatar() {
  return api("/users/me/avatar", { method: "DELETE" });
}
