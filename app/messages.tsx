import { DOCTOR_ACCENT } from "@/constants/brand";
import { STATE_LABEL, timeline } from "@/lib/consultation";
import { getMyChats } from "@/lib/services/chats";
import { getMyConsultations } from "@/lib/services/consultations";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarCheck, ChevronRight, MessageCircle, ShieldCheck } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type ChatListItem = {
  /** Opens the chat: the doctor's id for patients, the chat id for doctors. */
  _id: string;
  name: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  /** Messages you haven't read. */
  unread: number;
  /** Doctors: the patient wrote last. */
  waiting: boolean;
};

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MessagesScreen() {
  const { colors, isDark } = useTheme();
  const { role } = useAuth();
  const router = useRouter();
  const accent = role === "doctor" ? DOCTOR_ACCENT : colors.primary;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<ChatListItem[]>([]);

  // Your conversations (GET /chats/mine). Patients also see doctors they've
  // booked but not written to yet, so a new booking shows straight away.
  const loadChats = useCallback(async () => {
    const me = role === "doctor" ? "doctor" : "patient";
    const [chatsRes, bookingsRes] = await Promise.all([getMyChats(me), me === "patient" ? getMyConsultations() : null]);
    if (!chatsRes.ok) return false;
    const items: ChatListItem[] = chatsRes.data.map((c) => ({
      _id: c.id,
      name: c.name,
      lastMessageAt: c.lastAt,
      lastMessagePreview: c.lastText,
      unread: c.unread,
      waiting: me === "doctor" && c.lastFrom === "patient",
    }));
    if (bookingsRes?.ok) {
      const now = new Date();
      for (const booking of bookingsRes.data) {
        if (!booking.doctorId || items.some((item) => item._id === booking.doctorId)) continue;
        const state = timeline(booking, now).state;
        items.push({
          _id: booking.doctorId,
          name: booking.doctor?.name ?? "Your doctor",
          lastMessageAt: booking.bookedAt,
          lastMessagePreview: `Consultation · ${STATE_LABEL[state].label}`,
          unread: 0,
          waiting: false,
        });
      }
    }
    setChats(items);
    return true;
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadChats();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [loadChats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        {router.canGoBack() ? (
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <BackIcon color={colors.text} />
          </Pressable>
        ) : (
          <View style={s.headerBtn} />
        )}
        <View style={{ alignItems: "center" }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Messages</Text>
          {!!chats.length && (
            <Text style={[s.headerSubtitle, { color: colors.textMuted }]}>
              {chats.length} conversation{chats.length === 1 ? "" : "s"}
            </Text>
          )}
        </View>
        <View style={s.headerBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          {!!chats.length && (
            <View style={[s.privacyBanner, { backgroundColor: `${accent}10`, borderColor: `${accent}24` }]}>
              <View style={[s.privacyIcon, { backgroundColor: `${accent}18` }]}>
                <ShieldCheck size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.privacyTitle, { color: colors.text }]}>Private consultations</Text>
                <Text style={[s.privacyCopy, { color: colors.textMuted }]}>{role === "doctor" ? "Contact details are automatically blocked in chat." : "Your private conversations with specialists. Chats open when a consultation starts."}</Text>
              </View>
            </View>
          )}

          {!!chats.length && <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT CONVERSATIONS</Text>}

          {!chats.length ? (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: `${accent}14` }]}>
                <MessageCircle size={28} color={accent} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>
                {role === "doctor"
                  ? "Conversations with your patients will show up here."
                  : "Start a consultation with a doctor to see it here."}
              </Text>
            </View>
          ) : (
            chats.map((chat) => {
              const badge = chat.unread > 0 ? `${chat.unread} new message${chat.unread === 1 ? "" : "s"}` : chat.waiting ? "Waiting for your reply" : null;
              return (
                <Pressable
                  key={chat._id}
                  style={({ pressed }) => [
                    s.row,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
                  ]}
                  onPress={() => router.push(`/consultation/${chat._id}`)}
                >
                  <View style={[s.avatar, { backgroundColor: `${accent}1F`, borderColor: `${accent}2F` }]}>
                    <Text style={{ color: accent, fontWeight: "800", fontSize: 15 }}>{initials(chat.name)}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={s.rowTop}>
                      <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                        {chat.name || "Unknown"}
                      </Text>
                      {!!chat.lastMessageAt && (
                        <Text style={[s.time, { color: colors.textMuted }]}>{timeAgo(chat.lastMessageAt)}</Text>
                      )}
                    </View>
                    <Text style={[s.preview, { color: colors.textMuted }]} numberOfLines={1}>
                      {chat.lastMessagePreview || "No messages yet"}
                    </Text>
                    {badge && (
                      <View style={[s.slotBadge, { backgroundColor: isDark ? "#052e1a" : "#d1fae5" }]}>
                        <CalendarCheck size={11} color="#059669" />
                        <Text style={s.slotBadgeText}>{badge}</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  headerSubtitle: { fontSize: 11, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  privacyBanner: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 18 },
  privacyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  privacyTitle: { fontSize: 13, fontWeight: "800" },
  privacyCopy: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  sectionLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1, marginBottom: 10, marginLeft: 2 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 11,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 9, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 11 },
  preview: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  slotBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 7, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  slotBadgeText: { color: "#059669", fontSize: 10.5, fontWeight: "700" },

  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },
});
