import { Text } from "@/components";
import { config } from "@/constants/config";
import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Stethoscope,
  Sun,
  IdCard,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DoctorProfile = {
  _id: string;
  qualifications?: string[];
  specialization?: string;
  experienceYears?: number;
  registrationNumber?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  languages?: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  avgRating: number;
  reviewCount: number;
  account?: {
    name?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    isVerified: boolean;
  };
};

function initials(name?: string) {
  if (!name?.trim()) return "DR";
  return name
    .trim()
    .split(/\s+/)
    .filter((part) => part.toLowerCase() !== "dr.")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "DR";
}

function approvalCopy(status?: DoctorProfile["approvalStatus"]) {
  if (status === "approved") return { label: "VERIFIED DOCTOR", color: "#15803d", background: "#dcfce7" };
  if (status === "rejected") return { label: "ACTION REQUIRED", color: "#b91c1c", background: "#fee2e2" };
  return { label: "VERIFICATION PENDING", color: "#a16207", background: "#fef3c7" };
}

export default function DoctorSettingsScreen() {
  const { colors, setMode, mode } = useTheme();
  const { logout, token, phone } = useAuth();
  const router = useRouter();
  const accent = DOCTOR_ACCENT;
  const accentBg = `${DOCTOR_ACCENT}18`;
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api<{ success: boolean; data: DoctorProfile }>("/api/doctors/me", {
      token: token ?? undefined,
    });
    if (result.ok) {
      setProfile(result.data.data);
      setAvatarFailed(false);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You’ll need your phone number and a new verification code to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await logout(); router.replace("/login"); } },
    ]);
  };

  const status = approvalCopy(profile?.approvalStatus);
  const displayName = profile?.account?.name || "Doctor profile";
  const displayPhone = profile?.account?.phone || phone || "Phone unavailable";
  const rating = profile?.reviewCount ? profile.avgRating.toFixed(1) : "New";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headingRow}>
          <View>
            <Text variant="h2">My account</Text>
            <Text variant="caption" color="textMuted" style={s.subtitle}>Professional details and preferences</Text>
          </View>
          <View style={[s.shield, { backgroundColor: accentBg }]}><ShieldCheck size={21} color={accent} /></View>
        </View>

        {loading ? (
          <DoctorSettingsSkeleton colors={colors} />
        ) : error ? (
          <View style={[s.profileCard, s.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="bodyBold">We couldn’t load your profile</Text>
            <Text variant="caption" color="textMuted" style={s.errorText}>{error}</Text>
            <Pressable onPress={loadProfile} style={[s.retryButton, { backgroundColor: accentBg }]}>
              <RefreshCw size={15} color={accent} /><Text variant="label" style={{ color: accent }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[s.profileCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[s.avatar, { backgroundColor: accent }]}>
                {profile?.account?.avatar && !avatarFailed ? (
                  <Image source={{ uri: profile.account.avatar }} style={s.avatarImage} onError={() => setAvatarFailed(true)} />
                ) : (
                  <Text style={s.avatarText}>{initials(profile?.account?.name)}</Text>
                )}
              </View>
              <View style={s.profileCopy}>
                <View style={s.nameRow}>
                  <Text variant="h3" numberOfLines={1} style={s.name}>{displayName}</Text>
                  {profile?.account?.isVerified && <BadgeCheck size={18} color={accent} />}
                </View>
                <Text variant="caption" color="textMuted">{displayPhone}</Text>
                {!!profile?.account?.email && <Text variant="caption" color="textMuted" numberOfLines={1}>{profile.account.email}</Text>}
                <View style={[s.statusBadge, { backgroundColor: status.background }]}>
                  <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <Pressable accessibilityLabel="Edit doctor profile" onPress={() => router.push("/edit-doctor-profile")} style={[s.editButton, { backgroundColor: accentBg }]}>
                <Pencil size={17} color={accent} />
              </Pressable>
            </View>

            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PROFESSIONAL SNAPSHOT</Text>
            <View style={[s.snapshotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Metric icon={<Stethoscope size={18} color={accent} />} iconBg={accentBg} value={profile?.experienceYears != null ? `${profile.experienceYears} yr` : "—"} label="Experience" colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Metric icon={<Star size={18} color={colors.warning} />} iconBg={`${colors.warning}18`} value={rating} label={profile?.reviewCount ? `${profile.reviewCount} reviews` : "Rating"} colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Metric icon={<IdCard size={18} color={colors.secondary} />} iconBg={colors.secondaryLight} value={profile?.registrationNumber || "—"} label="Registration" colors={colors} />
            </View>

            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PRACTICE DETAILS</Text>
            <View style={[s.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <DetailRow icon={<Stethoscope size={18} color={accent} />} label="Specialization" value={profile?.specialization || "Not added"} iconBg={accentBg} />
              <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
              <DetailRow icon={<GraduationCap size={18} color={colors.secondary} />} label="Qualifications" value={profile?.qualifications?.join(", ") || "Not added"} iconBg={colors.secondaryLight} />
              <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
              <DetailRow icon={<Building2 size={18} color={colors.teal} />} label="Hospital or clinic" value={profile?.hospitalName || "Not added"} iconBg={colors.tealLight} />
            </View>
          </>
        )}

        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PRACTICE TOOLS</Text>
        <View style={[s.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow icon={<CalendarClock size={19} color={accent} />} iconBg={accentBg} title="Availability" subtitle="Manage consultation hours" onPress={() => router.push("/(doctor-tabs)/availability")} colors={colors} />
          <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
          <MenuRow icon={<MessageCircle size={19} color={colors.secondary} />} iconBg={colors.secondaryLight} title="Conversations" subtitle="Open patient consultations" onPress={() => router.push("/(doctor-tabs)/chat")} colors={colors} />
        </View>

        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={s.modeRow}>
          {([ ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Smartphone] ] as const).map(([value, label, Icon]) => {
            const selected = mode === value;
            return (
              <Pressable key={value} onPress={() => setMode(value)} style={[s.modeButton, { backgroundColor: selected ? accentBg : colors.surface, borderColor: selected ? accent : colors.border }]}>
                <Icon size={20} color={selected ? accent : colors.textMuted} />
                <Text style={[s.modeText, { color: selected ? accent : colors.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={confirmLogout} style={[s.logoutButton, { borderColor: `${colors.danger}55` }]}>
          <LogOut size={19} color={colors.danger} /><Text variant="bodyBold" color="danger">Sign out</Text>
        </Pressable>
        <Text variant="caption" color="textMuted" align="center" style={s.version}>GyneClinics for Doctors · Version {config.appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, iconBg, value, label, colors }: { icon: React.ReactNode; iconBg: string; value: string; label: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return <View style={s.metric}><View style={[s.metricIcon, { backgroundColor: iconBg }]}>{icon}</View><Text style={[s.metricValue, { color: colors.text }]}>{value}</Text><Text style={[s.metricLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text></View>;
}

function DetailRow({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
  return <View style={s.detailRow}><View style={[s.menuIcon, { backgroundColor: iconBg }]}>{icon}</View><View style={s.menuCopy}><Text variant="caption" color="textMuted">{label}</Text><Text variant="label" numberOfLines={2}>{value}</Text></View></View>;
}

function MenuRow({ icon, iconBg, title, subtitle, onPress, colors }: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; onPress: () => void; colors: ReturnType<typeof useTheme>["colors"] }) {
  return <Pressable style={s.detailRow} onPress={onPress}><View style={[s.menuIcon, { backgroundColor: iconBg }]}>{icon}</View><View style={s.menuCopy}><Text variant="label">{title}</Text><Text variant="caption" color="textMuted">{subtitle}</Text></View><ChevronRight size={19} color={colors.textMuted} /></Pressable>;
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return pulse;
}

function DoctorSettingsSkeleton({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  const pulse = useSkeletonPulse();
  const fill = colors.border;
  return (
    <Animated.View accessibilityLabel="Loading doctor profile" accessibilityRole="progressbar" style={{ opacity: pulse }}>
      <View style={[s.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[s.skeletonAvatar, { backgroundColor: fill }]} /><View style={s.skeletonCopy}><View style={[s.skeletonName, { backgroundColor: fill }]} /><View style={[s.skeletonLine, { backgroundColor: fill }]} /><View style={[s.skeletonLineShort, { backgroundColor: fill }]} /><View style={[s.skeletonBadge, { backgroundColor: fill }]} /></View><View style={[s.skeletonEdit, { backgroundColor: fill }]} /></View>
      <View style={[s.skeletonSection, { backgroundColor: fill }]} />
      <View style={[s.snapshotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{[0, 1, 2].map((item) => <View key={item} style={s.metric}><View style={[s.skeletonMetricIcon, { backgroundColor: fill }]} /><View style={[s.skeletonMetricValue, { backgroundColor: fill }]} /><View style={[s.skeletonMetricLabel, { backgroundColor: fill }]} /></View>)}</View>
      <View style={[s.skeletonSection, { backgroundColor: fill }]} />
      <View style={[s.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{[0, 1, 2].map((item) => <View key={item} style={[s.detailRow, item < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}><View style={[s.menuIcon, { backgroundColor: fill }]} /><View style={s.menuCopy}><View style={[s.skeletonLineShort, { backgroundColor: fill }]} /><View style={[s.skeletonDetail, { backgroundColor: fill }]} /></View></View>)}</View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 }, scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, subtitle: { marginTop: 3 },
  shield: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  profileCard: { minHeight: 122, flexDirection: "row", alignItems: "center", borderRadius: 22, borderWidth: 1, padding: 18 },
  errorCard: { alignItems: "flex-start", flexDirection: "column" }, errorText: { marginTop: 5, marginBottom: 13 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  avatar: { width: 68, height: 68, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: "100%", height: "100%" }, avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileCopy: { flex: 1, marginLeft: 14 }, nameRow: { flexDirection: "row", alignItems: "center", gap: 5 }, name: { flexShrink: 1 },
  statusBadge: { alignSelf: "flex-start", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 }, statusText: { fontSize: 9, lineHeight: 12, fontWeight: "800", letterSpacing: 0.7 },
  editButton: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  snapshotCard: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, paddingVertical: 16 },
  metric: { flex: 1, alignItems: "center", paddingHorizontal: 4 }, metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 7 }, metricValue: { fontSize: 15, fontWeight: "800" }, metricLabel: { fontSize: 10, marginTop: 2 }, divider: { width: StyleSheet.hairlineWidth, height: 58 },
  detailsCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" }, detailRow: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }, menuCopy: { flex: 1, gap: 3 }, rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 65 },
  modeRow: { flexDirection: "row", gap: 10 }, modeButton: { flex: 1, borderWidth: 1.5, borderRadius: 15, paddingVertical: 13, alignItems: "center", gap: 5 }, modeText: { fontSize: 12, fontWeight: "700" },
  logoutButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1.5, borderRadius: 16, marginTop: 28 }, version: { marginTop: 18 },
  skeletonAvatar: { width: 68, height: 68, borderRadius: 23 }, skeletonCopy: { flex: 1, marginLeft: 14, gap: 7 }, skeletonName: { width: "70%", height: 17, borderRadius: 6 }, skeletonLine: { width: "58%", height: 10, borderRadius: 5 }, skeletonLineShort: { width: "42%", height: 9, borderRadius: 5 }, skeletonBadge: { width: 105, height: 18, borderRadius: 7 }, skeletonEdit: { width: 38, height: 38, borderRadius: 13 }, skeletonSection: { width: 124, height: 10, borderRadius: 5, marginTop: 24, marginBottom: 10 }, skeletonMetricIcon: { width: 34, height: 34, borderRadius: 11, marginBottom: 7 }, skeletonMetricValue: { width: 42, height: 14, borderRadius: 6 }, skeletonMetricLabel: { width: 52, height: 9, borderRadius: 5, marginTop: 5 }, skeletonDetail: { width: "72%", height: 13, borderRadius: 5 },
});
