import { addDays, differenceInCalendarDays, format, isWithinInterval, parseISO } from "date-fns";
import type { PeriodEntry } from "@/lib/types";

// All calculations are based only on dates the user has entered (BRD B3, D2, D3).
// They are informational estimates, not medical advice.

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
const MIN_VALID_CYCLE = 15;
const MAX_VALID_CYCLE = 60;
const LUTEAL_PHASE_DAYS = 14;

export type DayPhase = "period" | "predicted" | "fertile" | "ovulation" | null;

export const toDay = (date: Date) => format(date, "yyyy-MM-dd");

export function sortByStart(entries: PeriodEntry[]) {
  return [...entries].sort((a, b) => a.start.localeCompare(b.start));
}

export function periodLength(entry: PeriodEntry) {
  if (!entry.end) return null;
  return differenceInCalendarDays(parseISO(entry.end), parseISO(entry.start)) + 1;
}

export interface CycleRecord {
  start: string;
  length: number;
}

/** Lengths of completed cycles, i.e. the gap between consecutive period start dates. */
export function cycleHistory(entries: PeriodEntry[]): CycleRecord[] {
  const sorted = sortByStart(entries);
  const cycles: CycleRecord[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const length = differenceInCalendarDays(parseISO(sorted[i]!.start), parseISO(previous.start));
    if (length >= MIN_VALID_CYCLE && length <= MAX_VALID_CYCLE) {
      cycles.push({ start: previous.start, length });
    }
  }
  return cycles;
}

export interface CycleStats {
  averageCycle: number;
  averagePeriod: number;
  shortest: number | null;
  longest: number | null;
  variation: number | null;
  completedCycles: number;
  regular: boolean | null;
}

export function cycleStats(
  entries: PeriodEntry[],
  fallbackCycle = DEFAULT_CYCLE_LENGTH,
  fallbackPeriod = DEFAULT_PERIOD_LENGTH,
): CycleStats {
  const cycles = cycleHistory(entries).map((c) => c.length);
  const periods = entries.map(periodLength).filter((n): n is number => n !== null && n > 0 && n < 15);
  const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const shortest = cycles.length ? Math.min(...cycles) : null;
  const longest = cycles.length ? Math.max(...cycles) : null;
  const variation = shortest !== null && longest !== null ? longest - shortest : null;

  return {
    averageCycle: cycles.length ? Math.round(avg(cycles)) : fallbackCycle,
    averagePeriod: periods.length ? Math.round(avg(periods)) : fallbackPeriod,
    shortest,
    longest,
    variation,
    completedCycles: cycles.length,
    regular: variation === null || cycles.length < 2 ? null : variation <= 7,
  };
}

export interface Prediction {
  lastStart: Date;
  nextStart: Date;
  ovulation: Date;
  fertileStart: Date;
  fertileEnd: Date;
  cycleDay: number;
  daysUntilNext: number;
  daysLate: number;
  phase: "Menstrual" | "Follicular" | "Ovulation" | "Luteal";
}

export function predict(
  entries: PeriodEntry[],
  today: Date,
  stats = cycleStats(entries),
): Prediction | null {
  const sorted = sortByStart(entries);
  const last = sorted.at(-1);
  if (!last) return null;

  const lastStart = parseISO(last.start);
  const nextStart = addDays(lastStart, stats.averageCycle);
  const ovulation = addDays(nextStart, -LUTEAL_PHASE_DAYS);
  const cycleDay = differenceInCalendarDays(today, lastStart) + 1;
  const daysUntilNext = differenceInCalendarDays(nextStart, today);
  const daysLate = Math.max(0, -daysUntilNext);

  const periodEnd = last.end ? parseISO(last.end) : addDays(lastStart, stats.averagePeriod - 1);
  const ovulationDay = differenceInCalendarDays(ovulation, lastStart) + 1;
  let phase: Prediction["phase"] = "Luteal";
  if (today <= periodEnd) phase = "Menstrual";
  else if (Math.abs(cycleDay - ovulationDay) <= 1) phase = "Ovulation";
  else if (cycleDay < ovulationDay) phase = "Follicular";

  return {
    lastStart,
    nextStart,
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    cycleDay,
    daysUntilNext,
    daysLate,
    phase,
  };
}

/** What to colour a calendar day with: logged period, or estimated future windows. */
export function phaseForDay(
  date: Date,
  entries: PeriodEntry[],
  prediction: Prediction | null,
  stats: CycleStats,
  cyclesAhead = 3,
): DayPhase {
  for (const entry of entries) {
    const start = parseISO(entry.start);
    const end = entry.end ? parseISO(entry.end) : addDays(start, stats.averagePeriod - 1);
    if (isWithinInterval(date, { start, end })) return "period";
  }
  if (!prediction) return null;

  // Past windows are only shown for the current cycle; future windows repeat by average length.
  for (let i = 0; i < cyclesAhead; i++) {
    const offset = stats.averageCycle * i;
    const nextStart = addDays(prediction.nextStart, offset);
    const ovulation = addDays(prediction.ovulation, offset);
    const predictedEnd = addDays(nextStart, stats.averagePeriod - 1);
    if (isWithinInterval(date, { start: nextStart, end: predictedEnd })) return "predicted";
    if (toDay(date) === toDay(ovulation)) return "ovulation";
    if (isWithinInterval(date, { start: addDays(ovulation, -5), end: addDays(ovulation, 1) })) {
      return "fertile";
    }
  }
  return null;
}
