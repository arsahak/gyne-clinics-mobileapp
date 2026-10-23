import { api, type ApiResult } from "@/lib/api";
import { doctorProfileBody } from "@/lib/account";
import type { DoctorSchedule } from "@/lib/availability";
import { hueFor } from "@/lib/chat";
import type { Availability, Doctor, DoctorMessaging, DoctorProfileDraft, DoctorVerificationStatus, Review } from "@/lib/types";

// Doctors: the directory patients browse, reviews, booked times, and the
// signed-in doctor's own profile and schedule. Same calls and shapes as the
// webapp (lib/services/doctors.ts, app/actions/doctorAction.ts).

interface BackendDoctor {
  _id: string;
  user?: { fullName?: string; avatar?: string };
  title?: string;
  specialization?: string;
  focusAreas?: string[];
  qualifications?: string[];
  experienceYears?: number;
  registrationNumber?: string;
  clinic?: string;
  city?: string;
  country?: string;
  languages?: string[];
  about?: string;
  feeGBP?: number;
  schedule?: DoctorSchedule;
  messaging?: DoctorMessaging;
  isOnline?: boolean;
  rating?: number;
  reviewCount?: number;
  consultationCount?: number;
  recommended?: boolean;
}


/** Online now, working today, working later this week, or away. */
function availabilityFor(doctor: BackendDoctor): Availability {
  if (doctor.isOnline) return "online";
  const weekly = doctor.schedule?.weekly ?? [];
  const today = (new Date().getDay() + 6) % 7; // Monday = 0
  if (weekly[today]?.length) return "today";
  if (weekly.some((day, index) => index > today && day.length)) return "this_week";
  return "away";
}

function toDoctor(d: BackendDoctor): Doctor {
  return {
    id: d._id,
    name: d.user?.fullName || "Doctor",
    title: d.title ?? "",
    specialization: d.specialization ?? "",
    focusAreas: d.focusAreas ?? [],
    qualifications: d.qualifications ?? [],
    experienceYears: d.experienceYears ?? 0,
    rating: d.rating ?? 0,
    reviewCount: d.reviewCount ?? 0,
    consultations: d.consultationCount ?? 0,
    languages: d.languages ?? [],
    availability: availabilityFor(d),
    // Matches the 12-hour reply guarantee in lib/consultation.ts.
    responseTime: "within 12 hours",
    feeGBP: d.feeGBP ?? 0,
    about: d.about ?? "",
    registrationNumber: d.registrationNumber ?? "",
    clinic: d.clinic ?? "",
    city: d.city ?? "",
    country: d.country ?? "",
    hue: hueFor(d._id),
    avatar: d.user?.avatar || undefined,
    recommended: d.recommended,
    schedule: d.schedule,
    messaging: { free: Boolean(d.messaging?.free), consultation: d.messaging?.consultation ?? true },
  };
}

/** Approved, active doctors. Recommended first, then best rated. */
export async function getDoctors(): Promise<ApiResult<Doctor[]>> {
  const result = await api<BackendDoctor[]>("/doctors/directory");
  return result.ok ? { ...result, data: (result.data ?? []).map(toDoctor) } : result;
}

/** One approved, active doctor, or undefined if not found (or not approved / blocked). */
export async function getDoctor(id: string): Promise<Doctor | undefined> {
  if (!/^[a-f\d]{24}$/i.test(id)) return undefined;
  const result = await api<BackendDoctor>(`/doctors/directory/${id}`);
  return result.ok && result.data ? toDoctor(result.data) : undefined;
}

/** The signed-in patient's own review of a doctor (shown even while it waits for a check). */
export interface MyReview {
  id: string;
  rating: number;
  text: string;
  status: "published" | "held" | "hidden";
  date: string;
}

interface BackendReview {
  _id: string;
  rating: number;
  text: string;
  createdAt: string;
  author?: string;
  status?: MyReview["status"];
}

/** A doctor's published reviews (GET /reviews/doctor/:id), plus your own. Authors are anonymous. */
export async function getDoctorReviews(doctorId: string): Promise<{ reviews: Review[]; mine: MyReview | null }> {
  if (!/^[a-f\d]{24}$/i.test(doctorId)) return { reviews: [], mine: null };
  const result = await api<{ reviews: BackendReview[]; mine: BackendReview | null }>(`/reviews/doctor/${doctorId}?limit=50`);
  if (!result.ok || !result.data) return { reviews: [], mine: null };
  const mine = result.data.mine;
  return {
    reviews: result.data.reviews.map((r) => ({
      id: r._id,
      doctorId,
      author: r.author ?? "Verified patient",
      rating: r.rating,
      text: r.text,
      date: r.createdAt,
    })),
    mine: mine ? { id: mine._id, rating: mine.rating, text: mine.text, status: mine.status ?? "published", date: mine.createdAt } : null,
  };
}

/** Start times this doctor is already booked for (so those slots show as taken). */
export async function getBookedSlots(doctorId: string): Promise<string[]> {
  if (!/^[a-f\d]{24}$/i.test(doctorId)) return [];
  const result = await api<string[]>(`/doctors/directory/${doctorId}/booked`);
  return result.ok && result.data ? result.data : [];
}

/** Reviews a doctor after a consultation with them (once). */
export function submitReview(input: { doctorId: string; rating: number; text: string }) {
  return api("/reviews", { method: "POST", body: { doctorId: input.doctorId, rating: input.rating, text: input.text.trim() } });
}

/** Reports a doctor to the Gynex team. */
export function reportDoctor(input: { doctorId: string; reason: string; details: string }) {
  return api("/reports", { method: "POST", body: { doctorId: input.doctorId, reason: input.reason, details: input.details.trim() } });
}

// ── The signed-in doctor ────────────────────────────────────────────────────

export interface MyDoctorProfile {
  id: string;
  fullName: string;
  /** Sign-in number; can't be changed from the profile. */
  phone: string;
  /** Profile photo URL, or "". Changed with uploadAvatarAction. */
  avatar: string;
  email: string;
  title: string;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  focusAreas: string[];
  registrationNumber: string;
  registrationBody: string;
  clinic: string;
  city: string;
  country: string;
  languages: string[];
  about: string;
  feeGBP: number;
  /** Free messages and/or paid consultations. Saved straight away, not reviewed. */
  messaging: DoctorMessaging;
  verificationStatus: DoctorVerificationStatus;
  rating: number;
  reviewCount: number;
  /** Edits go live without review (registration details are always reviewed). Set by an admin. */
  autoApproveUpdates: boolean;
  /** Changes waiting for an admin. Patients see the profile above until then. */
  pendingUpdate: PendingUpdate | null;
  /** Why the last update was turned down. */
  updateRejection: { reason?: string; at: string } | null;
}

export interface PendingUpdate {
  fields: MyDoctorChanges;
  /** New photo URL, or "" to remove the photo. Absent = photo unchanged. */
  avatar?: string;
  submittedAt: string;
}

type ReadOnlyField =
  | "id"
  | "phone"
  | "avatar"
  | "verificationStatus"
  | "rating"
  | "reviewCount"
  | "autoApproveUpdates"
  | "pendingUpdate"
  | "updateRejection";

/** Fields the doctor can edit. Send only the ones that change. */
export type MyDoctorChanges = Partial<Omit<MyDoctorProfile, ReadOnlyField>>;

interface BackendMyDoctor {
  _id: string;
  user?: { fullName?: string; phone?: string; email?: string; avatar?: string };
  title?: string;
  specialization?: string;
  qualifications?: string[];
  experienceYears?: number;
  focusAreas?: string[];
  registrationNumber?: string;
  registrationBody?: string;
  clinic?: string;
  city?: string;
  country?: string;
  languages?: string[];
  about?: string;
  feeGBP?: number;
  messaging?: Partial<DoctorMessaging>;
  verificationStatus: DoctorVerificationStatus;
  rating?: number;
  reviewCount?: number;
  autoApproveUpdates?: boolean;
  pendingUpdate?: PendingUpdate | null;
  updateRejection?: { reason?: string; at: string } | null;
  inReview?: boolean;
  reverification?: boolean;
}

function toProfile(d: BackendMyDoctor): MyDoctorProfile {
  return {
    id: d._id,
    fullName: d.user?.fullName ?? "",
    phone: d.user?.phone ?? "",
    avatar: d.user?.avatar ?? "",
    email: d.user?.email ?? "",
    title: d.title ?? "",
    specialization: d.specialization ?? "",
    qualifications: d.qualifications ?? [],
    experienceYears: d.experienceYears ?? 0,
    focusAreas: d.focusAreas ?? [],
    registrationNumber: d.registrationNumber ?? "",
    registrationBody: d.registrationBody ?? "",
    clinic: d.clinic ?? "",
    city: d.city ?? "",
    country: d.country ?? "",
    languages: d.languages ?? [],
    about: d.about ?? "",
    feeGBP: d.feeGBP ?? 0,
    messaging: { free: Boolean(d.messaging?.free), consultation: d.messaging?.consultation ?? true },
    verificationStatus: d.verificationStatus,
    rating: d.rating ?? 0,
    reviewCount: d.reviewCount ?? 0,
    autoApproveUpdates: Boolean(d.autoApproveUpdates),
    pendingUpdate: d.pendingUpdate ?? null,
    updateRejection: d.updateRejection ?? null,
  };
}

/** Your own profile as patients see it, with your schedule and online status. */
export async function getMyDoctor(): Promise<(Doctor & { isOnline: boolean }) | undefined> {
  const result = await api<BackendDoctor>("/doctors/me");
  if (!result.ok || !result.data) return undefined;
  return { ...toDoctor(result.data), isOnline: Boolean(result.data.isOnline) };
}

/** Your full profile for the profile screen. */
export async function getMyDoctorProfile(): Promise<ApiResult<MyDoctorProfile>> {
  const result = await api<BackendMyDoctor>("/doctors/me");
  return result.ok ? { ...result, data: toProfile(result.data) } : result;
}

/**
 * Saves the changed fields. For an approved doctor, changes patients see wait
 * for an admin (`inReview`).
 */
export async function updateMyDoctorProfile(changes: MyDoctorChanges): Promise<ApiResult<{ profile: MyDoctorProfile; inReview: boolean; reverification: boolean }>> {
  const body = { ...changes, ...(changes.country !== undefined && { country: changes.country.trim().toUpperCase() || undefined }) };
  const result = await api<BackendMyDoctor>("/doctors/me", { method: "PATCH", body });
  if (!result.ok) return result;
  return { ...result, data: { profile: toProfile(result.data), inReview: Boolean(result.data.inReview), reverification: Boolean(result.data.reverification) } };
}

/** Onboarding: creates the doctor profile (with a first weekly schedule). */
export function saveDoctorOnboarding(draft: DoctorProfileDraft, timezone: string) {
  return api("/doctors/me", { method: "PUT", body: doctorProfileBody(draft, { includeSchedule: true, timezone }) });
}

/** Taking new chats now (shown to patients as "Online"). */
export function setOnline(isOnline: boolean) {
  return api("/doctors/me", { method: "PATCH", body: { isOnline } });
}

/** Weekly hours, slot length, booking window, notice and days off. Live straight away. */
export function saveSchedule(schedule: DoctorSchedule) {
  return api("/doctors/me", { method: "PATCH", body: { schedule } });
}
