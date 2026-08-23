import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type ChatListItem = {
  _id: string;
  patient?: { _id: string; name?: string; phone?: string };
  doctor?: { _id: string; name?: string; phone?: string };
  lastMessageAt?: string;
  lastMessagePreview?: string;
};

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ConsultationsScreen() {
  const { colors } = useTheme();
  const { token, role } = useAuth();
  const router = useRouter();
  const accent = role === "doctor" ? DOCTOR_ACCENT : colors.primary;

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const result = await api<{ success: boolean; data: ChatListItem[] }>("/api/chats", {
          token: token ?? undefined,
        });
        if (active && result.ok) setChats(result.data.data);
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [token])
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        {router.canGoBack() ? (
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <BackIcon color={colors.text} />
          </Pressable>
        ) : (
          <View style={s.headerBtn} />
        )}
        <Text style={[s.headerTitle, { color: colors.text }]}>My Consultations</Text>
        <View style={s.headerBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {!chats.length ? (
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
              No conversations yet.
            </Text>
          ) : (
            chats.map((chat) => {
              const other = role === "doctor" ? chat.patient : chat.doctor;
              return (
                <Pressable
                  key={chat._id}
                  style={[s.row, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/consultation/${chat._id}`)}
                >
                  <View style={[s.avatar, { backgroundColor: accent + "1A" }]}>
                    <Text style={{ fontSize: 20 }}>{role === "doctor" ? "🙋" : "👩‍⚕️"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.name, { color: colors.text }]}>{other?.name || "Unknown"}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
                      {chat.lastMessagePreview || "No messages yet"}
                    </Text>
                  </View>
                  {chat.lastMessageAt && (
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(chat.lastMessageAt)}</Text>
                  )}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800" },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
});
