import { useTheme } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
    cells.push({
      day: cells.length - daysCount - firstDay + 1,
      thisMonth: false,
    });

  return cells;
}

// Bell icon

// ─── main screen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors, spacing } = useTheme();

  // Cycle state (mock data)
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // Mock: period days 3-6, predicted 10-14
  const periodDays = [3, 4, 5, 6];
  const predictedDays = [10, 11, 12, 13, 14];

  const calendarCells = getCalendarDays(calYear, calMonth);

  const accent   = colors.primary;      // brand pink #d13a8b
  const accentBg = colors.primaryLight; // light pink wash

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 }]}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: accentBg }]}>
              <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
            </View>
            <View style={s.ml10}>
              <Text style={[s.greeting, { color: colors.textMuted }]}>
                Good Morning,
              </Text>
              <Text style={[s.name, { color: colors.text }]}>Sarah Miller</Text>
            </View>
          </View>
          <Pressable style={[s.bellBtn, { backgroundColor: accentBg }]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {/* ── Cycle Card ── */}
        <LinearGradient
          colors={["#f27bc1", "#d13a8b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.cycleCard}
        >
          {/* Watermark droplet */}
          <View style={s.dropletWatermark} pointerEvents="none">
            <Svg width={120} height={120} viewBox="0 0 24 24" fill="rgba(255,255,255,0.18)">
              <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="none" />
            </Svg>
          </View>

          <Text style={s.cycleLabel}>Period starts in</Text>
          <Text style={s.cycleDays}>4 Days</Text>
          <View style={s.datePill}>
            <Text style={s.datePillText}>
              {MONTHS[calMonth].slice(0, 3)} 7 – {MONTHS[calMonth].slice(0, 3)}{" "}
              12 (Predicted)
            </Text>
          </View>

          <View style={s.cardBtns}>
            <Pressable style={s.addBtn}>
              <Text style={s.addBtnText}>+ Add Entry</Text>
            </Pressable>
            <Pressable style={s.editBtn}>
              <Text style={s.editBtnText}>Edit Cycle</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Calendar ── */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {/* Month nav */}
          <View style={s.calHeader}>
            <Pressable onPress={prevMonth} style={s.navArrow}>
              <Text style={[s.arrowText, { color: colors.text }]}>‹</Text>
            </Pressable>
            <Text style={[s.monthTitle, { color: colors.text }]}>
              {MONTHS[calMonth]} {calYear}
            </Text>
            <Pressable onPress={nextMonth} style={s.navArrow}>
              <Text style={[s.arrowText, { color: colors.text }]}>›</Text>
            </Pressable>
          </View>

          {/* Day names */}
          <View style={s.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[s.dayName, { color: colors.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Date cells */}
          <View style={s.datesGrid}>
            {calendarCells.map((cell, i) => {
              const isPeriod    = cell.thisMonth && periodDays.includes(cell.day);
              const isPredicted = cell.thisMonth && predictedDays.includes(cell.day);
              const isToday     =
                cell.thisMonth &&
                cell.day === today.getDate() &&
                calMonth === today.getMonth() &&
                calYear === today.getFullYear();

              // ── bubble background & border ──────────────────────────
              const bubbleBg = isPeriod
                ? accent          // solid pink
                : isPredicted
                  ? "#fce7f5"     // light pink wash
                  : "transparent";

              const bubbleBorder: object = isPredicted && !isPeriod
                ? { borderWidth: 1.5, borderColor: "#f27bc1", borderStyle: "dashed" as const }
                : isToday && !isPeriod
                  ? { borderWidth: 1.5, borderColor: accent }
                  : {};

              // ── text colour ──────────────────────────────────────────
              const textColor = !cell.thisMonth
                ? "#d1d5db"
                : isPeriod
                  ? "#fff"
                  : isPredicted || isToday
                    ? accent
                    : colors.text;

              const fontW: "400" | "700" = isPeriod || isPredicted || isToday ? "700" : "400";

              return (
                <View key={i} style={s.dateCell}>
                  <View style={[s.dateBubble, { backgroundColor: bubbleBg }, bubbleBorder]}>
                    <Text style={[s.dateText, { color: textColor, fontWeight: fontW }]}>
                      {cell.day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {/* Period — solid pink dot */}
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: accent }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>Period</Text>
            </View>
            {/* Predicted — dashed outlined circle */}
            <View style={s.legendItem}>
              <View style={[s.legendDot, {
                backgroundColor: "#fce7f5",
                borderWidth: 1.5,
                borderColor: "#f27bc1",
                borderStyle: "dashed",
              }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>Predicted</Text>
            </View>
          </View>
        </View>

        {/* ── Cycle Insights ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Cycle Insights
        </Text>
        <View style={s.insightsRow}>
          <View style={[s.insightCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.insightIcon]}>📅</Text>
            <Text style={[s.insightLabel, { color: colors.textMuted }]}>
              AVG. CYCLE
            </Text>
            <Text style={[s.insightValue, { color: colors.text }]}>
              28 Days
            </Text>
          </View>
          <View style={[s.insightCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.insightIcon]}>⏱️</Text>
            <Text style={[s.insightLabel, { color: colors.textMuted }]}>
              AVG. LENGTH
            </Text>
            <Text style={[s.insightValue, { color: colors.text }]}>5 Days</Text>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View
          style={[
            s.disclaimer,
            { backgroundColor: accentBg, borderColor: "#f7abd9" },
          ]}
        >
          <Text style={{ fontSize: 14, marginRight: 6 }}>ℹ️</Text>
          <Text style={[s.disclaimerText, { color: "#834d8b" }]}>
            Predictions are based on your manual entries and historical data.
            This tool is not for medical diagnosis or contraception.{" "}
            <Text style={{ fontWeight: "700" }}>
              Always consult a healthcare professional.
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrap: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ml10: { marginLeft: 10 },
  greeting: { fontSize: 12, fontWeight: "400" },
  name: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Cycle card
  cycleCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
    minHeight: 170,
  },
  dropletWatermark: { position: "absolute", right: -10, top: -20, opacity: 1 },
  cycleLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  cycleDays: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 6,
  },
  datePill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 18,
  },
  datePillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardBtns: { flexDirection: "row", gap: 10 },
  addBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  addBtnText: { color: "#d13a8b", fontWeight: "700", fontSize: 14 },
  editBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Card wrapper
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Calendar
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: 22, fontWeight: "300" },
  monthTitle: { fontSize: 15, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  dayName: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
  datesGrid: { flexDirection: "row", flexWrap: "wrap" },
  dateCell: { width: "14.28%", alignItems: "center", paddingVertical: 3 },
  dateBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontSize: 13 },
  legend: { flexDirection: "row", gap: 20, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },

  // Insights
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  insightsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "flex-start",
  },
  insightIcon: { fontSize: 20, marginBottom: 6 },
  insightLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  insightValue: { fontSize: 22, fontWeight: "800" },

  // Disclaimer
  disclaimer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
