import type { Message, Role } from "@/lib/types";

// Chat shapes shared by the server service, the actions and the client.

/** One conversation in a list (inbox, doctor dashboard). */
export interface ChatSummary {
  /** Patients: the doctor id. Doctors: the chat id. Used in the link. */
  id: string;
  name: string;
  avatar?: string;
  hue: number;
  subtitle: string;
  lastText?: string;
  lastAt?: string;
  lastFrom?: Role;
  unread: number;
  /** Doctors' list: the patient in this chat. */
  patientId?: string;
}

export interface BackendMessage {
  _id: string;
  senderRole: Role;
  text: string;
  createdAt: string;
}

export const toMessage = (m: BackendMessage): Message => ({ id: m._id, from: m.senderRole, text: m.text, at: m.createdAt });

/** A stable avatar colour from an id. */
export function hueFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}
