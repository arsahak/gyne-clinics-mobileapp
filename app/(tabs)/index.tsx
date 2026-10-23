import { HERO_GRADIENT } from "@/constants/brand";
import { AdBanner } from "@/components";
import { CycleRing } from "@/components/home/CycleRing";
import { DoctorCard } from "@/components/doctors";
import type { Account } from "@/lib/account";
import { cycleStats, phaseForDay, predict, sortByStart } from "@/lib/cycle";
import { STATE_LABEL } from "@/lib/consultation";
import { getContentArticles } from "@/lib/services/content";
import { getDoctors } from "@/lib/services/doctors";
import type { Article, Doctor } from "@/lib/types";
import { useMyConsultations } from "@/lib/useMyConsultations";
import { addPeriod, deletePeriod, getTracker, saveReminders, updatePeriod } from "@/lib/services/patient";
import type { TrackerData } from "@/lib/tracker";
import { useAuth } from "@/store/AuthContext";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowRight, Baby, Bell, BellRing, CalendarCheck, CalendarDays, ChartSpline, Check, Clock, Droplet, MessageCircle, Plus, Pencil, Scale, Sparkles, Timer } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── types ──────────────────────────────────────────────────────────────────

type PeriodEntry = {
  _id: string;
  startDate: string;
  endDate?: string | null;
};

type DashboardSummary = {
  name: string | null;
  avatar: string | null;
  today: string;
  latestEntry: PeriodEntry | null;
  currentCycleDay: number | null;
  avgCycleLengthDays: number;
  avgPeriodLengthDays: number;
  predictedNextStart: string | null;
  predictedNextEnd: string | null;
  daysUntilNextPeriod: number | null;
  nextReminderDate: string | null;
  reminderMissed: boolean;
  remindersEnabled: boolean;
  recentEntries: PeriodEntry[];
};

// ─── helpers ────────────────────────────────────────────────────────────────

/** Logged periods in the shape this screen draws ("yyyy-MM-dd" days as local dates). */
const toEntry = (p: TrackerData["periods"][number]): PeriodEntry => ({
  _id: p.id,
  startDate: parseISO(p.start).toISOString(),
  endDate: p.end ? parseISO(p.end).toISOString() : null,
});

/**
 * The cycle summary, worked out on the phone from the logged periods with the
 * same rules as the webapp (lib/cycle.ts).
 */
function buildSummary(tracker: TrackerData, account: Account | null, today: Date): DashboardSummary {
  const patient = account?.patient;
  const stats = cycleStats(tracker.periods, patient?.typicalCycleLength, patient?.typicalPeriodLength);
  const prediction = predict(tracker.periods, startOfDay(today), stats);
  const latest = sortByStart(tracker.periods).at(-1);
  const reminders = tracker.reminders;
  const reminderDate = prediction && reminders.periodReminder ? addDays(prediction.nextStart, -reminders.daysBefore) : null;
  return {
    name: account?.fullName || null,
    avatar: account?.avatar || null,
    today: today.toISOString(),
    latestEntry: latest ? toEntry(latest) : null,
    currentCycleDay: prediction?.cycleDay ?? null,
    avgCycleLengthDays: stats.averageCycle,
    avgPeriodLengthDays: stats.averagePeriod,
    predictedNextStart: prediction ? prediction.nextStart.toISOString() : null,
    predictedNextEnd: prediction ? addDays(prediction.nextStart, stats.averagePeriod - 1).toISOString() : null,
    daysUntilNextPeriod: prediction?.daysUntilNext ?? null,
    nextReminderDate: reminderDate && reminderDate >= startOfDay(today) ? reminderDate.toISOString() : null,
    reminderMissed: (prediction?.daysLate ?? 0) > 0,
    remindersEnabled: reminders.periodReminder,
    recentEntries: sortByStart(tracker.periods).reverse().slice(0, 5).map(toEntry),
  };
}

// What each phase usually means (same copy as the webapp's home).
const PHASE_COPY: Record<string, { color: string; text: string }> = {
  Menstrual: { color: "#804898", text: "Rest and stay hydrated. Gentle movement can ease cramps." },
  Follicular: { color: "#207898", text: "Energy often rises in this phase — a good time for new routines." },
  Ovulation: { color: "#207898", text: "You're around your estimated ovulation day." },
  Luteal: { color: "#b08d48", text: "Some people notice bloating or mood changes before their period." },
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const prevCount = new Date(year, month, 0).getDate();
  const cells: { day: number; thisMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevCount - i, thisMonth: false });
  for (let d = 1; d <= daysCount; d++) cells.push({ day: d, thisMonth: true });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysCount - firstDay + 1, thisMonth: false });

  return cells;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function withinRange(day: Date, start: Date, end: Date) {
  const d = startOfDay(day).getTime();
  return d >= startOfDay(start).getTime() && d <= startOfDay(end).getTime();
}

function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatInputDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatRange(entry: PeriodEntry) {
  const start = formatShort(new Date(entry.startDate));
  if (!entry.endDate) return `${start} – ongoing`;
  return `${start} – ${formatShort(new Date(entry.endDate))}`;
}

function initials(name?: string | null) {
  if (!name?.trim()) return "P";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

// ─── date field (inline picker) ────────────────────────────────────────────
function DateField({
  label, value, onChange, colors, accent, minimumDate,
}: {
  label: string; value: Date | null; onChange: (d: Date) => void;
  colors: any; accent: string; minimumDate?: Date;
}) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(value ?? new Date());
  const [androidPicked, setAndroidPicked] = useState(false);

  const open = () => {
    setDraft(value ?? minimumDate ?? new Date());
    setAndroidPicked(false);
    setShow(true);
  };
  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setShow(false);
      return;
    }
    if (selected) {
      setDraft(selected);
      if (Platform.OS === "android") setAndroidPicked(true);
    }
  };
  const confirm = () => {
    onChange(draft);
    setShow(false);
  };
  return (
    <View style={m.dateField}>
      <Text style={[m.fieldLabel, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label.toLowerCase()}`}
        onPress={open}
        style={[m.dateBtn, { backgroundColor: colors.background, borderColor: show ? accent : colors.border }]}
      >
        <CalendarDays size={18} color={value ? accent : colors.textMuted} />
        <Text style={[m.dateValue, { color: value ? colors.text : colors.textMuted }]}>
          {value ? formatInputDate(value) : "Tap to select"}
        </Text>
        <View style={[m.dateBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[m.dateBadgeText, { color: accent }]}>
            {value ? "Change" : "Select"}
          </Text>
        </View>
      </Pressable>
      {show && (
        <View style={[m.datePickerPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {(Platform.OS !== "android" || !androidPicked) && (
            <DateTimePicker
              value={draft}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={new Date()}
            />
          )}
          <View style={m.dateActions}>
            <Pressable onPress={() => setShow(false)} style={[m.dateCancel, { borderColor: colors.border }]}>
              <Text style={[m.dateCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} style={[m.dateConfirm, { backgroundColor: accent }]}>
              <Check size={15} color="#fff" />
              <Text style={m.dateConfirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function HomeSkeleton({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const fill = colors.border;
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[s.scroll, s.skeletonScroll]} showsVerticalScrollIndicator={false}>
        <Animated.View accessibilityRole="progressbar" accessibilityLabel="Loading cycle dashboard" style={{ opacity: pulse }}>
          <View style={s.skeletonHeader}>
            <View style={[s.skeletonAvatar, { backgroundColor: fill }]} />
            <View style={s.skeletonHeaderCopy}>
              <View style={[s.skeletonLineSmall, { backgroundColor: fill }]} />
              <View style={[s.skeletonLineName, { backgroundColor: fill }]} />
            </View>
            <View style={[s.skeletonBell, { backgroundColor: fill }]} />
          </View>
          <View style={[s.skeletonDate, { backgroundColor: fill }]} />
          <View style={[s.skeletonHero, { backgroundColor: fill }]}>
            <View style={[s.skeletonHeroLine, { backgroundColor: colors.surface }]} />
            <View style={[s.skeletonHeroValue, { backgroundColor: colors.surface }]} />
            <View style={[s.skeletonHeroPill, { backgroundColor: colors.surface }]} />
            <View style={s.skeletonHeroActions}>
              <View style={[s.skeletonAction, { backgroundColor: colors.surface }]} />
              <View style={[s.skeletonAction, { backgroundColor: colors.surface }]} />
            </View>
          </View>
          <View style={[s.skeletonCalendar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.skeletonCalendarHead}>
              <View style={[s.skeletonArrow, { backgroundColor: fill }]} />
              <View style={[s.skeletonMonth, { backgroundColor: fill }]} />
              <View style={[s.skeletonArrow, { backgroundColor: fill }]} />
            </View>
            <View style={s.skeletonDays}>
              {Array.from({ length: 35 }).map((_, index) => (
                <View key={index} style={[s.skeletonDay, { backgroundColor: fill }]} />
              ))}
            </View>
          </View>
          <View style={[s.skeletonSectionTitle, { backgroundColor: fill }]} />
          <View style={s.skeletonInsights}>
            {[0, 1, 2].map((item) => <View key={item} style={[s.skeletonInsight, { backgroundColor: colors.surface, borderColor: colors.border }]} />)}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { account } = useAuth();

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tracker, setTracker]   = useState<TrackerData | null>(null);
  const summary = tracker ? buildSummary(tracker, account, today) : null;
  const entries = tracker ? tracker.periods.map(toEntry) : [];

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formStart, setFormStart]     = useState<Date | null>(null);
  const [formEnd, setFormEnd]         = useState<Date | null>(null);
  const [saving, setSaving]           = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const hasLoaded = useRef(false);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [calendarY, setCalendarY] = useState(0);
  const [articles, setArticles] = useState<Article[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const { consultations, byDoctor, reload: reloadConsultations } = useMyConsultations();

  const accent   = colors.primary;
  const accentBg = colors.primaryLight;

  const loadData = useCallback(async () => {
    const [result, articleRes, doctorRes] = await Promise.all([getTracker(), getContentArticles(), getDoctors()]);
    if (result.ok) {
      setTracker(result.data);
      setAvatarFailed(false);
    }
    if (articleRes.ok) setArticles(articleRes.data.filter((a) => a.format !== "story").slice(0, 3));
    if (doctorRes.ok) {
      const recommended = doctorRes.data.filter((d) => d.recommended);
      setDoctors((recommended.length ? recommended : [...doctorRes.data].sort((a, b) => b.rating - a.rating)).slice(0, 3));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!hasLoaded.current) setLoading(true);
        await loadData();
        if (active) {
          hasLoaded.current = true;
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), reloadConsultations()]);
    setRefreshing(false);
  };

  const calendarCells = getCalendarDays(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const findEntryForDay = (day: Date): PeriodEntry | undefined =>
    entries.find((e) => withinRange(day, new Date(e.startDate), new Date(e.endDate ?? e.startDate)));

  // ── Add / edit modal ──
  const openAdd = (prefillDate?: Date) => {
    setEditingId(null);
    setFormStart(prefillDate ?? today);
    setFormEnd(null);
    setModalOpen(true);
  };
  const openEdit = (entry: PeriodEntry) => {
    setEditingId(entry._id);
    setFormStart(new Date(entry.startDate));
    setFormEnd(entry.endDate ? new Date(entry.endDate) : null);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const onDayPress = (day: number, thisMonth: boolean) => {
    if (!thisMonth) return;
    const date = new Date(calYear, calMonth, day);
    const entry = findEntryForDay(date);
    if (entry) openEdit(entry);
    else openAdd(date);
  };

  const handleSave = async () => {
    if (!formStart || saving) return;
    setSaving(true);

    // Flow, symptoms and note set on the webapp are kept when the dates change here.
    const existing = editingId ? tracker?.periods.find((p) => p.id === editingId) : undefined;
    const entry = {
      ...(existing && { flow: existing.flow, symptoms: existing.symptoms, note: existing.note }),
      start: format(formStart, "yyyy-MM-dd"),
      end: formEnd ? format(formEnd, "yyyy-MM-dd") : undefined,
    };
    const result = editingId ? await updatePeriod(editingId, entry) : await addPeriod(entry);

    setSaving(false);

    if (!result.ok) {
      Alert.alert("Couldn't save entry", result.message);
      return;
    }

    setModalOpen(false);
    await loadData();
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert("Delete entry", "Remove this period entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setSaving(true);
          const result = await deletePeriod(editingId);
          setSaving(false);
          if (!result.ok) { Alert.alert("Couldn't delete entry", result.message); return; }
          setModalOpen(false);
          await loadData();
        },
      },
    ]);
  };

  const handleToggleReminders = async (value: boolean) => {
    if (!tracker || savingReminders || tracker.reminders.periodReminder === value) return;
    const previous = tracker.reminders;
    setTracker((t) => (t ? { ...t, reminders: { ...t.reminders, periodReminder: value } } : t));
    setSavingReminders(true);
    const result = await saveReminders({ periodReminder: value });
    setSavingReminders(false);
    if (!result.ok) {
      setTracker((t) => (t ? { ...t, reminders: previous } : t));
      Alert.alert("Couldn't update reminders", result.message);
    }
  };

  const notificationBadge =
    !!summary && (summary.reminderMissed || (summary.daysUntilNextPeriod !== null && summary.daysUntilNextPeriod <= 2));

  const handleBellPress = () => {
    if (!summary?.remindersEnabled) {
      Alert.alert("Notifications", "Reminders are currently turned off. Enable them in the Reminders section below to get period predictions.");
      return;
    }
    if (summary.reminderMissed) {
      Alert.alert("Reminder missed", "Your period seems overdue based on your cycle history. Log it below when it starts.");
      return;
    }
    if (summary.nextReminderDate) {
      Alert.alert("Upcoming reminder", `We'll remind you around ${formatFullDate(new Date(summary.nextReminderDate))}, ahead of your predicted period.`);
      return;
    }
    Alert.alert("Notifications", "No upcoming reminders yet. Add a period entry to start getting predictions.");
  };

  if (loading) {
    return <HomeSkeleton colors={colors} />;
  }

  // Cycle numbers for the ring, tiles and calendar colours.
  const periods = tracker?.periods ?? [];
  const stats = cycleStats(periods, account?.patient?.typicalCycleLength, account?.patient?.typicalPeriodLength);
  const prediction = predict(periods, startOfDay(today), stats);
  const phase = prediction ? PHASE_COPY[prediction.phase] : null;
  const ovulationDay = prediction ? differenceInCalendarDays(prediction.ovulation, prediction.lastStart) + 1 : 14;
  const inFertile = !!prediction && startOfDay(today) >= prediction.fertileStart && startOfDay(today) <= prediction.fertileEnd;
  const fertileIn = prediction ? differenceInCalendarDays(prediction.fertileStart, startOfDay(today)) : 0;

  const predictedStart = summary?.predictedNextStart ? new Date(summary.predictedNextStart) : null;
  const predictedEnd   = summary?.predictedNextEnd ? new Date(summary.predictedNextEnd) : null;

  const headline = !prediction
    ? "Log your first period"
    : prediction.daysLate > 0
      ? `Period ${prediction.daysLate} day${prediction.daysLate === 1 ? "" : "s"} late`
      : prediction.daysUntilNext === 0
        ? "Period expected today"
        : `Period in ${prediction.daysUntilNext} day${prediction.daysUntilNext === 1 ? "" : "s"}`;

  // The next upcoming or running consultation.
  const nextConsultation = consultations
    .map((c) => byDoctor.get(c.doctorId))
    .filter((c): c is NonNullable<typeof c> => !!c && (c.state === "upcoming" || c.state === "active"))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  // Upcoming reminders, from the reminder settings and the prediction.
  const reminderItems: { label: string; date: Date }[] = [];
  if (prediction && tracker?.reminders.periodReminder) {
    reminderItems.push({ label: `Period expected in ${tracker.reminders.daysBefore} days`, date: addDays(prediction.nextStart, -tracker.reminders.daysBefore) });
  }
  if (prediction && tracker?.reminders.fertileReminder) reminderItems.push({ label: "Fertile window begins", date: prediction.fertileStart });
  const upcomingReminders = reminderItems.filter((i) => i.date >= startOfDay(today)).sort((a, b) => a.date.getTime() - b.date.getTime());

  const quickLinks = [
    { label: "Calendar", body: "Your cycle by month", Icon: CalendarDays, color: "#804898", bg: "#f0e9f3", onPress: () => scrollRef.current?.scrollTo({ y: calendarY - 10, animated: true }) },
    { label: "Cycle insights", body: "Trends and fertile window", Icon: ChartSpline, color: "#207898", bg: "#e4eff3", onPress: () => router.push("/(tabs)/insights") },
    { label: "Weight", body: "Track changes over time", Icon: Scale, color: "#b08d48", bg: "#f7f1e6", onPress: () => router.push("/(tabs)/insights") },
    { label: "Baby growth", body: "From your scan reports", Icon: Baby, color: "#207898", bg: "#e4eff3", onPress: () => router.push("/(tabs)/insights") },
  ];

  const sectionHeader = (title: string, onSeeAll: () => void) => (
    <View style={s.sectionRow}>
      <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{title}</Text>
      <Pressable onPress={onSeeAll} style={s.seeAll} hitSlop={8}>
        <Text style={{ color: accent, fontWeight: "700", fontSize: 13 }}>See all</Text>
        <ArrowRight size={14} color={accent} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: summary?.avatar && !avatarFailed ? colors.surface : accent, borderWidth: summary?.avatar && !avatarFailed ? 1 : 0, borderColor: colors.border }]}>
              {summary?.avatar && !avatarFailed ? (
                <Image source={{ uri: summary.avatar }} style={s.avatarImage} onError={() => setAvatarFailed(true)} />
              ) : (
                <Text style={s.avatarInitials}>{initials(summary?.name)}</Text>
              )}
            </View>
            <View style={s.ml10}>
              <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting()}</Text>
              <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                {summary?.name?.split(" ")[0] || "Welcome"}
              </Text>
            </View>
          </View>
          <Pressable style={[s.bellBtn, { backgroundColor: accentBg }]} onPress={handleBellPress} accessibilityLabel="Reminders">
            <Bell size={20} color={accent} />
            {notificationBadge && <View style={s.bellBadge} />}
          </Pressable>
        </View>

        <Text style={[s.todayDate, { color: colors.textMuted }]}>{formatFullDate(today)}</Text>

        {/* ── Cycle hero ── */}
        <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroGlow} pointerEvents="none" />
          {prediction ? (
            <View style={s.heroRow}>
              <CycleRing cycleLength={stats.averageCycle} periodLength={stats.averagePeriod} ovulationDay={ovulationDay} cycleDay={prediction.cycleDay} size={140}>
                <Text style={s.ringLabel}>CYCLE DAY</Text>
                <Text style={s.ringValue}>{prediction.cycleDay}</Text>
                <View style={s.phasePill}>
                  <Text style={s.phasePillText}>{prediction.phase}</Text>
                </View>
              </CycleRing>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={s.heroHeadline}>{headline}</Text>
                <Text style={s.heroSub}>
                  Next period{"\n"}
                  <Text style={{ fontWeight: "800", color: "#fff" }}>{format(prediction.nextStart, "EEE, d MMM")}</Text>
                </Text>
                {predictedStart && predictedEnd && (
                  <View style={s.datePill}>
                    <Text style={s.datePillText}>
                      {formatShort(predictedStart)} – {formatShort(predictedEnd)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <View style={s.emptyRing}>
                <Droplet size={30} color="#fff" />
              </View>
              <Text style={[s.heroHeadline, { textAlign: "center", marginTop: 12 }]}>{headline}</Text>
              <Text style={[s.heroSub, { textAlign: "center" }]}>Add the start of your last period and we'll estimate your next one.</Text>
            </View>
          )}

          <View style={s.cardBtns}>
            <Pressable style={s.addBtn} onPress={() => openAdd()}>
              <Plus size={17} color="#804898" />
              <Text style={s.addBtnText}>Log period</Text>
            </Pressable>
            {summary?.latestEntry && (
              <Pressable style={s.editBtn} onPress={() => openEdit(summary.latestEntry!)}>
                <Pencil size={15} color="#fff" />
                <Text style={s.editBtnText}>Edit last</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {/* ── Phase tip ── */}
        {phase && prediction && (
          <View style={[s.tip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.tipIcon, { backgroundColor: `${phase.color}1A` }]}>
              <Sparkles size={17} color={phase.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: phase.color }]}>{prediction.phase} phase</Text>
              <Text style={[s.tipText, { color: colors.textMuted }]}>{phase.text}</Text>
            </View>
          </View>
        )}

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {[
            { Icon: Timer, label: "Avg. cycle", value: `${stats.averageCycle} days`, color: "#207898" },
            { Icon: Droplet, label: "Avg. period", value: `${stats.averagePeriod} days`, color: "#804898" },
            {
              Icon: Sparkles,
              label: "Fertile window",
              value: !prediction ? "—" : inFertile ? "Now" : fertileIn > 0 ? `In ${fertileIn}d` : format(prediction.fertileStart, "d MMM"),
              color: "#207898",
            },
          ].map(({ Icon, label, value, color }) => (
            <View key={label} style={[s.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon size={17} color={color} />
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
              <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Next consultation ── */}
        {nextConsultation && (
          <Pressable
            onPress={() => router.push(`/consultation/${nextConsultation.consultation.doctorId}`)}
            style={[s.consultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[s.tipIcon, { backgroundColor: colors.primaryLight }]}>
              {nextConsultation.state === "active" ? <MessageCircle size={18} color={accent} /> : <CalendarCheck size={18} color={accent} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={[s.rowBetween]}>
                <Text style={[s.tipTitle, { color: colors.text }]}>Consultation</Text>
                <View style={[s.smallPill, { backgroundColor: nextConsultation.state === "active" ? "#dcfce7" : colors.primaryLight }]}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: nextConsultation.state === "active" ? "#15803d" : accent }}>
                    {STATE_LABEL[nextConsultation.state].label}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.text, fontSize: 13.5, marginTop: 2 }} numberOfLines={1}>
                {nextConsultation.consultation.doctor?.name ?? "Your doctor"}
              </Text>
              <View style={[s.rowBetween, { justifyContent: "flex-start", gap: 5, marginTop: 2 }]}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                  {nextConsultation.state === "active"
                    ? `Chat open until ${format(nextConsultation.sessionEndsAt, "d MMM, HH:mm")}`
                    : format(nextConsultation.startsAt, "EEEE d MMM 'at' HH:mm")}
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* ── Quick links ── */}
        <View style={s.quickGrid}>
          {quickLinks.map(({ label, body, Icon, color, bg, onPress }) => (
            <Pressable key={label} onPress={onPress} style={({ pressed }) => [s.quick, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <View style={[s.quickIcon, { backgroundColor: bg }]}>
                <Icon size={19} color={color} />
              </View>
              <Text style={[s.quickTitle, { color: colors.text }]}>{label}</Text>
              <Text style={[s.quickBody, { color: colors.textMuted }]} numberOfLines={1}>
                {body}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Calendar ── */}
        <View onLayout={(e) => setCalendarY(e.nativeEvent.layout.y)} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.calHeader}>
            <Pressable onPress={prevMonth} style={[s.navArrow, { backgroundColor: colors.background }]}>
              <Text style={[s.arrowText, { color: colors.text }]}>‹</Text>
            </Pressable>
            <Text style={[s.monthTitle, { color: colors.text }]}>{MONTHS[calMonth]} {calYear}</Text>
            <Pressable onPress={nextMonth} style={[s.navArrow, { backgroundColor: colors.background }]}>
              <Text style={[s.arrowText, { color: colors.text }]}>›</Text>
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[s.dayName, { color: colors.textMuted }]}>{d}</Text>
            ))}
          </View>

          <View style={s.datesGrid}>
            {calendarCells.map((cell, i) => {
              const cellDate = new Date(calYear, calMonth, cell.day);
              const dayPhase = cell.thisMonth ? phaseForDay(cellDate, periods, prediction, stats) : null;
              const isToday =
                cell.thisMonth && cell.day === today.getDate() &&
                calMonth === today.getMonth() && calYear === today.getFullYear();

              const style =
                dayPhase === "period"
                  ? { bg: accent, text: "#fff", border: {} }
                  : dayPhase === "predicted"
                    ? { bg: "#f0e9f3", text: accent, border: { borderWidth: 1.5, borderColor: "#a67fb7", borderStyle: "dashed" as const } }
                    : dayPhase === "ovulation"
                      ? { bg: "#207898", text: "#fff", border: {} }
                      : dayPhase === "fertile"
                        ? { bg: "#e4eff3", text: "#207898", border: {} }
                        : { bg: "transparent", text: cell.thisMonth ? colors.text : "#d1d5db", border: {} };
              const todayRing = isToday && dayPhase !== "period" ? { borderWidth: 2, borderColor: colors.text } : {};

              return (
                <Pressable key={i} style={s.dateCell} onPress={() => onDayPress(cell.day, cell.thisMonth)}>
                  <View style={[s.dateBubble, { backgroundColor: style.bg }, style.border, todayRing]}>
                    <Text style={[s.dateText, { color: style.text, fontWeight: dayPhase || isToday ? "800" : "400" }]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={s.legend}>
            {[
              { label: "Period", dot: { backgroundColor: accent } },
              { label: "Predicted", dot: { backgroundColor: "#f0e9f3", borderWidth: 1.5, borderColor: "#a67fb7", borderStyle: "dashed" as const } },
              { label: "Fertile", dot: { backgroundColor: "#c7dde5" } },
              { label: "Ovulation", dot: { backgroundColor: "#207898" } },
            ].map((item) => (
              <View key={item.label} style={s.legendItem}>
                <View style={[s.legendDot, item.dot]} />
                <Text style={[s.legendText, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Reminders ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.reminderRow}>
            <View style={[s.reminderIcon, { backgroundColor: "#f7f1e6" }]}>
              <BellRing size={20} color="#b08d48" />
            </View>
            <View style={s.reminderCopy}>
              <Text style={[s.reminderTitle, { color: colors.text }]}>Reminders</Text>
              {summary?.remindersEnabled ? (
                upcomingReminders.length ? (
                  upcomingReminders.map((item) => (
                    <Text key={item.label} style={[s.reminderSub, { color: colors.textMuted }]}>
                      {format(item.date, "EEE d MMM")} · {item.label}
                    </Text>
                  ))
                ) : (
                  <Text style={[s.reminderSub, { color: colors.textMuted }]}>No upcoming reminders.</Text>
                )
              ) : (
                <Text style={[s.reminderSub, { color: colors.textMuted }]}>Off — cycle updates are paused</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Cycle reminders"
              accessibilityState={{ checked: summary?.remindersEnabled ?? false, disabled: savingReminders }}
              disabled={savingReminders}
              onPress={() => handleToggleReminders(!(summary?.remindersEnabled ?? false))}
              style={[s.reminderSwitch, { backgroundColor: summary?.remindersEnabled ? colors.primary : colors.border }]}
            >
              <View style={[s.reminderThumb, { backgroundColor: colors.surfaceElevated, transform: [{ translateX: summary?.remindersEnabled ? 24 : 0 }] }]}>
                {savingReminders && <ActivityIndicator size={12} color={colors.primary} />}
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Ad banner (F1) ── */}
        <AdBanner placement="home" />

        {/* ── For you to read ── */}
        {articles.length > 0 && (
          <>
            {sectionHeader("For you to read", () => router.push("/(tabs)/learn"))}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel} style={s.carouselWrap}>
              {articles.map((a) => (
                <Pressable key={a.slug} onPress={() => router.push(`/content/${a.slug}`)} style={[s.article, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {a.image ? (
                    <Image source={{ uri: a.image }} style={s.articleCover} />
                  ) : (
                    <LinearGradient colors={[a.cover.from, a.cover.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.articleCover} />
                  )}
                  <View style={{ padding: 12 }}>
                    <Text style={[s.articleCategory, { color: accent }]}>{a.category.toUpperCase()}</Text>
                    <Text style={[s.articleTitle, { color: colors.text }]} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 6 }}>{a.readMinutes} min read</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Recommended specialists ── */}
        {doctors.length > 0 && (
          <>
            {sectionHeader("Recommended specialists", () => router.push("/(tabs)/help"))}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel} style={s.carouselWrap}>
              {doctors.map((d) => (
                <View key={d.id} style={{ width: 280 }}>
                  <DoctorCard doctor={d} compact consultation={byDoctor.get(d.id)} onPress={() => router.push(`/doctor/${d.id}`)} />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Recent Tracking History ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Recent tracking history</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!summary?.recentEntries?.length ? (
            <Text style={[s.historyEmpty, { color: colors.textMuted }]}>No entries logged yet. Tap "Log period" to get started.</Text>
          ) : (
            summary.recentEntries.map((entry, i) => (
              <Pressable
                key={entry._id}
                onPress={() => openEdit(entry)}
                style={[s.historyRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={[s.historyDot, { backgroundColor: accent }]} />
                <Text style={[s.historyText, { color: colors.text }]}>{formatRange(entry)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>›</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Disclaimer ── */}
        <View style={[s.disclaimer, { backgroundColor: accentBg, borderColor: "#c6add1" }]}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>ℹ️</Text>
          <Text style={[s.disclaimerText, { color: "#207898" }]}>
            Predictions are estimates based on your logged dates, not medical advice or contraception.{" "}
            <Text style={{ fontWeight: "700" }}>Always consult a healthcare professional.</Text>
          </Text>
        </View>
      </ScrollView>

      {/* ── Add/Edit period entry modal ── */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <Pressable style={m.backdrop} onPress={closeModal} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>
            {editingId ? "Edit Period Entry" : "Add Period Entry"}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[m.helperText, { color: colors.textMuted }]}>
              Add the first day of your period and an optional end date.
            </Text>
            <DateField label="Start Date" value={formStart} onChange={setFormStart} colors={colors} accent={accent} />
            <DateField label="End Date (optional)" value={formEnd} onChange={setFormEnd} colors={colors} accent={accent} minimumDate={formStart ?? undefined} />

            <Pressable
              onPress={handleSave}
              disabled={!formStart || saving}
              style={[m.saveBtn, { backgroundColor: accent, opacity: !formStart || saving ? 0.6 : 1 }]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>{editingId ? "Save changes" : "Add period entry"}</Text>}
            </Pressable>

            {editingId && (
              <Pressable onPress={handleDelete} disabled={saving} style={m.deleteBtn}>
                <Text style={m.deleteBtnText}>Delete Entry</Text>
              </Pressable>
            )}

            <Pressable onPress={closeModal} style={m.cancelBtn}>
              <Text style={[m.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  hero: { borderRadius: 26, padding: 20, marginBottom: 14, overflow: "hidden" },
  heroGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.12)", top: -90, right: -70 },
  heroRow: { flexDirection: "row", alignItems: "center" },
  ringLabel: { color: "rgba(255,255,255,0.85)", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },
  ringValue: { color: "#fff", fontSize: 40, fontWeight: "900", lineHeight: 46 },
  phasePill: { backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  phasePillText: { color: "#fff", fontSize: 10.5, fontWeight: "800" },
  heroHeadline: { color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 27 },
  heroSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19, marginTop: 6 },
  emptyRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 6, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  tip: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 12 },
  tipIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tipTitle: { fontSize: 14, fontWeight: "800" },
  tipText: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 9, marginBottom: 12 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12 },
  statLabel: { fontSize: 11, marginTop: 8 },
  statValue: { fontSize: 15, fontWeight: "800", marginTop: 1 },
  consultCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  quick: { width: "48.3%", borderWidth: 1, borderRadius: 20, padding: 14 },
  quickIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickTitle: { fontSize: 14, fontWeight: "800", marginTop: 10 },
  quickBody: { fontSize: 11.5, marginTop: 2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 3 },
  carouselWrap: { marginHorizontal: -20, marginBottom: 14 },
  carousel: { paddingHorizontal: 20, gap: 12 },
  article: { width: 230, borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  articleCover: { width: "100%", height: 110 },
  articleCategory: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6 },
  articleTitle: { fontSize: 14, fontWeight: "800", lineHeight: 19, marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  skeletonScroll: { paddingBottom: 110 },
  skeletonHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 17 },
  skeletonHeaderCopy: { flex: 1, marginLeft: 11, gap: 7 },
  skeletonLineSmall: { width: 72, height: 9, borderRadius: 5 },
  skeletonLineName: { width: 132, height: 16, borderRadius: 7 },
  skeletonBell: { width: 42, height: 42, borderRadius: 14 },
  skeletonDate: { width: 178, height: 11, borderRadius: 6, marginBottom: 17 },
  skeletonHero: { height: 188, borderRadius: 24, padding: 23, marginBottom: 20 },
  skeletonHeroLine: { width: 104, height: 12, borderRadius: 6, opacity: 0.7 },
  skeletonHeroValue: { width: 176, height: 34, borderRadius: 10, marginTop: 11, opacity: 0.7 },
  skeletonHeroPill: { width: 138, height: 23, borderRadius: 12, marginTop: 10, opacity: 0.7 },
  skeletonHeroActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  skeletonAction: { flex: 1, height: 42, borderRadius: 13, opacity: 0.8 },
  skeletonCalendar: { height: 326, borderRadius: 20, borderWidth: 1, padding: 17, marginBottom: 23 },
  skeletonCalendarHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 23 },
  skeletonArrow: { width: 32, height: 32, borderRadius: 10 },
  skeletonMonth: { width: 112, height: 15, borderRadius: 7 },
  skeletonDays: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skeletonDay: { width: "10.3%", aspectRatio: 1, borderRadius: 20, marginHorizontal: "0.55%" },
  skeletonSectionTitle: { width: 112, height: 17, borderRadius: 7, marginBottom: 12 },
  skeletonInsights: { flexDirection: "row", gap: 10 },
  skeletonInsight: { flex: 1, height: 116, borderRadius: 17, borderWidth: 1 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  avatarWrap: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: "#fff", fontSize: 16, fontWeight: "800" },
  ml10: { marginLeft: 10 },
  greeting: { fontSize: 12, fontWeight: "400" },
  name: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  bellBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#fff" },
  todayDate: { fontSize: 13, fontWeight: "600", marginBottom: 16 },

  cycleCard: { borderRadius: 24, padding: 24, marginBottom: 20, overflow: "hidden", minHeight: 188, shadowColor: "#804898", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  dropletWatermark: { position: "absolute", right: -10, top: -20, opacity: 1 },
  cycleLabelPill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  cycleLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cycleDays: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 2, marginBottom: 6 },
  datePill: { backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 18 },
  datePillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardBtns: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 13, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  addBtnText: { color: "#804898", fontWeight: "700", fontSize: 14 },
  editBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 13, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: { borderRadius: 20, padding: 17, marginBottom: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 22, fontWeight: "300" },
  monthTitle: { fontSize: 15, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  dayName: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
  datesGrid: { flexDirection: "row", flexWrap: "wrap" },
  dateCell: { width: "14.28%", alignItems: "center", paddingVertical: 3 },
  dateBubble: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dateText: { fontSize: 13 },
  legend: { flexDirection: "row", gap: 20, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },

  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  insightsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  insightCard: { flex: 1, borderRadius: 17, borderWidth: 1, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, alignItems: "flex-start" },
  insightIcon: { fontSize: 20, marginBottom: 6 },
  insightLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  insightValue: { fontSize: 22, fontWeight: "800" },

  historyEmpty: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyText: { flex: 1, fontSize: 14, fontWeight: "600" },

  reminderRow: { flexDirection: "row", alignItems: "center" },
  reminderIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12 },
  reminderCopy: { flex: 1, paddingRight: 10 },
  reminderTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  reminderSub: { fontSize: 12, lineHeight: 17 },
  reminderSwitch: { width: 54, height: 30, borderRadius: 15, padding: 3 },
  reminderThumb: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.16, shadowRadius: 2, elevation: 2 },

  disclaimer: { flexDirection: "row", borderRadius: 12, padding: 14, borderWidth: 1, alignItems: "flex-start" },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 19, fontWeight: "800", marginBottom: 4, textAlign: "center" },
  helperText: { fontSize: 12, lineHeight: 17, textAlign: "center", marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  dateField: { marginBottom: 15 },
  dateBtn: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14 },
  dateValue: { flex: 1, fontSize: 14 },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateBadgeText: { fontSize: 12, fontWeight: "700" },
  datePickerPanel: { borderRadius: 15, borderWidth: 1, padding: 10, marginTop: 8 },
  dateActions: { flexDirection: "row", gap: 8, marginTop: 7 },
  dateCancel: { flex: 1, height: 40, borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dateCancelText: { fontSize: 12, fontWeight: "700" },
  dateConfirm: { flex: 1.35, height: 40, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dateConfirmText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 7 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  deleteBtn: { paddingVertical: 14, alignItems: "center" },
  deleteBtnText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },
  cancelBtn: { paddingVertical: 6, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
});
