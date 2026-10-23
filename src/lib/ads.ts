import type { AdCreative } from "@/lib/types";

// Ad slots in the app (BRD F1, F3). Which ad shows where is set in the admin
// dashboard; the backend picks the live ad with the highest priority per slot.

export type AdSlot = "home" | "learn-feed" | "article-end" | "doctors-feed" | "doctor-dashboard";

export const AD_SLOTS: AdSlot[] = ["home", "learn-feed", "article-end", "doctors-feed", "doctor-dashboard"];

/** The ad for each slot, or null when nothing is live there. */
export type ServedAds = Partial<Record<AdSlot, AdCreative | null>>;

/** Show at most one ad per this many feed items so ads never crowd out content. */
export const FEED_AD_FREQUENCY = 6;
