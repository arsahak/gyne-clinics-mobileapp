import { addDays, addHours } from "date-fns";
import { slotsFor, type DoctorSchedule } from "@/lib/availability";
import type { Availability, Consultation, Doctor, DoctorMessaging } from "@/lib/types";

/**
 * Each doctor chooses how patients reach them (`Doctor.messaging`):
 * - free messages: patients chat without booking;
 * - consultation: patients book (and pay, unless the fee is 0), the chat opens
 *   for the session, then stays open for free follow-up on the same concern.
 * A doctor can offer one or both.
 */
/** Who a consultation is with. `listed` = the doctor is still in the directory (profile and chat open). */
export interface ConsultationDoctor {
  id: string;
  name: string;
  title?: string;
  hue: number;
  avatar?: string;
  listed: boolean;
}

/** The doctor for a booking: from the directory, else as the backend has them on the booking. */
export function consultationDoctor(c: Consultation, doctors: Doctor[]): ConsultationDoctor {
  const listed = doctors.find((d) => d.id === c.doctorId);
  if (listed) return { id: listed.id, name: listed.name, title: listed.title, hue: listed.hue, avatar: listed.avatar, listed: true };
  const saved = c.doctor;
  return { id: c.doctorId, name: saved?.name ?? "Your doctor", title: saved?.title, hue: saved?.hue ?? 186, avatar: saved?.avatar, listed: false };
}

export const DEFAULT_MESSAGING: DoctorMessaging = { free: false, consultation: true };

export function messagingFor(doctor: Pick<Doctor, "messaging">): DoctorMessaging {
  return doctor.messaging ?? DEFAULT_MESSAGING;
}

export const CONSULTATION_POLICY = {
  /** Chat is fully open for this long after the consultation starts. */
  sessionHours: 24,
  /** Free follow-up messages on the same concern after the session. */
  followUpDays: 7,
  /** Full refund if the doctor hasn't replied within this time. */
  replyGuaranteeHours: 12,
  /** A selected slot is held for this long while the patient pays. */
  slotHoldMinutes: 10,
};

export type ConsultationState = "upcoming" | "active" | "follow_up" | "closed" | "refunded";

export interface ConsultationTimeline {
  state: ConsultationState;
  startsAt: Date;
  sessionEndsAt: Date;
  followUpEndsAt: Date;
}

export function timeline(c: Consultation, now: Date): ConsultationTimeline {
  const startsAt = new Date(c.startsAt);
  const sessionEndsAt = c.completedAt
    ? new Date(c.completedAt)
    : addHours(startsAt, CONSULTATION_POLICY.sessionHours);
  const followUpEndsAt = addDays(sessionEndsAt, CONSULTATION_POLICY.followUpDays);

  let state: ConsultationState;
  if (c.refundedAt) state = "refunded";
  else if (now < startsAt) state = "upcoming";
  else if (now < sessionEndsAt) state = "active";
  else if (now < followUpEndsAt) state = "follow_up";
  else state = "closed";

  return { state, startsAt, sessionEndsAt, followUpEndsAt };
}

/** Patients can message only during an active session or the free follow-up window. */
export function canMessage(state: ConsultationState) {
  return state === "active" || state === "follow_up";
}

export const STATE_LABEL: Record<ConsultationState, { label: string; tone: "primary" | "success" | "gold" | "neutral" | "danger" }> = {
  upcoming: { label: "Upcoming", tone: "primary" },
  active: { label: "In progress", tone: "success" },
  follow_up: { label: "Free follow-up", tone: "gold" },
  closed: { label: "Completed", tone: "neutral" },
  refunded: { label: "Refunded", tone: "danger" },
};

/** Instant chat is offered only when the doctor is online now and accepts it in their schedule. */
export function canStartInstantly(availability: Availability, schedule: DoctorSchedule) {
  return availability === "online" && schedule.instantChat;
}

/** Re-checks a slot against the doctor's schedule and current bookings right before payment. */
export function isSlotStillAvailable(schedule: DoctorSchedule, slot: Date, now: Date, bookedStarts: string[]) {
  return slotsFor(schedule, now, bookedStarts).some((day) =>
    day.slots.some((s) => s.available && s.start.getTime() === slot.getTime()),
  );
}
