import { AdBanner } from "@/components";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ── Types ─────────────────────────────────────────────────────────────────────
type DoctorUser = { _id: string; name?: string; phone?: string };
type Doctor = {
  _id: string;
  user: DoctorUser;
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
  languages?: string[];
  consultationTypes?: ("online" | "in_person")[];
  avgRating: number;
  reviewCount: number;
  featured: boolean;
};
type Notification = { _id: string; title: string; body: string; createdAt: string };

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
function MessageIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

const FILTERS = [
  { label: "All Filters", value: "" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Experienced", value: "experience" },
  { label: "Online Consultation", value: "online" },
];

// ── Screen ───────────────────────────────────────────────────────────────────
export default function HelpScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const pink = colors.primary;
  const pinkLite = colors.primaryLight;
  const teal = colors.teal;
  const tealLite = colors.tealLight;

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [starting, setStarting] = useState<string | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadDoctors = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (activeFilter === "rating" || activeFilter === "experience") params.set("sort", activeFilter);
    if (activeFilter === "online") params.set("consultationType", "online");

    const result = await api<{ success: boolean; data: Doctor[] }>(`/api/doctors?${params}`, {
      token: token ?? undefined,
    });
    if (result.ok) setDoctors(result.data.data);
  }, [token, query, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadDoctors();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [loadDoctors])
  );

  const openNotifications = async () => {
    setNotifOpen(true);
    const result = await api<{ success: boolean; data: Notification[] }>("/api/notifications/me", {
      token: token ?? undefined,
    });
    if (result.ok) setNotifications(result.data.data);
  };

  const startChat = async (doctor: Doctor) => {
    setStarting(doctor.user._id);
    const result = await api<{ success: boolean; data: { _id: string } }>("/api/chats", {
      method: "POST",
      token: token ?? undefined,
      body: { doctorId: doctor.user._id },
    });
    setStarting(null);

    if (!result.ok) {
      Alert.alert("Couldn't start chat", result.message);
      return;
    }
    router.push(`/consultation/${result.data.data._id}`);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Find a Specialist</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={[s.iconBtn, { backgroundColor: colors.surface }]} onPress={() => router.push("/consultations")}>
            <MessageIcon color={colors.text} />
          </Pressable>
          <Pressable style={[s.bellWrap, { backgroundColor: colors.surface }]} onPress={openNotifications}>
            <BellIcon color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={[s.searchBar, { backgroundColor: colors.surface }]}>
        <SearchIcon color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search gynaecologists, specializations…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => { setLoading(true); loadDoctors().then(() => setLoading(false)); }}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={pink} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

          {/* ── Filter pills ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
            {FILTERS.map((f) => {
              const active = f.value === activeFilter;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => { setActiveFilter(f.value); setLoading(true); }}
                  style={[s.pill, active ? { backgroundColor: pink, borderColor: pink } : { backgroundColor: "transparent", borderColor: colors.border }]}
                >
                  <Text style={[s.pillText, { color: active ? "#fff" : colors.textMuted }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Ad banner (F1) ── */}
          <View style={s.padH}>
            <AdBanner placement="help_screen" />
          </View>

          {/* ── Section header ── */}
          <View style={s.sectionRow}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>VERIFIED SPECIALISTS</Text>
            <Text style={[s.foundText, { color: pink }]}>{doctors.length} Found</Text>
          </View>

          {/* ── Doctor cards ── */}
          <View style={s.padH}>
            {!doctors.length ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 24 }}>
                No doctors match your search right now.
              </Text>
            ) : (
              doctors.map((doc) => (
                <Pressable
                  key={doc._id}
                  style={[s.docCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/doctor/${doc.user._id}`)}
                >
                  <View style={[s.avatarWrap, { backgroundColor: pinkLite }]}>
                    <Text style={s.avatarEmoji}>👩‍⚕️</Text>
                  </View>

                  <View style={s.docInfo}>
                    <View style={s.nameRow}>
                      <Text style={[s.docName, { color: colors.text }]} numberOfLines={1}>
                        {doc.user.name || "Doctor"}
                      </Text>
                      {doc.reviewCount > 0 && (
                        <View style={s.ratingWrap}>
                          <StarIcon color="#f59e0b" />
                          <Text style={s.ratingText}>{doc.avgRating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[s.docRole, { color: colors.textMuted }]}>
                      {doc.specialization || "Gynecology"}{doc.experienceYears ? ` · ${doc.experienceYears} yrs exp` : ""}
                    </Text>

                    <View style={s.tagsRow}>
                      {doc.consultationTypes?.includes("online") && (
                        <View style={[s.tag, { backgroundColor: tealLite }]}>
                          <Text style={[s.tagText, { color: teal }]}>Online</Text>
                        </View>
                      )}
                      {doc.languages?.slice(0, 2).map((lang) => (
                        <View key={lang} style={[s.tag, { backgroundColor: pinkLite }]}>
                          <Text style={[s.tagText, { color: pink }]}>{lang}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={s.priceRow}>
                      <Text style={[s.price, { color: colors.text }]}>
                        {doc.consultationFee ? `£${doc.consultationFee}` : "—"}
                        <Text style={[s.perSession, { color: colors.textMuted }]}>/session</Text>
                      </Text>
                      <Pressable onPress={() => startChat(doc)} disabled={starting === doc.user._id}>
                        {starting === doc.user._id ? (
                          <ActivityIndicator color={pink} size="small" />
                        ) : (
                          <Text style={[s.chatNow, { color: pink }]}>Chat Now →</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* ── Privacy notice ── */}
          <View style={[s.privacyCard, { backgroundColor: pinkLite, borderColor: `${pink}33` }]}>
            <ShieldIcon color={pink} />
            <View style={s.privacyText}>
              <Text style={[s.privacyTitle, { color: pink }]}>Your Privacy is Protected</Text>
              <Text style={[s.privacyBody, { color: colors.textMuted }]}>
                Phone numbers, emails, and social media handles are automatically removed from chats and reviews for your safety.
              </Text>
            </View>
          </View>

        </ScrollView>
      )}

      {/* ── Notifications modal ── */}
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
                <View key={n._id} style={[m.row, { borderBottomColor: colors.border }]}>
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

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1 },
  padH:  { paddingHorizontal: 20 },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  screenTitle: { fontSize: 22, fontWeight: "800" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bellWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },

  filtersRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  pillText: { fontSize: 13, fontWeight: "600" },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  foundText: { fontSize: 13, fontWeight: "700" },

  docCard: { flexDirection: "row", borderRadius: 18, padding: 14, marginBottom: 14, gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatarWrap: { width: 68, height: 68, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarEmoji: { fontSize: 32 },
  docInfo: { flex: 1 },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  docName: { fontSize: 15, fontWeight: "800", flex: 1, marginRight: 6 },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  docRole: { fontSize: 12, marginBottom: 8 },
  tagsRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "700" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 15, fontWeight: "800" },
  perSession: { fontSize: 12, fontWeight: "400" },
  chatNow: { fontSize: 14, fontWeight: "800" },

  privacyCard: { flexDirection: "row", marginHorizontal: 20, marginTop: 4, borderRadius: 16, padding: 16, borderWidth: 1, gap: 14, alignItems: "flex-start" },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  privacyBody: { fontSize: 12, lineHeight: 18 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 14, fontWeight: "700" },
});
