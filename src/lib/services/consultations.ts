import { api, type ApiResult } from "@/lib/api";
import { hueFor } from "@/lib/chat";
import type { RegionId } from "@/lib/locale/regions";
import type { Consultation, ConsultationMode, PaymentMethodId } from "@/lib/types";

// Your consultations and booking them. Same endpoints and shapes as the
// webapp (lib/services/consultations.ts, app/actions/consultationAction.ts).
//   Free (fee 0):  POST /consultations
//   Paid:          POST /consultations/checkout → Stripe PaymentSheet → confirm

interface BackendConsultation {
  reference: string;
  mode: Consultation["mode"];
  concern: string;
  startsAt: string;
  bookedAt: string;
  completedAt?: string;
  refundedAt?: string;
  payment: {
    amount: number;
    currency: string;
    regionId: string;
    method: PaymentMethodId | "free";
    reference: string;
    details?: string;
    paidAt?: string;
  };
  doctor: { _id: string; title?: string; specialization?: string; fullName?: string; avatar?: string } | null;
  patient?: { _id: string; fullName?: string; avatar?: string };
}

function toConsultation(c: BackendConsultation): Consultation {
  const doctorId = c.doctor?._id ?? "";
  return {
    id: c.reference,
    doctorId,
    doctor: { name: c.doctor?.fullName || "Your doctor", title: c.doctor?.title || c.doctor?.specialization, hue: hueFor(doctorId || c.reference), avatar: c.doctor?.avatar || undefined },
    patient: c.patient ? { id: c.patient._id, name: c.patient.fullName || "Patient", avatar: c.patient.avatar || undefined } : undefined,
    mode: c.mode,
    concern: c.concern,
    startsAt: c.startsAt,
    bookedAt: c.bookedAt,
    completedAt: c.completedAt,
    refundedAt: c.refundedAt,
    payment: c.payment,
  };
}

/** Newest start first. */
export async function getMyConsultations(): Promise<ApiResult<Consultation[]>> {
  const result = await api<BackendConsultation[]>("/consultations/mine");
  return result.ok ? { ...result, data: (result.data ?? []).map(toConsultation) } : result;
}

export type ConfirmationSms = { status: "sent" | "failed" | "skipped"; to: string };

export interface BookingRequest {
  doctorId: string;
  mode: ConsultationMode;
  concern: string;
  startsAt: string;
  regionId: RegionId;
  timezone: string;
}

/** A free consultation: saved straight away; the backend texts the patient. */
export function bookFreeConsultation(input: BookingRequest & { reference: string }) {
  return api<{ sms: ConfirmationSms }>("/consultations", { method: "POST", body: input });
}

export interface CheckoutStart {
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  mode: "test" | "live";
  reference: string;
  amount: number;
  currency: string;
}

/** A paid consultation, step 1: the backend prices it and opens a Stripe payment. */
export function startCheckout(input: BookingRequest) {
  return api<CheckoutStart>("/consultations/checkout", { method: "POST", body: input });
}

export interface BookedResult {
  reference: string;
  startsAt: string;
  bookedAt: string;
  payment: Consultation["payment"];
  sms: ConfirmationSms | null;
}

/**
 * Step 2, after Stripe took the payment: the backend checks it with Stripe and
 * saves the booking. `processing`: Stripe hasn't settled it yet (try again).
 */
export async function confirmCheckout(paymentIntentId: string): Promise<ApiResult<{ booked?: BookedResult; processing?: boolean }>> {
  const result = await api<{
    consultation?: { reference: string; startsAt: string; createdAt: string; payment: Consultation["payment"] };
    sms: ConfirmationSms | null;
  }>(`/consultations/checkout/${encodeURIComponent(paymentIntentId)}/confirm`, { method: "POST" });
  if (!result.ok) return result;
  if (result.status === 202 || !result.data?.consultation) return { ...result, data: { processing: true } };
  const c = result.data.consultation;
  return { ...result, data: { booked: { reference: c.reference, startsAt: c.startsAt, bookedAt: c.createdAt, payment: c.payment, sms: result.data.sms } } };
}

/** "GC-" and 6 letters or digits. The backend checks it's unused. */
export function newReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `GC-${Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;
}
