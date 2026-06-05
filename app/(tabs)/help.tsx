import { useTheme } from "@/theme";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ── Brand — overridden by colors.primary/teal inside component ───────────────
const PINK      = "#d13a8b";
const PINK_LITE = "#fce7f5";
const TEAL      = "#217580";
const TEAL_LITE = "#e0f7f7";
const PURPLE    = "#834d8b";
const PURPLE_BG = "#f5ebfa";

// ── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={1.8} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.15} />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.12} />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FILTERS = ["All Filters", "Top Rated", "Experience", "Available", "Online"];

const DOCTORS = [
  {
    name:     "Dr. Sarah Jenkins",
    role:     "Senior Gynaecologist",
    exp:      "12 yrs exp",
    rating:   "4.9",
    price:    "£120",
    emoji:    "👩‍⚕️",
    avatarBg: "#fce7f5",
    online:   true,
    tags: [
      { label: "Fertility",  color: TEAL,   bg: TEAL_LITE },
      { label: "PCOS",       color: PINK,   bg: "#fce7f5" },
    ],
  },
  {
    name:     "Dr. Elena Rodriguez",
    role:     "Obstetrician",
    exp:      "8 yrs exp",
    rating:   "4.8",
    price:    "£95",
    emoji:    "👩‍⚕️",
    avatarBg: "#f5ebfa",
    online:   false,
    tags: [
      { label: "Pregnancy",  color: PURPLE, bg: PURPLE_BG },
      { label: "Hormones",   color: TEAL,   bg: TEAL_LITE },
    ],
  },
  {
    name:     "Dr. Priya Patel",
    role:     "Consultant Gynaecologist",
    exp:      "15 yrs exp",
    rating:   "5.0",
    price:    "£145",
    emoji:    "👩‍⚕️",
    avatarBg: "#e0f7f7",
    online:   true,
    tags: [
      { label: "Menopause",  color: PINK,   bg: "#fce7f5" },
      { label: "HRT",        color: PURPLE, bg: PURPLE_BG },
    ],
  },
];

// ── Screen ───────────────────────────────────────────────────────────────────
export default function HelpScreen() {
  const { colors }                = useTheme();
  const pink                      = colors.primary;      // #d13a8b
  const pinkLite                  = colors.primaryLight; // #fce7f5
  const teal                      = colors.teal;         // #217580
  const tealLite                  = colors.tealLight;    // #e0f7f7
  const [query, setQuery]         = useState("");
  const [activeFilter, setFilter] = useState("All Filters");

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Find a Specialist</Text>
        <View style={[s.bellWrap, { backgroundColor: colors.surface }]}>
          <BellIcon color={colors.text} />
          <View style={s.bellDot} />
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={[s.searchBar, { backgroundColor: colors.surface }]}>
        <SearchIcon color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search gynaecologists, symptoms…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Filter pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}
        >
          {FILTERS.map((f) => {
            const active = f === activeFilter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  s.pill,
                  active
                    ? { backgroundColor: pink, borderColor: pink }
                    : { backgroundColor: "transparent", borderColor: colors.border },
                ]}
              >
                {f === "All Filters" && active && (
                  <FilterIcon color="#fff" />
                )}
                <Text style={[s.pillText, { color: active ? "#fff" : colors.textMuted }]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Section header ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: colors.text }]}>RECOMMENDED FOR YOU</Text>
          <Text style={[s.foundText, { color: pink }]}>12 Found</Text>
        </View>

        {/* ── Doctor cards ── */}
        <View style={s.padH}>
          {DOCTORS.map((doc, i) => (
            <View key={i} style={[s.docCard, { backgroundColor: colors.surface }]}>
              {/* Avatar */}
              <View style={[s.avatarWrap, { backgroundColor: doc.avatarBg }]}>
                <Text style={s.avatarEmoji}>{doc.emoji}</Text>
                {doc.online && <View style={s.onlineDot} />}
              </View>

              {/* Info */}
              <View style={s.docInfo}>
                {/* Name + rating */}
                <View style={s.nameRow}>
                  <Text style={[s.docName, { color: colors.text }]}>{doc.name}</Text>
                  <View style={s.ratingWrap}>
                    <StarIcon color="#f59e0b" />
                    <Text style={s.ratingText}>{doc.rating}</Text>
                  </View>
                </View>

                {/* Role + exp */}
                <Text style={[s.docRole, { color: colors.textMuted }]}>
                  {doc.role} · {doc.exp}
                </Text>

                {/* Tags */}
                <View style={s.tagsRow}>
                  {doc.tags.map((t, j) => (
                    <View key={j} style={[s.tag, { backgroundColor: t.bg }]}>
                      <Text style={[s.tagText, { color: t.color }]}>{t.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Price + CTA */}
                <View style={s.priceRow}>
                  <Text style={[s.price, { color: colors.text }]}>
                    {doc.price}<Text style={[s.perSession, { color: colors.textMuted }]}>/session</Text>
                  </Text>
                  <Pressable>
                    <Text style={[s.chatNow, { color: pink }]}>Chat Now →</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Privacy notice ── */}
        <View style={[s.privacyCard, { backgroundColor: pinkLite, borderColor: `${pink}33` }]}>
          <ShieldIcon color={pink} />
          <View style={s.privacyText}>
            <Text style={[s.privacyTitle, { color: pink }]}>Your Privacy is Protected</Text>
            <Text style={[s.privacyBody, { color: colors.textMuted }]}>
              End-to-end encrypted consultations. Never share phone numbers or social media handles for your own safety.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1 },
  padH:  { paddingHorizontal: 20 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  screenTitle: { fontSize: 22, fontWeight: "800" },
  bellWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  bellDot: {
    position: "absolute", top: 8, right: 9,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#d13a8b", borderWidth: 1.5, borderColor: "#fff",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Filters
  filtersRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 13, fontWeight: "600" },

  // Section header
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  foundText:    { fontSize: 13, fontWeight: "700" },

  // Doctor card
  docCard: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrap: {
    width: 68, height: 68, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, position: "relative",
  },
  avatarEmoji: { fontSize: 32 },
  onlineDot: {
    position: "absolute", bottom: 4, right: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2, borderColor: "#fff",
  },
  docInfo:  { flex: 1 },
  nameRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  docName:  { fontSize: 15, fontWeight: "800", flex: 1, marginRight: 6 },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  docRole:  { fontSize: 12, marginBottom: 8 },
  tagsRow:  { flexDirection: "row", gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText:  { fontSize: 11, fontWeight: "700" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price:    { fontSize: 15, fontWeight: "800" },
  perSession: { fontSize: 12, fontWeight: "400" },
  chatNow:  { fontSize: 14, fontWeight: "800" },

  // Privacy card
  privacyCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    alignItems: "flex-start",
  },
  privacyText:  { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  privacyBody:  { fontSize: 12, lineHeight: 18 },
});
