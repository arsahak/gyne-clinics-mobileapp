import { HERO_GRADIENT } from "@/constants/brand";
import { AdBanner } from "@/components";
import type { ChatSummary } from "@/lib/chat";
import { timeline } from "@/lib/consultation";
import { formatMoney } from "@/lib/locale/regions";
import { getMyChats } from "@/lib/services/chats";
import { getMyConsultations } from "@/lib/services/consultations";
import { getDoctorReviews, getMyDoctor, setOnline } from "@/lib/services/doctors";
import { type Earnings, getMyEarnings, getMyNotifications, markAllNotificationsRead } from "@/lib/services/misc";
import type { Consultation, Review } from "@/lib/types";
import type { InboxItem } from "@/lib/notifications";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { isSameDay } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { CalendarClock, CheckCircle2, ChevronRight, Star, Wallet } from "lucide-react-native";
import { DoctorHomeSkeleton } from "@/components/ui/Skeleton";

// The doctor's day, from the backend (same data as the webapp's doctor
// dashboard): consultations, patients waiting for a reply, earnings, the
// latest review, and whether new chats are open.

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFullDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}
function doctorName(name?: string | null) {
  return name?.trim().replace(/^dr\.?\s+/i, "") || "Doctor";
}
function minutesUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / 60_000);
}
function initials(name?: string | null) {
  const normalized = doctorName(name);
  if (normalized === "Doctor") return "DR";
  return normalized.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatWeekday(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}
function nameInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "P";
}

const GOLD = "#c69a3c";

/** Section title with an optional count and a link on the right. */
function SectionHeader({ title, count, action }: { title: string; count?: number; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      {!!count && (
        <View style={[s.countPill, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[s.countText, { color: colors.primary }]}>{count}</Text>
        </View>
      )}
      <View style={{ flex: 1 }} />
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[s.sectionLink, { color: colors.primary }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Day and month in a small tile. */
function DateTile({ date }: { date: Date }) {
  const { colors } = useTheme();
  return (
    <View style={[s.dateTile, { backgroundColor: colors.primary + "14" }]}>
      <Text style={[s.dateDay, { color: colors.primary }]}>{date.getDate()}</Text>
      <Text style={[s.dateMonth, { color: colors.primary }]}>{date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</Text>
    </View>
  );
}

/** The patient's photo, or initials on their colour. */
function PersonAvatar({ name, hue, uri }: { name: string; hue: number; uri?: string }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) return <Image source={{ uri }} style={s.personAvatar} onError={() => setFailed(true)} />;
  return (
    <View style={[s.personAvatar, { backgroundColor: `hsl(${hue}, 45%, 92%)` }]}>
      <Text style={[s.personInitials, { color: `hsl(${hue}, 45%, 35%)` }]}>{nameInitials(name)}</Text>
    </View>
  );
}

/** A quiet one-line empty state inside a card. */
function EmptyRow({ icon, text }: { icon: ReactNode; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.emptyRow}>
      {icon}
      <Text style={[s.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

type Dashboard = {
  consultations: Consultation[];
  chats: ChatSummary[];
  earnings: Earnings | null;
  rating: number | null;
  reviewCount: number;
  latestReview: Review | null;
  online: boolean;
};

// ─── main screen ────────────────────────────────────────────────────────────

export default function DoctorHomeScreen() {
  const { colors } = useTheme();
  const { account } = useAuth();
  const router = useRouter();
  const accent = colors.primary;
  const accentBg = accent + "18";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Dashboard | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);

  const loadData = useCallback(async () => {
    const [consultations, chats, earnings, me, inbox] = await Promise.all([
      getMyConsultations(),
      getMyChats("doctor"),
      getMyEarnings(),
      getMyDoctor(),
      getMyNotifications(30),
    ]);
    const reviews = me ? await getDoctorReviews(me.id) : { reviews: [] };
    setData({
      consultations: consultations.ok ? consultations.data : [],
      chats: chats.ok ? chats.data : [],
      earnings: earnings.ok ? earnings.data : null,
      rating: me && me.reviewCount ? me.rating : null,
      reviewCount: me?.reviewCount ?? 0,
      latestReview: reviews.reviews[0] ?? null,
      online: Boolean(me?.isOnline),
    });
    if (inbox.ok) {
      setNotifications(inbox.data.items);
      setUnread(inbox.data.unread);
    }
    setAvatarFailed(false);
  }, []);

  // Refetch every time this screen gains focus, so bookings and chats stay current.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadData();
        if (active) setLoading(false);
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

  const toggleOnline = async (next: boolean) => {
    if (!data || savingOnline) return;
    setData({ ...data, online: next });
    setSavingOnline(true);
    const result = await setOnline(next);
    setSavingOnline(false);
    if (!result.ok) {
      setData((d) => (d ? { ...d, online: !next } : d));
      Alert.alert("Couldn't update", result.message);
    }
  };

  const openNotifications = () => {
    setNotifOpen(true);
    if (unread > 0) {
      setUnread(0);
      void markAllNotificationsRead();
    }
  };

  /** The chat with this consultation's patient. */
  const openChat = (c: Consultation) => {
    const chat = data?.chats.find((ch) => ch.patientId && ch.patientId === c.patient?.id);
    if (chat) router.push(`/consultation/${chat.id}`);
    else Alert.alert(c.patient?.name ?? "Patient", `${c.concern}\n\nThe chat appears here once the patient writes. Ref ${c.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <DoctorHomeSkeleton />
      </SafeAreaView>
    );
  }

  const now = new Date();
  const withState = (data?.consultations ?? []).map((c) => ({ c, t: timeline(c, now) }));
  // Running now, or starting later today.
  const today = withState
    .filter(({ t }) => t.state === "active" || (t.state === "upcoming" && isSameDay(t.startsAt, now)))
    .sort((a, b) => a.c.startsAt.localeCompare(b.c.startsAt));
  const upcoming = withState
    .filter(({ t }) => t.state === "upcoming" && !isSameDay(t.startsAt, now))
    .sort((a, b) => a.c.startsAt.localeCompare(b.c.startsAt));
  const waiting = (data?.chats ?? []).filter((c) => c.lastFrom === "patient");
  const available = data?.earnings?.balance.availableGBP;
  const hasPhoto = Boolean(account?.avatar) && !avatarFailed;
  const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border };

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
            {/* A photo sits on white (it may have a transparent background); initials on the brand colour */}
            <View style={[s.avatar, { backgroundColor: hasPhoto ? colors.surface : accent, borderWidth: hasPhoto ? 1 : 0, borderColor: colors.border }]}>
              {hasPhoto ? (
                <Image source={{ uri: account?.avatar }} style={s.avatarImage} onError={() => setAvatarFailed(true)} />
              ) : (
                <Text style={s.avatarInitials}>{initials(account?.fullName)}</Text>
              )}
            </View>
            <View style={s.ml10}>
              <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting()}</Text>
              <Text style={[s.name, { color: colors.text }]}>{doctorName(account?.fullName)}</Text>
            </View>
          </View>
          <Pressable style={[s.bellBtn, { backgroundColor: accentBg }]} onPress={openNotifications}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            {unread > 0 && <View style={s.bellBadge} />}
          </Pressable>
        </View>

        {/* ── Hero card ── */}
        <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View style={s.dropletWatermark} pointerEvents="none">
            <Svg width={130} height={130} viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
              <Path d="M12 2l7 8a9 9 0 1 1-14 0z" stroke="none" />
            </Svg>
          </View>

          <Text style={s.heroLabel}>{formatFullDate(now)}</Text>
          <Text style={s.heroTitle}>Here's your day at a glance</Text>

          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{today.length}</Text>
              <Text style={s.heroStatLabel}>Today's Consultations</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{waiting.length}</Text>
              <Text style={s.heroStatLabel}>Waiting for You</Text>
            </View>
          </View>

          <View style={s.onlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.onlineTitle}>{data?.online ? "You're online" : "You're offline"}</Text>
              <Text style={s.onlineSub}>{data?.online ? "Patients can start new chats" : "New chats are paused"}</Text>
            </View>
            <Switch
              value={Boolean(data?.online)}
              onValueChange={toggleOnline}
              disabled={savingOnline}
              trackColor={{ true: "#c6add1", false: "rgba(255,255,255,0.35)" }}
              thumbColor="#fff"
            />
          </View>
        </LinearGradient>

        {/* ── Ad banner (F1) ── */}
        <AdBanner placement="doctor-dashboard" />

        {/* ── Today's Consultations ── */}
        <SectionHeader
          title="Today's Consultations"
          count={today.length}
          action={{ label: "Schedule", onPress: () => router.push("/(doctor-tabs)/availability") }}
        />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!today.length ? (
            <EmptyRow icon={<CalendarClock size={18} color={colors.textMuted} />} text="No consultations today." />
          ) : (
            today.map(({ c, t }, i) => {
              const minsAway = minutesUntil(t.startsAt);
              return (
                <Pressable key={c.id} onPress={() => openChat(c)} style={({ pressed }) => [s.row, i > 0 && divider, pressed && s.pressed]}>
                  <DateTile date={t.startsAt} />
                  <View style={s.rowBody}>
                    <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{c.patient?.name || "Patient"}</Text>
                    <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {c.mode === "instant" ? "Chat now" : formatTime(t.startsAt)} · {c.concern}
                    </Text>
                  </View>
                  {t.state === "active" ? (
                    <View style={[s.pill, { backgroundColor: "#dcfce7" }]}>
                      <View style={[s.pillDot, { backgroundColor: "#16a34a" }]} />
                      <Text style={[s.pillText, { color: "#15803d" }]}>Open</Text>
                    </View>
                  ) : minsAway > 0 && minsAway <= 60 ? (
                    <View style={[s.pill, { backgroundColor: accentBg }]}>
                      <Text style={[s.pillText, { color: accent }]}>in {minsAway}m</Text>
                    </View>
                  ) : (
                    <ChevronRight size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* ── Upcoming Consultations ── */}
        <SectionHeader title="Upcoming Consultations" count={upcoming.length} />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!upcoming.length ? (
            <EmptyRow icon={<CalendarClock size={18} color={colors.textMuted} />} text="Nothing upcoming." />
          ) : (
            upcoming.slice(0, 10).map(({ c, t }, i) => (
              <Pressable key={c.id} onPress={() => openChat(c)} style={({ pressed }) => [s.row, i > 0 && divider, pressed && s.pressed]}>
                <DateTile date={t.startsAt} />
                <View style={s.rowBody}>
                  <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{c.patient?.name || "Patient"}</Text>
                  <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {formatWeekday(t.startsAt)}, {formatTime(t.startsAt)} · {c.concern}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>

        {/* ── Patients waiting for a reply ── */}
        <SectionHeader
          title="Waiting for Your Reply"
          count={waiting.length}
          action={waiting.length ? { label: "All chats", onPress: () => router.push("/(doctor-tabs)/chat") } : undefined}
        />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!waiting.length ? (
            <EmptyRow icon={<CheckCircle2 size={18} color="#16a34a" />} text="You're all caught up." />
          ) : (
            waiting.map((chat, i) => (
              <Pressable
                key={chat.id}
                onPress={() => router.push(`/consultation/${chat.id}`)}
                style={({ pressed }) => [s.row, i > 0 && divider, pressed && s.pressed]}
              >
                <View>
                  <PersonAvatar name={chat.name} hue={chat.hue} uri={chat.avatar} />
                  <View style={[s.unreadDot, { borderColor: colors.surface }]} />
                </View>
                <View style={s.rowBody}>
                  <View style={s.rowTop}>
                    <Text style={[s.rowTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>{chat.name}</Text>
                    {!!chat.lastAt && <Text style={[s.rowTime, { color: colors.textMuted }]}>{timeAgo(chat.lastAt)}</Text>}
                  </View>
                  <Text style={[s.rowSub, { color: colors.textMuted }]} numberOfLines={1}>{chat.lastText ?? "New message"}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Earnings and reviews ── */}
        <SectionHeader title="Earnings & Reviews" />
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.statIcon, { backgroundColor: accentBg }]}>
              <Wallet size={18} color={accent} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{available === undefined ? "—" : formatMoney(available, "GBP")}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Available to withdraw</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.statIcon, { backgroundColor: "#fdf3dc" }]}>
              <Star size={18} color={GOLD} fill={GOLD} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{data?.rating ? data.rating.toFixed(1) : "—"}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>
              {data?.reviewCount ? `${data.reviewCount} review${data.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
            </Text>
          </View>
        </View>
        {data?.latestReview && (
          <View style={[s.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.rowTop}>
              <View style={{ flexDirection: "row", gap: 2, flex: 1 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={13}
                    color={i < Math.round(data.latestReview!.rating) ? GOLD : colors.border}
                    fill={i < Math.round(data.latestReview!.rating) ? GOLD : "transparent"}
                  />
                ))}
              </View>
              <Text style={[s.rowTime, { color: colors.textMuted }]}>Latest review</Text>
            </View>
            <Text style={[s.reviewText, { color: colors.text }]} numberOfLines={4}>“{data.latestReview.text}”</Text>
            <Text style={[s.rowSub, { color: colors.textMuted }]}>— {data.latestReview.author || "Patient"}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Notifications modal ── */}
      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setNotifOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface, maxHeight: "70%" }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Notifications</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!notifications.length ? (
              <Text style={[s.emptyText, { color: colors.textMuted, paddingVertical: 20 }]}>No notifications right now.</Text>
            ) : (
              notifications.map((n, i) => (
                <View key={n.id} style={[s.activityRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={{ fontSize: 16 }}>{n.read ? "🔔" : "🆕"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.apptName, { color: colors.text }]}>{n.title}</Text>
                    <Text style={[s.apptSub, { color: colors.textMuted }]}>{n.body}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(n.at)}</Text>
                </View>
              ))
            )}
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

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  avatarWrap: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ml10: { marginLeft: 10 },
  greeting: { fontSize: 12, fontWeight: "400" },
  name: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#fff" },

  heroCard: { borderRadius: 20, padding: 22, marginBottom: 20, overflow: "hidden", position: "relative" },
  dropletWatermark: { position: "absolute", right: -14, top: -18 },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", marginTop: 4, marginBottom: 18 },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1, alignItems: "flex-start" },
  heroStatValue: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600", marginTop: 2 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  onlineTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  onlineSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  heroStatDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: "rgba(255,255,255,0.35)", marginHorizontal: 16 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  sectionLink: { fontSize: 13, fontWeight: "700" },
  countPill: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 11.5, fontWeight: "800" },

  card: { borderRadius: 18, borderWidth: 1, marginBottom: 22, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pressed: { opacity: 0.6 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { fontSize: 14.5, fontWeight: "700" },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  rowTime: { fontSize: 11.5 },

  dateTile: { width: 44, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 17, fontWeight: "800", lineHeight: 20 },
  dateMonth: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },

  personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  personInitials: { fontSize: 14, fontWeight: "800" },
  unreadDot: { position: "absolute", right: 0, top: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, backgroundColor: "#ef4444" },

  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "800" },

  emptyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  emptyText: { fontSize: 13 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  statLabel: { fontSize: 12, marginTop: 2 },

  reviewCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 20, gap: 8 },
  reviewText: { fontSize: 14, lineHeight: 21 },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12 },
  apptName: { fontSize: 14, fontWeight: "700" },
  apptSub: { fontSize: 12, marginTop: 2 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
