import { AdBanner } from "@/components";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Bell, CalendarDays, Check, Plus, Pencil } from "lucide-react-native";
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
import Svg, { Path } from "react-native-svg";

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
  const { token } = useAuth();

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary]   = useState<DashboardSummary | null>(null);
  const [entries, setEntries]   = useState<PeriodEntry[]>([]);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formStart, setFormStart]     = useState<Date | null>(null);
  const [formEnd, setFormEnd]         = useState<Date | null>(null);
  const [saving, setSaving]           = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const hasLoaded = useRef(false);

  const accent   = colors.primary;
  const accentBg = colors.primaryLight;

  const loadData = useCallback(async () => {
    const [summaryRes, entriesRes] = await Promise.all([
      api<{ success: boolean; data: DashboardSummary }>("/api/patients/dashboard", { token: token ?? undefined }),
      api<{ success: boolean; data: PeriodEntry[] }>("/api/patients/periods", { token: token ?? undefined }),
    ]);
    if (summaryRes.ok) {
      setSummary(summaryRes.data.data);
      setAvatarFailed(false);
    }
    if (entriesRes.ok) setEntries(entriesRes.data.data);
  }, [token]);

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
    await loadData();
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

    const body = {
      startDate: formStart.toISOString(),
      endDate: formEnd ? formEnd.toISOString() : undefined,
    };

    const result = editingId
      ? await api(`/api/patients/periods/${editingId}`, { method: "PUT", token: token ?? undefined, body })
      : await api("/api/patients/periods", { method: "POST", token: token ?? undefined, body });

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
          const result = await api(`/api/patients/periods/${editingId}`, { method: "DELETE", token: token ?? undefined });
          setSaving(false);
          if (!result.ok) { Alert.alert("Couldn't delete entry", result.message); return; }
          setModalOpen(false);
          await loadData();
        },
      },
    ]);
  };

  const handleToggleReminders = async (value: boolean) => {
    if (!summary || savingReminders || summary.remindersEnabled === value) return;
    const previous = summary.remindersEnabled;
    setSummary((s) => (s ? { ...s, remindersEnabled: value } : s));
    setSavingReminders(true);
    const result = await api("/api/patients/reminders", {
      method: "PATCH",
      token: token ?? undefined,
      body: { enabled: value },
    });
    setSavingReminders(false);
    if (!result.ok) {
      setSummary((s) => (s ? { ...s, remindersEnabled: previous } : s));
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

  const predictedStart = summary?.predictedNextStart ? new Date(summary.predictedNextStart) : null;
  const predictedEnd   = summary?.predictedNextEnd ? new Date(summary.predictedNextEnd) : null;

  const cycleCardLabel = !summary?.latestEntry
    ? "No entries yet"
    : summary.reminderMissed
      ? "Period may be late"
      : (summary.daysUntilNextPeriod ?? 0) <= 0
        ? "Period expected"
        : "Period starts in";

  const cycleCardValue = !summary?.latestEntry
    ? "Log your first period"
    : summary.reminderMissed
      ? `${Math.abs(summary.daysUntilNextPeriod ?? 0)} Days Late`
      : (summary.daysUntilNextPeriod ?? 0) <= 0
        ? "Today"
        : `${summary.daysUntilNextPeriod} Days`;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: accent }]}>
              {summary?.avatar && !avatarFailed ? (
                <Image source={{ uri: summary.avatar }} style={s.avatarImage} onError={() => setAvatarFailed(true)} />
              ) : (
                <Text style={s.avatarInitials}>{initials(summary?.name)}</Text>
              )}
            </View>
            <View style={s.ml10}>
              <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting()}</Text>
              <Text style={[s.name, { color: colors.text }]}>{summary?.name || "Welcome"}</Text>
            </View>
          </View>
          <Pressable style={[s.bellBtn, { backgroundColor: accentBg }]} onPress={handleBellPress}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            {notificationBadge && <View style={s.bellBadge} />}
          </Pressable>
        </View>

        <Text style={[s.todayDate, { color: colors.textMuted }]}>{formatFullDate(today)}</Text>

        {/* ── Cycle Card ── */}
        <LinearGradient
          colors={["#f27bc1", "#d13a8b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.cycleCard}
        >
          <View style={s.dropletWatermark} pointerEvents="none">
            <Svg width={120} height={120} viewBox="0 0 24 24" fill="rgba(255,255,255,0.18)">
              <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="none" />
            </Svg>
          </View>

          <View style={s.cycleLabelPill}>
            <Text style={s.cycleLabel}>{cycleCardLabel}</Text>
          </View>
          <Text style={s.cycleDays}>{cycleCardValue}</Text>
          {predictedStart && predictedEnd && (
            <View style={s.datePill}>
              <Text style={s.datePillText}>
                {formatShort(predictedStart)} – {formatShort(predictedEnd)} (Predicted)
              </Text>
            </View>
          )}

          <View style={s.cardBtns}>
            <Pressable style={s.addBtn} onPress={() => openAdd()}>
              <Plus size={17} color="#d13a8b" />
              <Text style={s.addBtnText}>Add Entry</Text>
            </Pressable>
            {summary?.latestEntry && (
              <Pressable style={s.editBtn} onPress={() => openEdit(summary.latestEntry!)}>
                <Pencil size={15} color="#fff" />
                <Text style={s.editBtnText}>Edit Cycle</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {/* ── Calendar ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.calHeader}>
            <Pressable onPress={prevMonth} style={s.navArrow}>
              <Text style={[s.arrowText, { color: colors.text }]}>‹</Text>
            </Pressable>
            <Text style={[s.monthTitle, { color: colors.text }]}>{MONTHS[calMonth]} {calYear}</Text>
            <Pressable onPress={nextMonth} style={s.navArrow}>
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
              const isPeriod = cell.thisMonth && !!findEntryForDay(cellDate);
              const isPredicted =
                cell.thisMonth && !isPeriod && predictedStart && predictedEnd &&
                withinRange(cellDate, predictedStart, predictedEnd);
              const isToday =
                cell.thisMonth && cell.day === today.getDate() &&
                calMonth === today.getMonth() && calYear === today.getFullYear();

              const bubbleBg = isPeriod ? accent : isPredicted ? "#fce7f5" : "transparent";
              const bubbleBorder: object = isPredicted && !isPeriod
                ? { borderWidth: 1.5, borderColor: "#f27bc1", borderStyle: "dashed" as const }
                : isToday && !isPeriod
                  ? { borderWidth: 1.5, borderColor: accent }
                  : {};
              const textColor = !cell.thisMonth
                ? "#d1d5db"
                : isPeriod ? "#fff" : isPredicted || isToday ? accent : colors.text;
              const fontW: "400" | "700" = isPeriod || isPredicted || isToday ? "700" : "400";

              return (
                <Pressable key={i} style={s.dateCell} onPress={() => onDayPress(cell.day, cell.thisMonth)}>
                  <View style={[s.dateBubble, { backgroundColor: bubbleBg }, bubbleBorder]}>
                    <Text style={[s.dateText, { color: textColor, fontWeight: fontW }]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: accent }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>Period</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#fce7f5", borderWidth: 1.5, borderColor: "#f27bc1", borderStyle: "dashed" }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>Predicted</Text>
            </View>
          </View>
        </View>

        {/* ── Ad banner (F1) ── */}
        <AdBanner placement="patient_home" />

        {/* ── Cycle Insights ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Cycle Insights</Text>
        <View style={s.insightsRow}>
          <View style={[s.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={s.insightIcon}>🌸</Text>
            <Text style={[s.insightLabel, { color: colors.textMuted }]}>CURRENT DAY</Text>
            <Text style={[s.insightValue, { color: colors.text }]}>
              {summary?.currentCycleDay ? `Day ${summary.currentCycleDay}` : "–"}
            </Text>
          </View>
          <View style={[s.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={s.insightIcon}>📅</Text>
            <Text style={[s.insightLabel, { color: colors.textMuted }]}>AVG. CYCLE</Text>
            <Text style={[s.insightValue, { color: colors.text }]}>{summary?.avgCycleLengthDays ?? "–"} Days</Text>
          </View>
          <View style={[s.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={s.insightIcon}>⏱️</Text>
            <Text style={[s.insightLabel, { color: colors.textMuted }]}>AVG. LENGTH</Text>
            <Text style={[s.insightValue, { color: colors.text }]}>{summary?.avgPeriodLengthDays ?? "–"} Days</Text>
          </View>
        </View>

        {/* ── Recent Tracking History ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Tracking History</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!summary?.recentEntries?.length ? (
            <Text style={[s.historyEmpty, { color: colors.textMuted }]}>
              No entries logged yet. Tap "+ Add Entry" to get started.
            </Text>
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

        {/* ── Reminders ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Reminders</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 20 }]}>
          <View style={s.reminderRow}>
            <View style={[s.reminderIcon, { backgroundColor: accentBg }]}>
              <Bell size={20} color={accent} />
            </View>
            <View style={s.reminderCopy}>
              <Text style={[s.reminderTitle, { color: colors.text }]}>
                Cycle reminders
              </Text>
              <Text style={[s.reminderSub, { color: colors.textMuted }]}>
                {summary?.remindersEnabled
                  ? summary.reminderMissed
                    ? "On — your period may be overdue"
                    : summary.nextReminderDate
                      ? `On — next update around ${formatShort(new Date(summary.nextReminderDate))}`
                      : "On — add an entry to receive cycle updates"
                  : "Off — cycle updates are paused"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Cycle reminders"
              accessibilityState={{
                checked: summary?.remindersEnabled ?? false,
                disabled: savingReminders,
              }}
              disabled={savingReminders}
              onPress={() =>
                handleToggleReminders(!(summary?.remindersEnabled ?? false))
              }
              style={[
                s.reminderSwitch,
                {
                  backgroundColor: summary?.remindersEnabled
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              <View
                style={[
                  s.reminderThumb,
                  {
                    backgroundColor: colors.surfaceElevated,
                    transform: [
                      {
                        translateX: summary?.remindersEnabled ? 24 : 0,
                      },
                    ],
                  },
                ]}
              >
                {savingReminders && (
                  <ActivityIndicator size={12} color={colors.primary} />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View style={[s.disclaimer, { backgroundColor: accentBg, borderColor: "#f7abd9" }]}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>ℹ️</Text>
          <Text style={[s.disclaimerText, { color: "#834d8b" }]}>
            Predictions are based on your manual entries and historical data.
            This tool is not for medical diagnosis or contraception.{" "}
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

  cycleCard: { borderRadius: 24, padding: 24, marginBottom: 20, overflow: "hidden", minHeight: 188, shadowColor: "#d13a8b", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  dropletWatermark: { position: "absolute", right: -10, top: -20, opacity: 1 },
  cycleLabelPill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  cycleLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cycleDays: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 2, marginBottom: 6 },
  datePill: { backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 18 },
  datePillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardBtns: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 13, paddingVertical: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  addBtnText: { color: "#d13a8b", fontWeight: "700", fontSize: 14 },
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
