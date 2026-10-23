import { AdBanner } from "@/components";
import { DoctorGridCard } from "@/components/doctors";
import { FEED_AD_FREQUENCY } from "@/lib/ads";
import { getDoctors } from "@/lib/services/doctors";
import { getMyNotifications, markAllNotificationsRead } from "@/lib/services/misc";
import type { InboxItem } from "@/lib/notifications";
import type { Availability, Doctor } from "@/lib/types";
import { type DoctorConsultation, useMyConsultations } from "@/lib/useMyConsultations";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell, CalendarCheck, MessageCircle, Search, SlidersHorizontal, Stethoscope } from "lucide-react-native";
import { Fragment, useCallback, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DoctorGridSkeleton } from "@/components/ui/Skeleton";

// Get help → Find a specialist. Same as the webapp's /patient/doctors:
// search, filters, "Your doctors" first, then every verified specialist.

const GRID_PAD = 20; // matches s.padH
const GRID_GAP = 12;

type Sort = "recommended" | "rating" | "experience" | "fee";
const AVAILABILITY_RANK: Record<Availability, number> = { online: 0, today: 1, this_week: 2, away: 3 };
/** "Your doctors" order: open consultations first, then the most recent. */
const STATE_RANK: Record<DoctorConsultation["state"], number> = { active: 0, upcoming: 1, follow_up: 2, closed: 3, refunded: 4 };

const initialFilters = {
  query: "",
  specialization: "all",
  availability: "any" as "any" | Availability,
  experience: 0,
  rating: 0,
  sort: "recommended" as Sort,
};
type Filters = typeof initialFilters;

const AVAILABILITY_OPTIONS: { value: Filters["availability"]; label: string }[] = [
  { value: "any", label: "Any availability" },
  { value: "online", label: "Online now" },
  { value: "today", label: "Available today" },
  { value: "this_week", label: "This week" },
];
const EXPERIENCE_OPTIONS = [
  { value: 0, label: "Any experience" },
  { value: 5, label: "5+ years" },
  { value: 10, label: "10+ years" },
  { value: 15, label: "15+ years" },
];
const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 4.5, label: "4.5 ★ and up" },
  { value: 4.8, label: "4.8 ★ and up" },
];
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "experience", label: "Most experienced" },
  { value: "fee", label: "Lowest fee" },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { byDoctor: mine, reload: reloadMine } = useMyConsultations();
  const accent = colors.primary;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    const [list, inbox] = await Promise.all([getDoctors(), getMyNotifications(30)]);
    if (list.ok) {
      setDoctors(list.data);
      setError(null);
    } else {
      setError(list.message);
    }
    if (inbox.ok) {
      setNotifications(inbox.data.items);
      setUnread(inbox.data.unread);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), reloadMine()]);
    setRefreshing(false);
  };

  const openNotifications = () => {
    setNotifOpen(true);
    if (unread > 0) {
      setUnread(0);
      void markAllNotificationsRead();
    }
  };

  const specializations = useMemo(() => [...new Set(doctors.map((d) => d.specialization).filter(Boolean))].sort(), [doctors]);

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return doctors
      .filter((d) => !q || `${d.name} ${d.specialization} ${d.focusAreas.join(" ")}`.toLowerCase().includes(q))
      .filter((d) => filters.specialization === "all" || d.specialization === filters.specialization)
      .filter((d) => filters.availability === "any" || AVAILABILITY_RANK[d.availability] <= AVAILABILITY_RANK[filters.availability])
      .filter((d) => d.experienceYears >= filters.experience)
      .filter((d) => d.rating >= filters.rating)
      .sort((a, b) => {
        switch (filters.sort) {
          case "rating":
            return b.rating - a.rating || b.reviewCount - a.reviewCount;
          case "experience":
            return b.experienceYears - a.experienceYears;
          case "fee":
            return a.feeGBP - b.feeGBP;
          default:
            return Number(!!b.recommended) - Number(!!a.recommended) || AVAILABILITY_RANK[a.availability] - AVAILABILITY_RANK[b.availability] || b.rating - a.rating;
        }
      });
  }, [doctors, filters]);

  const active = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  // Doctors the patient has booked, shown first ("Your doctors") unless a filter is on.
  const yourDoctors = active
    ? []
    : visible
        .filter((d) => mine.has(d.id))
        .sort((a, b) => {
          const x = mine.get(a.id)!;
          const y = mine.get(b.id)!;
          return STATE_RANK[x.state] - STATE_RANK[y.state] || y.startsAt.getTime() - x.startsAt.getTime();
        });
  const others = yourDoctors.length ? visible.filter((d) => !mine.has(d.id)) : visible;

  // Grid: 2 columns on phones, 3 on wide screens; an ad after every group of
  // full rows (about FEED_AD_FREQUENCY cards).
  const { width: screenWidth } = useWindowDimensions();
  const columns = screenWidth >= 700 ? 3 : 2;
  const cardWidth = Math.floor((screenWidth - GRID_PAD * 2 - GRID_GAP * (columns - 1)) / columns);
  const perGroup = Math.max(columns, Math.round(FEED_AD_FREQUENCY / columns) * columns);
  const feedGroups = useMemo(() => {
    const groups: Doctor[][] = [];
    for (let i = 0; i < others.length; i += perGroup) groups.push(others.slice(i, i + perGroup));
    return groups;
  }, [others, perGroup]);
  const open = (doctor: Doctor) => router.push(`/doctor/${doctor.id}`);

  const chipRow = <T extends string | number>(options: { value: T; label: string }[], value: T, onChange: (v: T) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[s.pill, on ? { backgroundColor: accent, borderColor: accent } : { borderColor: colors.border }]}>
            <Text style={[s.pillText, { color: on ? "#fff" : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* ── Header ── */}
        <View style={s.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={[s.screenTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Find a specialist</Text>
          </View>
          <View style={s.iconRow}>
            <Pressable accessibilityLabel="My consultations" style={[s.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={() => router.push("/consultations")}>
              <CalendarCheck size={19} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Messages" style={[s.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={() => router.push("/messages")}>
              <MessageCircle size={19} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Notifications" style={[s.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={openNotifications}>
              <Bell size={19} color={colors.text} />
              {unread > 0 && <View style={s.badgeDot} />}
            </Pressable>
          </View>
        </View>

        {/* ── Search + filters ── */}
        <View style={[s.searchRow, s.padH]}>
          <View style={[s.searchBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Search size={17} color={colors.textMuted} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Search by name or concern, e.g. PCOS"
              placeholderTextColor={colors.textMuted}
              value={filters.query}
              onChangeText={(v) => set("query", v)}
              returnKeyType="search"
            />
          </View>
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            accessibilityState={{ expanded: showFilters }}
            style={[s.filterBtn, { borderColor: showFilters ? accent : colors.border, backgroundColor: showFilters ? colors.primaryLight : colors.surfaceElevated }]}
          >
            <SlidersHorizontal size={16} color={showFilters ? accent : colors.text} />
            <Text style={{ color: showFilters ? accent : colors.text, fontWeight: "700", fontSize: 13 }}>Filters</Text>
          </Pressable>
        </View>

        {showFilters && (
          <View style={s.filterPanel}>
            {chipRow([{ value: "all", label: "All specialisations" }, ...specializations.map((v) => ({ value: v, label: v }))], filters.specialization, (v) => set("specialization", v))}
            {chipRow(AVAILABILITY_OPTIONS, filters.availability, (v) => set("availability", v))}
            {chipRow(EXPERIENCE_OPTIONS, filters.experience, (v) => set("experience", v))}
            {chipRow(RATING_OPTIONS, filters.rating, (v) => set("rating", v))}
            {chipRow(SORT_OPTIONS, filters.sort, (v) => set("sort", v))}
          </View>
        )}

        <View style={[s.countRow, s.padH]}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {visible.length} specialist{visible.length === 1 ? "" : "s"}
          </Text>
          {active && (
            <Pressable onPress={() => setFilters(initialFilters)}>
              <Text style={{ color: accent, fontWeight: "700", fontSize: 13 }}>Clear filters</Text>
            </Pressable>
          )}
        </View>

        <View style={s.padH}>
          {loading ? (
            <DoctorGridSkeleton count={4} />
          ) : error && !doctors.length ? (
            <Pressable onPress={() => void load()} style={[s.empty, { borderColor: colors.border }]}>
              <Text style={{ color: colors.danger, fontSize: 13, textAlign: "center" }}>{error}</Text>
              <Text style={{ color: accent, fontWeight: "700", marginTop: 6 }}>Tap to try again</Text>
            </Pressable>
          ) : (
            <>
              {yourDoctors.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Your doctors</Text>
                  <Text style={[s.sectionSub, { color: colors.textMuted }]}>Specialists you've booked a consultation with.</Text>
                  <View style={s.grid}>
                    {yourDoctors.map((doctor) => (
                      <DoctorGridCard key={doctor.id} doctor={doctor} width={cardWidth} consultation={mine.get(doctor.id)} onPress={() => open(doctor)} />
                    ))}
                  </View>
                  {others.length > 0 && <Text style={[s.sectionTitle, { color: colors.text, marginTop: 10, marginBottom: 12 }]}>All specialists</Text>}
                </View>
              )}

              {visible.length === 0 ? (
                <View style={[s.empty, { borderColor: colors.border }]}>
                  <Stethoscope size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.text, fontWeight: "800", marginTop: 10 }}>No specialists match</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Try removing a filter to see more doctors.</Text>
                </View>
              ) : (
                // Two cards a row (three on wide screens), with an ad between
                // groups of full rows.
                feedGroups.map((group, i) => (
                  <Fragment key={group[0]!.id}>
                    <View style={s.grid}>
                      {group.map((doctor) => (
                        <DoctorGridCard key={doctor.id} doctor={doctor} width={cardWidth} consultation={mine.get(doctor.id)} onPress={() => open(doctor)} />
                      ))}
                    </View>
                    {i < feedGroups.length - 1 && <AdBanner placement="doctors-feed" />}
                  </Fragment>
                ))
              )}
              {visible.length > 0 && visible.length < FEED_AD_FREQUENCY && <AdBanner placement="doctors-feed" />}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Notifications ── */}
      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setNotifOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface, maxHeight: "70%" }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Notifications</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!notifications.length ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 20 }}>No notifications yet.</Text>
            ) : (
              notifications.map((n) => (
                <View key={n.id} style={[m.row, { borderBottomColor: colors.border }]}>
                  <Text style={[m.rowTitle, { color: colors.text }]}>{n.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{n.body}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  padH: { paddingHorizontal: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP, marginBottom: GRID_GAP },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 10 },
  screenTitle: { fontSize: 24, fontWeight: "800" },
  iconRow: { flexDirection: "row", gap: 7 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badgeDot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },

  searchRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12 },
  filterPanel: { marginTop: 12, gap: 8 },
  chipRow: { paddingHorizontal: 20, gap: 7 },
  pill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  pillText: { fontSize: 12.5, fontWeight: "600" },

  countRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  sectionSub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  empty: { alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderRadius: 20, paddingVertical: 34, paddingHorizontal: 20, marginTop: 6 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 14, fontWeight: "700" },
});
