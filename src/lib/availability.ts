import { addDays, addMinutes, format, getDay, isBefore, setHours, setMinutes, startOfDay } from "date-fns";

// Doctor-managed consultation hours. Each doctor sets weekly time ranges, slot length,
// how far ahead patients can book, minimum notice and days off. Patient booking slots
// are generated from this schedule.
//
// Times are shown in the viewer's local time.

export interface TimeRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface DoctorSchedule {
  /** Index 0 = Monday … 6 = Sunday. An empty list means the doctor is off that day. */
  weekly: TimeRange[][];
  slotMinutes: number;
  bookingWindowDays: number;
  minNoticeHours: number;
  /** Accept "Chat now" requests while online, outside of booked slots. */
  instantChat: boolean;
  /** Days off, as yyyy-MM-dd. */
  timeOff: string[];
  timezone: string;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const SLOT_LENGTHS = [15, 20, 30, 45, 60];
export const BOOKING_WINDOWS = [7, 14, 30];
export const MIN_NOTICE = [1, 2, 4, 12, 24];

/** Selectable times in 30-minute steps from 06:00 to 23:00. */
export const TIME_OPTIONS = Array.from({ length: 35 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

/** The backend's default: Mon–Fri 09:00–17:00, 30-minute slots, a week ahead. */
export const DEFAULT_SCHEDULE: DoctorSchedule = {
  weekly: Array.from({ length: 7 }, (_, day) => (day < 5 ? [{ start: "09:00", end: "17:00" }] : [])),
  slotMinutes: 30,
  bookingWindowDays: 7,
  minNoticeHours: 1,
  instantChat: true,
  timeOff: [],
  timezone: "Europe/London",
};

/** A doctor's saved schedule, with the default for anything missing. */
export function scheduleOf(schedule?: Partial<DoctorSchedule> | null): DoctorSchedule {
  return {
    ...DEFAULT_SCHEDULE,
    ...schedule,
    weekly: schedule?.weekly?.length === 7 ? schedule.weekly : DEFAULT_SCHEDULE.weekly,
    timeOff: schedule?.timeOff ?? [],
  };
}

/** Returns an error message for a day's ranges, or null if they're valid. */
export function validateDay(ranges: TimeRange[]): string | null {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const range = sorted[i]!;
    if (toMinutes(range.end) <= toMinutes(range.start)) return "End time must be after start time.";
    if (i > 0 && toMinutes(range.start) < toMinutes(sorted[i - 1]!.end)) return "Time ranges overlap.";
  }
  return null;
}

export function weeklyHours(schedule: DoctorSchedule) {
  const minutes = schedule.weekly.flat().reduce((sum, r) => sum + Math.max(0, toMinutes(r.end) - toMinutes(r.start)), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

/** Monday-first weekday index for a date. */
export const weekdayIndex = (date: Date) => (getDay(date) + 6) % 7;

export interface Slot {
  start: Date;
  available: boolean;
}

export interface ScheduleDay {
  date: Date;
  slots: Slot[];
  /** Why there are no slots: the doctor doesn't work that day, or took it off. */
  closed?: "off" | "time-off";
}

/** Bookable slots from a doctor's schedule. `bookedStarts` are times already taken (from the backend). */
export function slotsFor(schedule: DoctorSchedule, now: Date, bookedStarts: string[] = []): ScheduleDay[] {
  const earliest = addMinutes(now, schedule.minNoticeHours * 60);
  const booked = new Set(bookedStarts.map((s) => format(new Date(s), "yyyy-MM-dd'T'HH:mm")));
  const days: ScheduleDay[] = [];

  for (let d = 0; d < schedule.bookingWindowDays; d++) {
    const date = addDays(startOfDay(now), d);
    if (schedule.timeOff.includes(format(date, "yyyy-MM-dd"))) {
      days.push({ date, slots: [], closed: "time-off" });
      continue;
    }
    const ranges = schedule.weekly[weekdayIndex(date)] ?? [];
    if (!ranges.length) {
      days.push({ date, slots: [], closed: "off" });
      continue;
    }
    const slots: Slot[] = [];
    for (const r of [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))) {
      const [sh = 0, sm = 0] = r.start.split(":").map(Number);
      let t = setMinutes(setHours(date, sh), sm);
      const end = addMinutes(date, toMinutes(r.end));
      while (!isBefore(end, addMinutes(t, schedule.slotMinutes))) {
        const key = format(t, "yyyy-MM-dd'T'HH:mm");
        slots.push({ start: t, available: !isBefore(t, earliest) && !booked.has(key) });
        t = addMinutes(t, schedule.slotMinutes);
      }
    }
    days.push({ date, slots });
  }
  return days;
}

/** Short human summary like "Mon–Fri 09:00–17:30 · Sat 10:00–13:00". */
export function summarizeWeek(schedule: DoctorSchedule) {
  const label = (ranges: TimeRange[]) => ranges.map((r) => `${r.start}–${r.end}`).join(", ");
  const groups: Array<{ from: number; to: number; hours: string }> = [];
  schedule.weekly.forEach((ranges, i) => {
    if (!ranges.length) return;
    const hours = label(ranges);
    const last = groups.at(-1);
    if (last && last.hours === hours && last.to === i - 1) last.to = i;
    else groups.push({ from: i, to: i, hours });
  });
  return groups.map((g) => ({
    days: g.from === g.to ? WEEKDAYS_SHORT[g.from] : `${WEEKDAYS_SHORT[g.from]}–${WEEKDAYS_SHORT[g.to]}`,
    hours: g.hours,
  }));
}
