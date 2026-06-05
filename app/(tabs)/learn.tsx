import { useTheme } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Polyline, Rect } from "react-native-svg";

// ── Brand ────────────────────────────────────────────────────────────────────
const PINK      = "#d13a8b";  // primary — overridden by colors.primary inside component
const PINK_LITE = "#fce7f5";
const PURPLE    = "#834d8b";
const TEAL      = "#217580";

// ── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function BookmarkIcon({ color, filled = false }: { color: string; filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FILTERS = ["All Topics", "Periods", "Pregnancy", "Menopause", "Fertility", "Wellness"];

const FEATURED = {
  badge:    "FEATURED STORY",
  title:    "My Journey: Understanding Endometriosis & Finding Balance",
  author:   "By Sarah Jenkins",
  readTime: "6 min read",
  gradient: ["#c97b6e", "#7b3f6e"] as [string, string],
  emoji:    "🧘‍♀️",
};

const ARTICLES = [
  {
    category: "WELLNESS",
    categoryColor: PINK,
    categoryBg:    PINK_LITE,
    title:    "Nutrition Tips for Hormonal Balance",
    readTime: "4 min read",
    emoji:    "🥑",
    bg:       "#e8f5e9",
  },
  {
    category: "FERTILITY",
    categoryColor: PURPLE,
    categoryBg:    "#f5ebfa",
    title:    "Understanding Your Ovulation Window",
    readTime: "5 min read",
    emoji:    "🌸",
    bg:       "#f5ebfa",
  },
  {
    category: "MENOPAUSE",
    categoryColor: TEAL,
    categoryBg:    "#e0f7f7",
    title:    "Managing Hot Flashes Naturally",
    readTime: "3 min read",
    emoji:    "🌿",
    bg:       "#e0f7f7",
  },
  {
    category: "PERIODS",
    categoryColor: PINK,
    categoryBg:    PINK_LITE,
    title:    "Why Your Cycle Changes in Your 30s",
    readTime: "6 min read",
    emoji:    "📅",
    bg:       "#fff0f7",
  },
];

// ── Screen ───────────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const { colors } = useTheme();
  const PINK      = colors.primary;
  const PINK_LITE = colors.primaryLight;
  const [activeFilter, setActiveFilter] = useState("All Topics");
  const [bookmarked, setBookmarked] = useState<number[]>([]);

  const toggleBookmark = (i: number) =>
    setBookmarked((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Learn</Text>
        <View style={s.topIcons}>
          <Pressable style={[s.iconBtn, { backgroundColor: colors.surface }]}>
            <SearchIcon color={colors.text} />
          </Pressable>
          <Pressable style={[s.iconBtn, { backgroundColor: colors.surface }]}>
            <BookmarkIcon color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

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
                onPress={() => setActiveFilter(f)}
                style={[
                  s.filterPill,
                  active
                    ? { backgroundColor: PINK, borderColor: PINK }
                    : { backgroundColor: "transparent", borderColor: colors.border },
                ]}
              >
                <Text style={[s.filterText, { color: active ? "#fff" : colors.textMuted }]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Featured Story card ── */}
        <View style={s.padH}>
          <View style={[s.featuredCard, { overflow: "hidden" }]}>
            {/* Background gradient as image placeholder */}
            <LinearGradient
              colors={FEATURED.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.featuredBg}
            >
              <Text style={s.featuredEmoji}>{FEATURED.emoji}</Text>
            </LinearGradient>

            {/* Dark overlay */}
            <View style={s.featuredOverlay} />

            {/* Bookmark top-right */}
            <Pressable style={s.featuredBookmark}>
              <BookmarkIcon color="#fff" filled={false} />
            </Pressable>

            {/* Content */}
            <View style={s.featuredContent}>
              <View style={s.featuredBadge}>
                <Text style={s.featuredBadgeText}>{FEATURED.badge}</Text>
              </View>
              <Text style={s.featuredTitle}>{FEATURED.title}</Text>
              <View style={s.featuredMeta}>
                <View style={s.authorAvatar}>
                  <Text style={{ fontSize: 10 }}>👩</Text>
                </View>
                <Text style={s.featuredMetaText}>
                  {FEATURED.author} · {FEATURED.readTime}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Latest Articles ── */}
        <View style={[s.sectionHeader, s.padH]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Latest Articles</Text>
          <Pressable>
            <Text style={[s.viewAll, { color: PINK }]}>View All</Text>
          </Pressable>
        </View>

        <View style={s.padH}>
          {ARTICLES.map((a, i) => (
            <Pressable key={i} style={[s.articleCard, { backgroundColor: colors.surface }]}>
              {/* Thumbnail */}
              <View style={[s.thumbnail, { backgroundColor: a.bg }]}>
                <Text style={s.thumbnailEmoji}>{a.emoji}</Text>
              </View>

              {/* Text */}
              <View style={s.articleBody}>
                <Text style={[s.articleCategory, { color: a.categoryColor }]}>
                  {a.category}
                </Text>
                <Text style={[s.articleTitle, { color: colors.text }]} numberOfLines={2}>
                  {a.title}
                </Text>
                <Text style={[s.articleMeta, { color: colors.textMuted }]}>
                  {a.readTime}
                </Text>
              </View>

              {/* Bookmark */}
              <Pressable
                onPress={() => toggleBookmark(i)}
                style={s.articleBookmark}
              >
                <BookmarkIcon
                  color={bookmarked.includes(i) ? PINK : colors.textMuted}
                  filled={bookmarked.includes(i)}
                />
              </Pressable>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  padH:   { paddingHorizontal: 20 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  screenTitle: { fontSize: 26, fontWeight: "800" },
  topIcons:    { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },

  // Filters
  filtersRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 13, fontWeight: "600" },

  // Featured card
  featuredCard: {
    borderRadius: 20,
    height: 220,
    marginBottom: 24,
    position: "relative",
  },
  featuredBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredEmoji: { fontSize: 80, opacity: 0.4 },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 20,
  },
  featuredBookmark: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
  },
  featuredContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredBadge: {
    backgroundColor: PINK,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
    marginBottom: 10,
  },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  featuredMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  viewAll:      { fontSize: 14, fontWeight: "700" },

  // Article card
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  thumbnailEmoji: { fontSize: 32 },
  articleBody: { flex: 1 },
  articleCategory: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 5,
  },
  articleMeta:     { fontSize: 12, fontWeight: "400" },
  articleBookmark: { padding: 4 },
});
