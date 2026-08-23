import { Text } from "@/components";
import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { CalendarClock, Check, Clock3, Info, RefreshCw, Save, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AvailabilitySlot = { dayOfWeek: number; startTime: string; endTime: string };
type ConsultationPrice = { durationMinutes: 15 | 30; fee: number };
type DayState = { enabled: boolean; start: Date; end: Date };
type TimeField = "start" | "end";
type PickerState = { day: number; which: TimeField; draft: Date };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const PRICE_DURATIONS = [15, 30] as const;

function timeToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

function defaultDayState(): DayState {
  return { enabled: false, start: timeToDate("09:00"), end: timeToDate("17:00") };
}

export default function DoctorAvailabilityScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const accent = DOCTOR_ACCENT;
  const accentBg = `${DOCTOR_ACCENT}18`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DayState[]>(() => DAYS.map(() => defaultDayState()));
  const [prices, setPrices] = useState<Record<15 | 30, string>>({ 15: "", 30: "" });
  const [picker, setPicker] = useState<PickerState | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api<{
      success: boolean;
      data: { availability?: AvailabilitySlot[]; consultationPricing?: ConsultationPrice[] };
    }>("/api/doctors/me", { token: token ?? undefined });

    if (result.ok) {
      const slots = result.data.data.availability ?? [];
      const pricing = result.data.data.consultationPricing ?? [];
      setDays(DAYS.map((_, index) => {
        const slot = slots.find((item) => item.dayOfWeek === index);
        return slot ? { enabled: true, start: timeToDate(slot.startTime), end: timeToDate(slot.endTime) } : defaultDayState();
      }));
      setPrices({
        15: pricing.find((item) => item.durationMinutes === 15)?.fee.toString() ?? "",
        30: pricing.find((item) => item.durationMinutes === 30)?.fee.toString() ?? "",
      });
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { void loadAvailability(); }, [loadAvailability]));

  const updateTime = (dayIndex: number, which: TimeField, date: Date) => {
    setDays((current) => current.map((day, index) => index === dayIndex ? { ...day, [which]: date } : day));
  };

  const openTimePicker = (dayIndex: number, which: TimeField) => {
    const value = days[dayIndex]?.[which] ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "time",
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === "set" && selected) updateTime(dayIndex, which, selected);
        },
      });
      return;
    }
    setPicker({ day: dayIndex, which, draft: value });
  };

  const toggleDay = (index: number) => {
    setDays((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, enabled: !day.enabled } : day));
  };

  const enableWeekdays = () => {
    setDays((current) => current.map((day, index) => ({ ...day, enabled: index >= 1 && index <= 5 })));
  };

  const handleSave = async () => {
    if (saving) return;

    const invalidDay = days.findIndex((day) => day.enabled && dateToTime(day.start) >= dateToTime(day.end));
    if (invalidDay >= 0) {
      Alert.alert("Check your hours", `${DAYS[invalidDay]} must end after its start time.`);
      return;
    }

    for (const duration of PRICE_DURATIONS) {
      const value = prices[duration].trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1_000_000)) {
        Alert.alert("Check your pricing", `Enter a valid fee for the ${duration}-minute consultation.`);
        return;
      }
    }

    const availability: AvailabilitySlot[] = days.flatMap((day, dayOfWeek) => day.enabled ? [{ dayOfWeek, startTime: dateToTime(day.start), endTime: dateToTime(day.end) }] : []);
    const consultationPricing: ConsultationPrice[] = PRICE_DURATIONS.flatMap((duration) => {
      const value = prices[duration].trim();
      return value ? [{ durationMinutes: duration, fee: Number(value) }] : [];
    });

    setSaving(true);
    const result = await api("/api/doctors/availability", {
      method: "PUT",
      token: token ?? undefined,
      body: { availability, consultationPricing },
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert("Couldn’t save schedule", result.message);
      return;
    }
    Alert.alert("Schedule saved", "Your availability and consultation pricing are now up to date.");
  };

  const activeDays = days.filter((day) => day.enabled).length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.headerRow}>
            <View style={s.headerCopy}>
              <Text variant="h2">Availability</Text>
              <Text variant="caption" color="textMuted" style={s.subtitle}>Set your hours and consultation prices</Text>
            </View>
            <View style={[s.headerIcon, { backgroundColor: accentBg }]}><CalendarClock size={22} color={accent} /></View>
          </View>

          {loading ? (
            <AvailabilitySkeleton colors={colors} />
          ) : error ? (
            <View style={[s.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text variant="bodyBold">We couldn’t load your schedule</Text>
              <Text variant="caption" color="textMuted" style={s.errorText}>{error}</Text>
              <Pressable onPress={loadAvailability} style={[s.retryButton, { backgroundColor: accentBg }]}><RefreshCw size={15} color={accent} /><Text variant="label" style={{ color: accent }}>Try again</Text></Pressable>
            </View>
          ) : (
            <>
              <View style={[s.summaryCard, { backgroundColor: accentBg }]}>
                <View style={[s.summaryIcon, { backgroundColor: colors.surfaceElevated }]}><Clock3 size={20} color={accent} /></View>
                <View style={s.summaryCopy}><Text style={[s.summaryTitle, { color: colors.text }]}>{activeDays ? `${activeDays} available ${activeDays === 1 ? "day" : "days"}` : "No available days yet"}</Text><Text style={[s.summaryText, { color: colors.textMuted }]}>Patients can book only inside the hours you save here.</Text></View>
              </View>

              <View style={s.sectionHeader}>
                <View><Text style={[s.sectionEyebrow, { color: colors.textMuted }]}>CONSULTATION PRICING</Text><Text style={[s.sectionHint, { color: colors.textMuted }]}>Set one or both duration options</Text></View>
              </View>
              <View style={[s.pricingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {PRICE_DURATIONS.map((duration, index) => (
                  <View key={duration} style={[s.priceRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[s.durationBadge, { backgroundColor: accentBg }]}><Text style={[s.durationValue, { color: accent }]}>{duration}</Text><Text style={[s.durationUnit, { color: accent }]}>MIN</Text></View>
                    <View style={s.priceCopy}><Text style={[s.priceTitle, { color: colors.text }]}>{duration}-minute consultation</Text><Text style={[s.priceHint, { color: colors.textMuted }]}>Patient charge for this session</Text></View>
                    <View style={[s.priceInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[s.currency, { color: colors.textMuted }]}>£</Text><TextInput value={prices[duration]} onChangeText={(value) => setPrices((current) => ({ ...current, [duration]: value.replace(/[^0-9.]/g, "") }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textMuted} style={[s.priceInput, { color: colors.text }]} /></View>
                  </View>
                ))}
              </View>

              <View style={s.scheduleHeading}>
                <View><Text style={[s.sectionEyebrow, { color: colors.textMuted }]}>WEEKLY SCHEDULE</Text><Text style={[s.sectionHint, { color: colors.textMuted }]}>Choose days, then set opening hours</Text></View>
                <Pressable onPress={enableWeekdays} style={[s.weekdayButton, { backgroundColor: accentBg }]}><Text style={[s.weekdayButtonText, { color: accent }]}>Weekdays</Text></Pressable>
              </View>

              <View style={s.daysList}>
                {DAYS.map((label, index) => {
                  const day = days[index];
                  if (!day) return null;
                  return (
                    <View key={label} style={[s.dayCard, { backgroundColor: colors.surface, borderColor: day.enabled ? `${accent}66` : colors.border }]}>
                      <View style={s.dayHeader}>
                        <View style={[s.dayBadge, { backgroundColor: day.enabled ? accentBg : colors.background }]}><Text style={[s.dayBadgeText, { color: day.enabled ? accent : colors.textMuted }]}>{SHORT_DAYS[index]}</Text></View>
                        <View style={s.dayCopy}><Text style={[s.dayName, { color: colors.text }]}>{label}</Text><Text style={[s.dayStatus, { color: day.enabled ? accent : colors.textMuted }]}>{day.enabled ? "Available" : "Unavailable"}</Text></View>
                        <Pressable accessibilityRole="switch" accessibilityLabel={`${label} availability`} accessibilityState={{ checked: day.enabled }} onPress={() => toggleDay(index)} style={[s.toggleTrack, { backgroundColor: day.enabled ? accent : colors.border }]}><View style={[s.toggleThumb, day.enabled && s.toggleThumbOn]} /></Pressable>
                      </View>
                      {day.enabled && (
                        <View style={[s.timeRow, { borderTopColor: colors.border }]}>
                          <TimeButton label="Starts" value={formatTime(day.start)} onPress={() => openTimePicker(index, "start")} colors={colors} accent={accent} />
                          <View style={[s.timeConnector, { backgroundColor: colors.border }]} />
                          <TimeButton label="Ends" value={formatTime(day.end)} onPress={() => openTimePicker(index, "end")} colors={colors} accent={accent} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={[s.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Info size={18} color={accent} /><Text style={[s.tipText, { color: colors.textMuted }]}>Leave a price empty if you don’t offer that session length. A fee of 0 means the session is free.</Text></View>
              <Pressable onPress={handleSave} disabled={saving} style={[s.saveButton, { backgroundColor: accent, opacity: saving ? 0.65 : 1 }]}>{saving ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={s.saveText}>Save schedule and pricing</Text></>}</Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setPicker(null)} />
        {!!picker && (
          <View style={[s.timeSheet, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={s.sheetHeader}><View><Text style={[s.sheetTitle, { color: colors.text }]}>Choose {picker.which === "start" ? "start" : "end"} time</Text><Text style={[s.sheetSubtitle, { color: colors.textMuted }]}>{DAYS[picker.day]}</Text></View><Pressable accessibilityLabel="Close time picker" onPress={() => setPicker(null)} style={[s.closeButton, { backgroundColor: colors.background }]}><X size={18} color={colors.textMuted} /></Pressable></View>
            <DateTimePicker value={picker.draft} mode="time" display="spinner" onChange={(_event, date) => date && setPicker((current) => current ? { ...current, draft: date } : current)} />
            <View style={s.sheetActions}><Pressable onPress={() => setPicker(null)} style={[s.cancelButton, { borderColor: colors.border }]}><Text style={[s.cancelText, { color: colors.textMuted }]}>Cancel</Text></Pressable><Pressable onPress={() => { updateTime(picker.day, picker.which, picker.draft); setPicker(null); }} style={[s.confirmButton, { backgroundColor: accent }]}><Check size={17} color="#fff" /><Text style={s.confirmText}>Confirm time</Text></Pressable></View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function TimeButton({ label, value, onPress, colors, accent }: { label: string; value: string; onPress: () => void; colors: ReturnType<typeof useTheme>["colors"]; accent: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label} at ${value}`} onPress={onPress} style={[s.timeButton, { backgroundColor: colors.background, borderColor: colors.border }]}><Clock3 size={16} color={accent} /><View><Text style={[s.timeLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[s.timeValue, { color: colors.text }]}>{value}</Text></View></Pressable>;
}

function AvailabilitySkeleton({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true })]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  const fill = colors.border;
  return <Animated.View accessibilityRole="progressbar" accessibilityLabel="Loading availability" style={{ opacity: pulse }}><View style={[s.skeletonSummary, { backgroundColor: fill }]} /><View style={[s.skeletonHeading, { backgroundColor: fill }]} /><View style={[s.pricingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{[0, 1].map((item) => <View key={item} style={s.priceRow}><View style={[s.skeletonDuration, { backgroundColor: fill }]} /><View style={s.priceCopy}><View style={[s.skeletonTitle, { backgroundColor: fill }]} /><View style={[s.skeletonText, { backgroundColor: fill }]} /></View><View style={[s.skeletonInput, { backgroundColor: fill }]} /></View>)}</View><View style={[s.skeletonHeading, { backgroundColor: fill }]} />{[0, 1, 2, 3].map((item) => <View key={item} style={[s.skeletonDay, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[s.skeletonDayBadge, { backgroundColor: fill }]} /><View style={s.dayCopy}><View style={[s.skeletonTitle, { backgroundColor: fill }]} /><View style={[s.skeletonText, { backgroundColor: fill }]} /></View><View style={[s.skeletonToggle, { backgroundColor: fill }]} /></View>)}</Animated.View>;
}

const s = StyleSheet.create({
  safe: { flex: 1 }, scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, headerCopy: { flex: 1 }, subtitle: { marginTop: 3 }, headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  errorCard: { borderWidth: 1, borderRadius: 20, padding: 18 }, errorText: { marginTop: 5, marginBottom: 13 }, retryButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  summaryCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 15 }, summaryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, summaryCopy: { flex: 1, marginLeft: 11 }, summaryTitle: { fontSize: 14, fontWeight: "800" }, summaryText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionHeader: { marginTop: 26, marginBottom: 11 }, sectionEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, sectionHint: { fontSize: 11, marginTop: 3 },
  pricingCard: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 15 }, priceRow: { minHeight: 86, flexDirection: "row", alignItems: "center", paddingVertical: 13 }, durationBadge: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }, durationValue: { fontSize: 16, fontWeight: "900", lineHeight: 18 }, durationUnit: { fontSize: 8, fontWeight: "800", letterSpacing: 0.7 }, priceCopy: { flex: 1, marginHorizontal: 11 }, priceTitle: { fontSize: 13, fontWeight: "700" }, priceHint: { fontSize: 10, marginTop: 3 }, priceInputWrap: { width: 86, minHeight: 46, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 10 }, currency: { fontSize: 14, fontWeight: "700" }, priceInput: { flex: 1, fontSize: 15, fontWeight: "800", paddingVertical: 9, paddingLeft: 3 },
  scheduleHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 27, marginBottom: 11 }, weekdayButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 }, weekdayButtonText: { fontSize: 11, fontWeight: "800" }, daysList: { gap: 10 },
  dayCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, overflow: "hidden" }, dayHeader: { minHeight: 70, flexDirection: "row", alignItems: "center" }, dayBadge: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, dayBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }, dayCopy: { flex: 1, marginLeft: 11 }, dayName: { fontSize: 14, fontWeight: "800" }, dayStatus: { fontSize: 11, marginTop: 2 },
  toggleTrack: { width: 46, height: 27, borderRadius: 999, padding: 3, justifyContent: "center" }, toggleThumb: { width: 21, height: 21, borderRadius: 999, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }, toggleThumbOn: { transform: [{ translateX: 19 }] },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 13 }, timeButton: { flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10 }, timeLabel: { fontSize: 9, fontWeight: "600" }, timeValue: { fontSize: 13, fontWeight: "800", marginTop: 1 }, timeConnector: { width: 10, height: 1 },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderWidth: 1, borderRadius: 15, padding: 13, marginTop: 18 }, tipText: { flex: 1, fontSize: 11, lineHeight: 17 }, saveButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 16, marginTop: 18 }, saveText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "#00000066" }, timeSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 }, sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, sheetTitle: { fontSize: 16, fontWeight: "800" }, sheetSubtitle: { fontSize: 11, marginTop: 2 }, closeButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }, sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 }, cancelButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 14 }, cancelText: { fontSize: 14, fontWeight: "700" }, confirmButton: { flex: 1.4, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14 }, confirmText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  skeletonSummary: { height: 70, borderRadius: 18 }, skeletonHeading: { width: 145, height: 11, borderRadius: 5, marginTop: 26, marginBottom: 11 }, skeletonDuration: { width: 48, height: 48, borderRadius: 15 }, skeletonTitle: { width: "62%", height: 12, borderRadius: 5 }, skeletonText: { width: "44%", height: 9, borderRadius: 5, marginTop: 6 }, skeletonInput: { width: 86, height: 46, borderRadius: 13 }, skeletonDay: { height: 70, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, marginBottom: 10 }, skeletonDayBadge: { width: 42, height: 42, borderRadius: 13 }, skeletonToggle: { width: 46, height: 27, borderRadius: 999 },
});
