import { cycleHistory, cycleStats, predict } from "@/lib/cycle";
import { addBabyGrowth, addWeight, deleteBabyGrowth, deleteWeight, getTracker } from "@/lib/services/patient";
import { EMPTY_TRACKER, type TrackerData } from "@/lib/tracker";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { useFocusEffect } from "expo-router";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";
import { ReactNode, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// D1–D5: insights built only from what the patient logs (tracker on the
// backend, same data as the webapp's Insights). Each card opens in place.

type CardKey = "baby" | "fertility" | "cycle" | "weight";

type Colors = ReturnType<typeof useTheme>["colors"];

const CARDS: { key: CardKey; icon: string; title: string; description: string }[] = [
  { key: "baby", icon: "👶", title: "Baby Growth", description: "Track your baby's growth metrics over time." },
  { key: "fertility", icon: "🌸", title: "Ovulation & Fertility Window", description: "Your fertile window, estimated from your cycle data." },
  { key: "cycle", icon: "📊", title: "Cycle Analytics", description: "Average cycle length and variation trends." },
  { key: "weight", icon: "⚖️", title: "Weight Tracking", description: "Log and chart your weight over time." },
];

const day = (value: string, pattern = "d MMM yyyy") => format(parseISO(value), pattern);

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { account } = useAuth();
  const accentBg = colors.primaryLight;

  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<CardKey | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    const result = await getTracker();
    if (result.ok) {
      setTracker(result.data);
      setError(null);
    } else if (!loadedOnce.current) {
      setError(result.message);
    }
    loadedOnce.current = true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const data = tracker ?? EMPTY_TRACKER;
  const patient = account?.patient;
  const today = startOfDay(new Date());
  const stats = cycleStats(data.periods, patient?.typicalCycleLength, patient?.typicalPeriodLength);
  const prediction = predict(data.periods, today, stats);
  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const scans = [...data.babyGrowth].sort((a, b) => a.week - b.week);

  // The short value shown on each closed card.
  const badge: Record<CardKey, string> = {
    baby: scans.length ? `Week ${scans.at(-1)!.week}` : "Add scan",
    fertility: prediction
      ? today >= prediction.fertileStart && today <= prediction.fertileEnd
        ? "Now"
        : format(prediction.fertileStart, "d MMM")
      : "Log a period",
    cycle: `${stats.averageCycle} days`,
    weight: weights.length ? `${weights.at(-1)!.kg} kg` : "Add weight",
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Insights</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.padH}>
          {/* D5: standing disclaimer, must stay visible on every Insights screen */}
          <View style={[s.disclaimer, { backgroundColor: accentBg, borderColor: "#f7abd9" }]}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>ℹ️</Text>
            <Text style={[s.disclaimerText, { color: "#834d8b" }]}>
              These insights are based on the data you enter and are informational only.{" "}
              <Text style={{ fontWeight: "700" }}>They are not a medical diagnosis — always consult a healthcare professional.</Text>
            </Text>
          </View>

          {error && !tracker && (
            <Pressable onPress={() => void load()} style={[s.errorBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 4 }}>Tap to try again</Text>
            </Pressable>
          )}

          {CARDS.map((card) => {
            const isOpen = open === card.key;
            return (
              <View key={card.key} style={[s.card, { backgroundColor: colors.surface }]}>
                <Pressable
                  style={s.cardHead}
                  onPress={() => setOpen(isOpen ? null : card.key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={[s.cardIcon, { backgroundColor: accentBg }]}>
                    <Text style={{ fontSize: 22 }}>{card.icon}</Text>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={[s.cardTitle, { color: colors.text }]}>{card.title}</Text>
                    <Text style={[s.cardDescription, { color: colors.textMuted }]}>{card.description}</Text>
                  </View>
                  {tracker ? (
                    <View style={[s.valueBadge, { backgroundColor: accentBg }]}>
                      <Text style={[s.valueText, { color: colors.primary }]}>{badge[card.key]}</Text>
                    </View>
                  ) : (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                  {isOpen ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                </Pressable>

                {isOpen && tracker && (
                  <View style={[s.detail, { borderTopColor: colors.border }]}>
                    {card.key === "cycle" && <CycleSection tracker={tracker} colors={colors} stats={stats} />}
                    {card.key === "fertility" && <FertilitySection colors={colors} prediction={prediction} />}
                    {card.key === "weight" && <WeightSection tracker={tracker} setTracker={setTracker} colors={colors} />}
                    {card.key === "baby" && <BabySection tracker={tracker} setTracker={setTracker} colors={colors} />}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function CycleSection({ tracker, colors, stats }: { tracker: TrackerData; colors: Colors; stats: ReturnType<typeof cycleStats> }) {
  const history = cycleHistory(tracker.periods).slice(-8);
  if (stats.completedCycles === 0) {
    return <Empty colors={colors} text="Log at least two periods to see your cycle lengths. Until then, your usual cycle from your profile is used." />;
  }
  return (
    <>
      <Stats
        colors={colors}
        items={[
          { label: "Average cycle", value: `${stats.averageCycle} days` },
          { label: "Average period", value: `${stats.averagePeriod} days` },
          { label: "Shortest – longest", value: stats.shortest !== null ? `${stats.shortest}–${stats.longest} days` : "—" },
          { label: "Variation", value: stats.variation !== null ? `${stats.variation} days${stats.regular === null ? "" : stats.regular ? " · regular" : " · irregular"}` : "—" },
        ]}
      />
      <Text style={[s.sectionLabel, { color: colors.text }]}>Cycle length</Text>
      <Bars colors={colors} color={colors.primary} unit="d" data={history.map((c) => ({ label: day(c.start, "d MMM"), value: c.length }))} />
      <Text style={[s.note, { color: colors.textMuted }]}>A cycle is counted from the start of one period to the start of the next.</Text>
    </>
  );
}

function FertilitySection({ colors, prediction }: { colors: Colors; prediction: ReturnType<typeof predict> }) {
  if (!prediction) return <Empty colors={colors} text="Log your last period on Home to estimate your fertile window." />;
  const today = startOfDay(new Date());
  const inWindow = today >= prediction.fertileStart && today <= prediction.fertileEnd;
  const daysToWindow = differenceInCalendarDays(prediction.fertileStart, today);
  return (
    <>
      <Stats
        colors={colors}
        items={[
          { label: "Fertile window", value: `${format(prediction.fertileStart, "d MMM")} – ${format(prediction.fertileEnd, "d MMM")}` },
          { label: "Estimated ovulation", value: format(prediction.ovulation, "EEE d MMM") },
          { label: "Today", value: `Cycle day ${prediction.cycleDay} · ${prediction.phase}` },
          { label: "Next period", value: format(prediction.nextStart, "EEE d MMM") },
        ]}
      />
      <Text style={[s.note, { color: colors.textMuted }]}>
        {inWindow
          ? "You're in your estimated fertile window now."
          : daysToWindow > 0
            ? `Your fertile window is estimated to start in ${daysToWindow} day${daysToWindow === 1 ? "" : "s"}.`
            : "Your next fertile window follows your next period."}{" "}
        Estimates are not contraception.
      </Text>
    </>
  );
}

function WeightSection({ tracker, setTracker, colors }: { tracker: TrackerData; setTracker: (t: TrackerData) => void; colors: Colors }) {
  const [date, setDate] = useState(new Date());
  const [kg, setKg] = useState("");
  const [saving, setSaving] = useState(false);
  const sorted = [...tracker.weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const latest = sorted.at(-1);
  const change = first && latest ? +(latest.kg - first.kg).toFixed(1) : 0;
  const value = Number(kg.replace(",", "."));
  const valid = value >= 25 && value <= 250;

  const add = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const result = await addWeight({ date: format(date, "yyyy-MM-dd"), kg: Math.round(value * 10) / 10 });
    setSaving(false);
    if (!result.ok) return Alert.alert("Couldn't save weight", result.message);
    setTracker({ ...tracker, weights: [...tracker.weights, result.data] });
    setKg("");
  };

  const remove = (id: string) =>
    Alert.alert("Delete entry", "Remove this weight entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteWeight(id);
          if (!result.ok) return Alert.alert("Couldn't delete entry", result.message);
          setTracker({ ...tracker, weights: tracker.weights.filter((w) => w.id !== id) });
        },
      },
    ]);

  return (
    <>
      <Stats
        colors={colors}
        items={[
          { label: "Latest", value: latest ? `${latest.kg} kg` : "—" },
          { label: first ? `Change since ${day(first.date, "MMM yyyy")}` : "Change", value: sorted.length > 1 ? `${change > 0 ? "+" : ""}${change} kg` : "—" },
        ]}
      />
      {sorted.length > 1 && <Bars colors={colors} color="#c69a3c" unit="" data={sorted.slice(-10).map((w) => ({ label: day(w.date, "d MMM"), value: w.kg }))} />}

      <Text style={[s.sectionLabel, { color: colors.text }]}>Add weight</Text>
      <View style={s.formRow}>
        <DateButton colors={colors} value={date} onChange={setDate} />
        <TextInput
          value={kg}
          onChangeText={setKg}
          placeholder="kg"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
      </View>
      <SaveButton colors={colors} label="Add entry" disabled={!valid} saving={saving} onPress={add} />

      {sorted.length > 0 && (
        <EntryList colors={colors}>
          {[...sorted].reverse().map((w) => (
            <EntryRow key={w.id} colors={colors} left={day(w.date)} right={`${w.kg} kg`} onDelete={() => remove(w.id)} />
          ))}
        </EntryList>
      )}
    </>
  );
}

function BabySection({ tracker, setTracker, colors }: { tracker: TrackerData; setTracker: (t: TrackerData) => void; colors: Colors }) {
  const [date, setDate] = useState(new Date());
  const [form, setForm] = useState({ week: "", weightG: "", lengthCm: "" });
  const [saving, setSaving] = useState(false);
  const sorted = [...tracker.babyGrowth].sort((a, b) => a.week - b.week);
  const week = Number(form.week);
  const weightG = Number(form.weightG);
  const lengthCm = Number(form.lengthCm.replace(",", "."));
  const valid = week >= 4 && week <= 42 && weightG > 0 && weightG <= 6000 && lengthCm > 0 && lengthCm <= 60;

  const add = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const result = await addBabyGrowth({ date: format(date, "yyyy-MM-dd"), week, weightG, lengthCm });
    setSaving(false);
    if (!result.ok) return Alert.alert("Couldn't save scan", result.message);
    setTracker({ ...tracker, babyGrowth: [...tracker.babyGrowth, result.data] });
    setForm({ week: "", weightG: "", lengthCm: "" });
  };

  const remove = (id: string) =>
    Alert.alert("Delete scan", "Remove this measurement?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteBabyGrowth(id);
          if (!result.ok) return Alert.alert("Couldn't delete scan", result.message);
          setTracker({ ...tracker, babyGrowth: tracker.babyGrowth.filter((b) => b.id !== id) });
        },
      },
    ]);

  const latest = sorted.at(-1);
  const input = (key: keyof typeof form, placeholder: string, keyboardType: "number-pad" | "decimal-pad") => (
    <TextInput
      value={form[key]}
      onChangeText={(v) => setForm({ ...form, [key]: v })}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
    />
  );

  return (
    <>
      {latest ? (
        <Stats
          colors={colors}
          items={[
            { label: "Latest scan", value: `Week ${latest.week}` },
            { label: "Estimated weight", value: `${latest.weightG.toLocaleString("en-GB")} g` },
            { label: "Length", value: `${latest.lengthCm} cm` },
          ]}
        />
      ) : (
        <Empty colors={colors} text="Enter measurements from your scan reports to see your baby's growth." />
      )}
      {sorted.length > 1 && (
        <>
          <Text style={[s.sectionLabel, { color: colors.text }]}>Estimated weight (g) by week</Text>
          <Bars colors={colors} color={colors.secondary} unit="" data={sorted.map((b) => ({ label: `W${b.week}`, value: b.weightG }))} />
        </>
      )}

      <Text style={[s.sectionLabel, { color: colors.text }]}>Add scan measurement</Text>
      <View style={s.formRow}>
        <DateButton colors={colors} value={date} onChange={setDate} />
        {input("week", "Week", "number-pad")}
      </View>
      <View style={s.formRow}>
        {input("weightG", "Weight (g)", "number-pad")}
        {input("lengthCm", "Length (cm)", "decimal-pad")}
      </View>
      <SaveButton colors={colors} label="Add measurement" disabled={!valid} saving={saving} onPress={add} />

      {sorted.length > 0 && (
        <EntryList colors={colors}>
          {sorted.map((b) => (
            <EntryRow
              key={b.id}
              colors={colors}
              left={`Week ${b.week} · ${day(b.date)}`}
              right={`${b.weightG.toLocaleString("en-GB")} g · ${b.lengthCm} cm`}
              onDelete={() => remove(b.id)}
            />
          ))}
        </EntryList>
      )}
    </>
  );
}

// ── Building blocks ───────────────────────────────────────────────────────────

function Stats({ colors, items }: { colors: Colors; items: { label: string; value: string }[] }) {
  return (
    <View style={s.stats}>
      {items.map((item) => (
        <View key={item.label} style={[s.stat, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>{item.label}</Text>
          <Text style={[s.statValue, { color: colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** A small bar chart: one bar per value, scaled to the largest. */
function Bars({ colors, color, data, unit }: { colors: Colors; color: string; data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value));
  // Start the scale a little below the smallest value so differences show.
  const floor = min > 0 && (max - min) / max < 0.5 ? min * 0.85 : 0;
  return (
    <View style={s.chart}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`} style={s.barCol}>
          <Text style={[s.barValue, { color: colors.text }]} numberOfLines={1}>
            {d.value}
            {unit}
          </Text>
          <View style={[s.barTrack, { backgroundColor: colors.background }]}>
            <View style={[s.bar, { backgroundColor: color, height: `${Math.max(6, ((d.value - floor) / (max - floor)) * 100)}%` }]} />
          </View>
          <Text style={[s.barLabel, { color: colors.textMuted }]} numberOfLines={1}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DateButton({ colors, value, onChange }: { colors: Colors; value: Date; onChange: (d: Date) => void }) {
  const [show, setShow] = useState(false);
  const pick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (event.type !== "dismissed" && selected) onChange(selected);
  };
  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setShow((v) => !v)} style={[s.input, s.dateBtn, { borderColor: show ? colors.primary : colors.border, backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: 14 }}>{format(value, "d MMM yyyy")}</Text>
      </Pressable>
      {show && (
        <DateTimePicker value={value} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} maximumDate={new Date()} onChange={pick} />
      )}
    </View>
  );
}

function SaveButton({ colors, label, disabled, saving, onPress }: { colors: Colors; label: string; disabled: boolean; saving: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || saving}
      style={[s.saveBtn, { backgroundColor: colors.primary, opacity: disabled ? 0.45 : 1 }]}
      accessibilityRole="button"
    >
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>{label}</Text>}
    </Pressable>
  );
}

function EntryList({ colors, children }: { colors: Colors; children: ReactNode }) {
  return <View style={[s.entries, { borderColor: colors.border }]}>{children}</View>;
}

function EntryRow({ colors, left, right, onDelete }: { colors: Colors; left: string; right: string; onDelete: () => void }) {
  return (
    <View style={[s.entryRow, { borderBottomColor: colors.border }]}>
      <Text style={[s.entryLeft, { color: colors.textMuted }]}>{left}</Text>
      <Text style={[s.entryRight, { color: colors.text }]}>{right}</Text>
      <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel="Delete entry">
        <Trash2 size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Empty({ colors, text }: { colors: Colors; text: string }) {
  return <Text style={[s.note, { color: colors.textMuted, marginTop: 0 }]}>{text}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  padH: { paddingHorizontal: 20 },

  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: "800" },

  disclaimer: { flexDirection: "row", borderRadius: 12, padding: 14, borderWidth: 1, alignItems: "flex-start", marginBottom: 20 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },

  card: { borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHead: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  cardDescription: { fontSize: 12, lineHeight: 17 },
  valueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: 96 },
  valueText: { fontSize: 11, fontWeight: "800" },
  detail: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, paddingTop: 12 },

  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: 12, padding: 10 },
  statLabel: { fontSize: 11, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: "800" },

  sectionLabel: { fontSize: 13, fontWeight: "800", marginTop: 16, marginBottom: 8 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 10 },

  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 150, marginTop: 12 },
  barCol: { flex: 1, alignItems: "center", height: "100%" },
  barValue: { fontSize: 9, fontWeight: "700", marginBottom: 3 },
  barTrack: { flex: 1, width: "100%", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 9, marginTop: 4 },

  formRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  dateBtn: { justifyContent: "center" },
  saveBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  entries: { borderWidth: 1, borderRadius: 12, marginTop: 14, overflow: "hidden" },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  entryLeft: { flex: 1, fontSize: 12 },
  entryRight: { fontSize: 13, fontWeight: "700" },
});
