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
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

// The doctor's day, from the backend (same data as the webapp's doctor
// dashboard): consultations, patients waiting for a reply, earnings, the
// latest review, and whether new chats are open.

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFullDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={accent} size="large" />
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
              {account?.avatar && !avatarFailed ? (
                <Image source={{ uri: account.avatar }} style={s.avatarImage} onError={() => setAvatarFailed(true)} />
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
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Today's Consultations</Text>
          <Pressable onPress={() => router.push("/(doctor-tabs)/availability")}>
            <Text style={[s.addLink, { color: accent }]}>Schedule</Text>
          </Pressable>
        </View>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {!today.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No consultations today.</Text>
          ) : (
            today.map(({ c, t }, i) => {
              const minsAway = minutesUntil(t.startsAt);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => openChat(c)}
                  style={[s.apptCard, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.apptName, { color: colors.text }]}>{c.patient?.name || "Patient"}</Text>
                      <Text style={[s.apptSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {c.mode === "instant" ? "Chat now" : formatTime(t.startsAt)} · {c.concern}
                      </Text>
                    </View>
                    {t.state === "active" ? (
                      <View style={[s.liveBadge, { backgroundColor: "#10b981" }]}>
                        <View style={s.liveDot} />
                        <Text style={s.liveBadgeText}>Open</Text>
                      </View>
                    ) : minsAway > 0 && minsAway <= 60 ? (
                      <View style={[s.soonBadge, { backgroundColor: accentBg }]}>
                        <Text style={[s.soonBadgeText, { color: accent }]}>in {minsAway}m</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* ── Upcoming Consultations ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Consultations</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {!upcoming.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Nothing upcoming.</Text>
          ) : (
            upcoming.slice(0, 10).map(({ c, t }, i) => (
              <Pressable
                key={c.id}
                onPress={() => openChat(c)}
                style={[s.apptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.apptName, { color: colors.text }]}>{c.patient?.name || "Patient"}</Text>
                  <Text style={[s.apptSub, { color: colors.textMuted }]}>
                    {formatShort(t.startsAt)}, {formatTime(t.startsAt)} · {c.id}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Patients waiting for a reply ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Waiting for Your Reply</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {!waiting.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>You're all caught up.</Text>
          ) : (
            waiting.map((chat, i) => (
              <Pressable
                key={chat.id}
                onPress={() => router.push(`/consultation/${chat.id}`)}
                style={[s.activityRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Text style={{ fontSize: 16 }}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.apptName, { color: colors.text }]}>{chat.name}</Text>
                  <Text style={[s.apptSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {chat.lastText ?? ""}
                  </Text>
                </View>
                {!!chat.lastAt && <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(chat.lastAt)}</Text>}
              </Pressable>
            ))
          )}
        </View>

        {/* ── Earnings and reviews ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Earnings & Reviews</Text>
        <View style={[s.card, { backgroundColor: colors.surface, marginBottom: 20 }]}>
          <View style={s.activityRow}>
            <Text style={{ fontSize: 16 }}>💷</Text>
            <Text style={[s.activityText, { color: colors.text }]}>Available to withdraw</Text>
            <Text style={[s.apptName, { color: colors.text }]}>{available === undefined ? "—" : formatMoney(available, "GBP")}</Text>
          </View>
          <View style={[s.activityRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={[s.activityText, { color: colors.text }]}>Average rating</Text>
            <Text style={[s.apptName, { color: colors.text }]}>
              {data?.rating ? `${data.rating.toFixed(1)} (${data.reviewCount})` : "—"}
            </Text>
          </View>
          {data?.latestReview && (
            <View style={[s.apptCard, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Text style={[s.apptSub, { color: colors.textMuted, marginTop: 0 }]}>Latest review · {"★".repeat(Math.round(data.latestReview.rating))}</Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 }}>“{data.latestReview.text}”</Text>
            </View>
          )}
        </View>
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

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  addLink: { fontSize: 13, fontWeight: "700" },

  card: { borderRadius: 18, padding: 6, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 16 },

  apptRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12 },
  apptCard: { paddingHorizontal: 10, paddingVertical: 12 },
  apptName: { fontSize: 14, fontWeight: "700" },
  apptSub: { fontSize: 12, marginTop: 2 },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  miniBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontSize: 10.5, fontWeight: "800" },
  soonBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  soonBadgeText: { fontSize: 10.5, fontWeight: "800" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12 },
  activityText: { flex: 1, fontSize: 13, fontWeight: "500" },
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
