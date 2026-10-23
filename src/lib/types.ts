// Shared domain types. These mirror the shapes the backend API will return later,
// so swapping the mock services for real fetches should not touch the UI.

import type { DoctorSchedule } from "@/lib/availability";

export type Role = "patient" | "doctor";

/** Roles that use this web app. Staff use the admin dashboard. */
export type AppRole = Role;

export type PregnancyStatus = "not_pregnant" | "trying" | "pregnant" | "postpartum";

export interface PatientProfile {
  fullName: string;
  dateOfBirth: string; // yyyy-MM-dd
  heightCm: number;
  weightKg: number;
  typicalCycleLength: number;
  typicalPeriodLength: number;
  lastPeriodStart: string; // yyyy-MM-dd
  pregnancyStatus: PregnancyStatus;
  dueDate?: string;
}

export type DoctorVerificationStatus = "pending" | "approved" | "rejected";

/** Consultation preferences collected while a doctor creates their profile. */
export interface ConsultationAvailabilityDraft {
  /** Monday = 0 through Sunday = 6. */
  weekdays: number[];
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotMinutes: number;
  instantChat: boolean;
}

export interface DoctorProfileDraft {
  fullName: string;
  title: string;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  registrationNumber: string;
  registrationBody: string;
  clinic: string;
  city: string;
  languages: string[];
  feeGBP: number;
  consultationAvailability: ConsultationAvailabilityDraft;
  about: string;
  documents: string[];
}

export type Availability = "online" | "today" | "this_week" | "away";

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialization: string;
  focusAreas: string[];
  qualifications: string[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultations: number;
  languages: string[];
  availability: Availability;
  responseTime: string;
  feeGBP: number;
  about: string;
  registrationNumber: string;
  clinic: string;
  city: string;
  country: string;
  hue: number;
  /** Profile photo URL, if the doctor uploaded one. */
  avatar?: string;
  recommended?: boolean;
  /** Weekly hours from the backend; booking slots are generated from it. */
  schedule?: DoctorSchedule;
  /** How patients can reach the doctor. Missing = consultations only. */
  messaging?: DoctorMessaging;
}

/** Set by the doctor. At least one is on. */
export interface DoctorMessaging {
  /** Patients can message without paying. */
  free: boolean;
  /** Patients can book a paid chat consultation. */
  consultation: boolean;
}

export interface Review {
  id: string;
  doctorId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export type ArticleCategory =
  | "Periods"
  | "Fertility"
  | "Pregnancy"
  | "Menopause"
  | "Pelvic Health"
  | "Wellness"
  | "Stories";

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  format: "blog" | "guide" | "story" | "image";
  readMinutes: number;
  author: string;
  authorRole: string;
  publishedAt: string;
  cover: { from: string; to: string; icon: string };
  /** Feature image; shown instead of the gradient cover. */
  image?: string;
  sponsor?: string;
  sections: { heading?: string; body: string }[];
  /** Full text as HTML (articles from the backend, already cleaned there). Used instead of sections. */
  html?: string;
}

/** pending = waiting for review; hidden = was approved, then taken down. */
export type StoryStatus = "pending" | "approved" | "rejected" | "hidden";

/** A community story from the backend (GET /stories/feed or /stories/mine). */
export interface SubmittedStory {
  _id: string;
  title: string;
  /** Plain text; missing in the patient's own list. */
  body?: string;
  topic: ArticleCategory;
  anonymous: boolean;
  authorName?: string;
  imageUrl?: string;
  status?: StoryStatus;
  /** Why it wasn't approved; shown to the patient. */
  rejectionReason?: string;
  createdAt: string;
  publishedAt?: string;
}

export type Flow = "light" | "medium" | "heavy";

export interface PeriodEntry {
  id: string;
  start: string; // yyyy-MM-dd
  end?: string; // yyyy-MM-dd
  flow?: Flow;
  symptoms?: string[];
  note?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface BabyGrowthEntry {
  id: string;
  date: string;
  week: number; // gestational week from scan report
  weightG: number;
  lengthCm: number;
}

export interface Message {
  id: string;
  from: Role;
  text: string;
  at: string; // ISO timestamp
}

/** An ad as the backend serves it (GET /advertisements/serve), set up in the admin dashboard. */
export interface AdCreative {
  _id: string;
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  linkUrl: string;
  priceGBP?: number;
  tone: "primary" | "secondary" | "accent" | "gold";
  imageUrl?: string;
}

export type ConsultationMode = "instant" | "scheduled";

export type PaymentMethodId = "card" | "wallet" | "local";

export interface Consultation {
  id: string;
  doctorId: string;
  /** The doctor as the backend has them, so the booking still shows if they leave the directory. */
  doctor?: { name: string; title?: string; hue: number; avatar?: string };
  /** For the doctor's own list: who booked. */
  patient?: { id: string; name: string; avatar?: string };
  mode: ConsultationMode;
  concern: string;
  /** When the chat opens (now for instant, slot start for scheduled). ISO timestamp. */
  startsAt: string;
  bookedAt: string;
  /** Doctor marked it complete before the session window ended. */
  completedAt?: string;
  refundedAt?: string;
  payment: {
    amount: number;
    currency: string;
    regionId: string;
    method: PaymentMethodId | "free";
    reference: string;
    /** Human-readable instrument from Stripe, e.g. "Visa •••• 4242" or "Apple Pay · Visa •••• 4242". */
    details?: string;
    paidAt?: string;
  };
}
