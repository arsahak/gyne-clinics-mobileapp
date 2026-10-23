import type { BabyGrowthEntry, PeriodEntry, WeightEntry } from "@/lib/types";

// The patient's health logs as the backend sends them (/tracker), and the
// shapes the app uses. Shared by the server (first load) and server actions.

export interface ReminderSettings {
  periodReminder: boolean;
  daysBefore: number;
  fertileReminder: boolean;
  dailyLogReminder: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = { periodReminder: true, daysBefore: 2, fertileReminder: false, dailyLogReminder: false };

export interface TrackerData {
  periods: PeriodEntry[];
  weights: WeightEntry[];
  babyGrowth: BabyGrowthEntry[];
  reminders: ReminderSettings;
}

export const EMPTY_TRACKER: TrackerData = { periods: [], weights: [], babyGrowth: [], reminders: DEFAULT_REMINDERS };

export type BackendPeriod = Omit<PeriodEntry, "id"> & { _id: string };
export type BackendWeight = Omit<WeightEntry, "id"> & { _id: string };
export type BackendBabyGrowth = Omit<BabyGrowthEntry, "id"> & { _id: string };

export const toPeriod = ({ _id, start, end, flow, symptoms, note }: BackendPeriod): PeriodEntry => ({ id: _id, start, end, flow, symptoms, note });
export const toWeight = ({ _id, date, kg }: BackendWeight): WeightEntry => ({ id: _id, date, kg });
export const toBabyGrowth = ({ _id, date, week, weightG, lengthCm }: BackendBabyGrowth): BabyGrowthEntry => ({ id: _id, date, week, weightG, lengthCm });
