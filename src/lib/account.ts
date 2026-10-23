import type {
  AppRole,
  ConsultationAvailabilityDraft,
  DoctorProfileDraft,
  DoctorVerificationStatus,
  PatientProfile,
  PregnancyStatus,
} from "@/lib/types";

// The signed-in account, as the UI uses it. Built on the server from the
// backend's /auth/me response and passed to client components.

export type NextStep = "onboarding" | "consent" | "verification_pending" | "verification_rejected" | "home";

export interface Account {
  id: string;
  fullName: string;
  phone: string;
  /** Profile photo URL, or "" for initials. */
  avatar: string;
  role: AppRole;
  consentAt: string | null;
  patient: PatientProfile | null;
  doctor: DoctorProfileDraft | null;
  doctorStatus: DoctorVerificationStatus | null;
  /** Patient: slugs of saved Learn articles, newest first. */
  bookmarks: string[];
  nextStep: NextStep;
}

export const HOME: Record<AppRole, string> = { patient: "/patient", doctor: "/doctor" };

/** The page for a backend `nextStep`. */
export function pathForStep(role: AppRole, step: NextStep) {
  switch (step) {
    case "onboarding":
      return `/onboarding/${role}`;
    case "consent":
      return "/consent";
    case "verification_pending":
    case "verification_rejected":
      return "/doctor/pending";
    default:
      return HOME[role];
  }
}

// ── Backend shapes (only the fields the UI reads) ───────────────────────────

interface TimeRange {
  start: string;
  end: string;
}

export interface BackendSession {
  user: { _id: string; fullName: string; phone?: string; avatar?: string; role: string; consentAt?: string | null };
  profile: Record<string, unknown> | null;
  nextStep: NextStep;
}

const day = (value: unknown) => (typeof value === "string" ? value.slice(0, 10) : "");

function toPatient(fullName: string, p: Record<string, unknown>): PatientProfile {
  return {
    fullName,
    dateOfBirth: day(p.dateOfBirth),
    heightCm: Number(p.heightCm ?? 0),
    weightKg: Number(p.weightKg ?? 0),
    typicalCycleLength: Number(p.typicalCycleLength ?? 28),
    typicalPeriodLength: Number(p.typicalPeriodLength ?? 5),
    lastPeriodStart: day(p.lastPeriodStart),
    pregnancyStatus: (p.pregnancyStatus as PregnancyStatus) ?? "not_pregnant",
    dueDate: day(p.dueDate) || undefined,
  };
}

/** The webapp's simple "days + hours" availability from the backend's weekly schedule. */
function toAvailability(schedule: Record<string, unknown> | undefined): ConsultationAvailabilityDraft {
  const weekly = (schedule?.weekly as TimeRange[][] | undefined) ?? [];
  const ranges = weekly.flat();
  return {
    weekdays: weekly.flatMap((ranges, index) => (ranges.length ? [index] : [])),
    startTime: ranges.map((r) => r.start).sort()[0] ?? "09:00",
    endTime: ranges.map((r) => r.end).sort().at(-1) ?? "17:00",
    slotMinutes: Number(schedule?.slotMinutes ?? 30),
    instantChat: schedule?.instantChat !== false,
  };
}

function toDoctor(fullName: string, d: Record<string, unknown>): DoctorProfileDraft {
  const documents = (d.documents as Array<{ name: string }> | undefined) ?? [];
  return {
    fullName,
    title: String(d.title ?? ""),
    specialization: String(d.specialization ?? ""),
    qualifications: (d.qualifications as string[]) ?? [],
    experienceYears: Number(d.experienceYears ?? 0),
    registrationNumber: String(d.registrationNumber ?? ""),
    registrationBody: String(d.registrationBody ?? ""),
    clinic: String(d.clinic ?? ""),
    city: String(d.city ?? ""),
    languages: (d.languages as string[]) ?? [],
    feeGBP: Number(d.feeGBP ?? 0),
    consultationAvailability: toAvailability(d.schedule as Record<string, unknown> | undefined),
    about: String(d.about ?? ""),
    documents: documents.map((doc) => doc.name),
  };
}

export function toAccount(session: BackendSession): Account {
  const { user, profile, nextStep } = session;
  const role = user.role as AppRole;
  return {
    id: user._id,
    fullName: user.fullName,
    phone: user.phone ?? "",
    avatar: user.avatar ?? "",
    role,
    consentAt: user.consentAt ?? null,
    patient: role === "patient" && profile ? toPatient(user.fullName, profile) : null,
    doctor: role === "doctor" && profile ? toDoctor(user.fullName, profile) : null,
    doctorStatus: role === "doctor" && profile ? (profile.verificationStatus as DoctorVerificationStatus) : null,
    bookmarks: role === "patient" && Array.isArray(profile?.bookmarks) ? (profile.bookmarks as string[]) : [],
    nextStep,
  };
}

/**
 * Request body for PUT /doctors/me. Only onboarding sends the schedule; a
 * profile edit leaves the schedule saved on the backend untouched.
 */
export function doctorProfileBody(
  draft: DoctorProfileDraft,
  { includeSchedule = false, timezone = "Europe/London" }: { includeSchedule?: boolean; timezone?: string } = {},
) {
  const a = draft.consultationAvailability;
  return {
    fullName: draft.fullName,
    title: draft.title,
    specialization: draft.specialization,
    qualifications: draft.qualifications,
    experienceYears: draft.experienceYears,
    registrationNumber: draft.registrationNumber,
    registrationBody: draft.registrationBody,
    clinic: draft.clinic,
    city: draft.city,
    languages: draft.languages,
    about: draft.about,
    feeGBP: draft.feeGBP,
    ...(includeSchedule && {
      schedule: {
        weekly: Array.from({ length: 7 }, (_, index) =>
          a.weekdays.includes(index) ? [{ start: a.startTime, end: a.endTime }] : [],
        ),
        slotMinutes: a.slotMinutes,
        instantChat: a.instantChat,
        timezone,
      },
    }),
  };
}
