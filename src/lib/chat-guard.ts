// Blocks personal contact details in chat and reviews (BRD E4, E5).
// The backend must enforce the same rules; this gives instant feedback in the UI.

export type BlockedReason = "phone" | "email" | "link" | "social";

const RULES: Array<{ reason: BlockedReason; pattern: RegExp }> = [
  { reason: "email", pattern: /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\.[a-z]{2,}/i },
  { reason: "phone", pattern: /(\+?\d[\d\s().-]{7,}\d)/ },
  { reason: "link", pattern: /\b(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|me|co|uk|bd|in|info|app|link)\b/i },
  {
    reason: "social",
    pattern: /\b(whats\s?app|telegram|viber|imo|signal|wechat|insta(gram)?|facebook|messenger|snap(chat)?|tiktok)\b|(^|\s)@[a-z0-9_.]{3,}/i,
  },
];

export const BLOCKED_LABELS: Record<BlockedReason, string> = {
  phone: "phone numbers",
  email: "email addresses",
  link: "links or websites",
  social: "social media or messaging handles",
};

export function scanForContactDetails(text: string): BlockedReason[] {
  return RULES.filter(({ pattern }) => pattern.test(text)).map(({ reason }) => reason);
}

export function describeBlocked(reasons: BlockedReason[]) {
  const labels = reasons.map((r) => BLOCKED_LABELS[r]);
  const list =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0];
  return `For your safety, ${list} can't be shared here. Please keep all communication inside GyneClinics.`;
}
