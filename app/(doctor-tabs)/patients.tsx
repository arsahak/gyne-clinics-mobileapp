import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type MonitoringEntry = {
  patientId: string;
  name?: string;
  phone?: string;
  latestEntry: { startDate: string; endDate?: string | null } | null;
  currentCycleDay: number | null;
  avgCycleLengthDays: number;
  irregular: boolean;
  pendingReview: boolean;
};

function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export default function DoctorPatientsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const accent = DOCTOR_ACCENT;
  const accentBg = DOCTOR_ACCENT + "18";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<MonitoringEntry[]>([]);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    const result = await api<{ success: boolean; data: MonitoringEntry[] }>("/api/doctors/patients", {
      token: token ?? undefined,
    });
    if (result.ok) setPatients(result.data.data);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadData();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const showPatientDetail = (p: MonitoringEntry) => {
    const lines = [
      p.phone ? `Phone: ${p.phone}` : null,
      p.latestEntry ? `Last period: ${formatShort(new Date(p.latestEntry.startDate))}` : "No period data logged yet",
      p.currentCycleDay ? `Current cycle day: ${p.currentCycleDay}` : null,
      `Average cycle: ${p.avgCycleLengthDays} days`,
      p.irregular ? "⚠️ Cycle appears irregular / overdue" : null,
      p.pendingReview ? "🔔 Has a pending review" : null,
    ].filter(Boolean).join("\n");
    Alert.alert(p.name || "Patient", lines);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q)
    );
  }, [patients, search]);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Patients</Text>
        <Text style={[s.countPill, { backgroundColor: accentBg, color: accent }]}>{patients.length}</Text>
      </View>

      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SearchIcon color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone"
          placeholderTextColor={colors.textMuted}
          style={[s.searchInput, { color: colors.text }]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {!filtered.length ? (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>
            {patients.length ? "No patients match your search." : "No assigned patients yet."}
          </Text>
        ) : (
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            {filtered.map((p, i) => (
              <Pressable
                key={p.patientId}
                onPress={() => showPatientDetail(p)}
                style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={[s.avatar, { backgroundColor: accentBg }]}>
                  <Text style={{ fontSize: 16 }}>🙋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { color: colors.text }]}>{p.name || "Patient"}</Text>
                  <Text style={[s.sub, { color: colors.textMuted }]}>
                    {p.latestEntry ? `Last logged ${formatShort(new Date(p.latestEntry.startDate))} · Day ${p.currentCycleDay}` : "No data yet"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {p.irregular && (
                    <View style={[s.badge, { backgroundColor: "#fef2f2" }]}>
                      <Text style={[s.badgeText, { color: "#ef4444" }]}>Irregular</Text>
                    </View>
                  )}
                  {p.pendingReview && (
                    <View style={[s.badge, { backgroundColor: accentBg }]}>
                      <Text style={[s.badgeText, { color: accent }]}>Review</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  screenTitle: { fontSize: 26, fontWeight: "800" },
  countPill: { fontSize: 12, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14 },

  card: { borderRadius: 18, padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 40 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
