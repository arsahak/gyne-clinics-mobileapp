import { Text } from "@/components";
import { config } from "@/constants/config";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import {
  BadgeCheck,
  Baby,
  Bell,
  BellOff,
  BellRing,
  ChevronRight,
  CircleHelp,
  HeartPulse,
  HeartHandshake,
  LogOut,
  Moon,
  Pencil,
  RefreshCw,
  Ruler,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PatientProfile = {
  _id: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  pregnancyStatus?:
    | "not_pregnant"
    | "pregnant"
    | "postpartum"
    | "trying_to_conceive";
  remindersEnabled: boolean;
  profileCompleted: boolean;
  account?: {
    name?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    isVerified: boolean;
  };
};

const PREGNANCY_LABELS: Record<
  NonNullable<PatientProfile["pregnancyStatus"]>,
  string
> = {
  not_pregnant: "Not pregnant",
  pregnant: "Pregnant",
  postpartum: "Postpartum",
  trying_to_conceive: "Trying to conceive",
};

const CARE_STATUS_COPY: Record<
  NonNullable<PatientProfile["pregnancyStatus"]>,
  { title: string; description: string }
> = {
  not_pregnant: {
    title: "Not pregnant",
    description: "Your care profile is currently set to not pregnant.",
  },
  pregnant: {
    title: "Pregnant",
    description: "Your care experience can include pregnancy-aware guidance.",
  },
  postpartum: {
    title: "Postpartum",
    description: "Your profile reflects your postpartum recovery journey.",
  },
  trying_to_conceive: {
    title: "Trying to conceive",
    description: "Your cycle information can support conception planning.",
  },
};

function initials(name?: string) {
  if (!name?.trim()) return "P";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function SettingsScreen() {
  const { colors, setMode, mode } = useTheme();
  const { logout, token, phone } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingReminders, setSavingReminders] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api<{ success: boolean; data: PatientProfile }>(
      "/api/patients/me",
      { token: token ?? undefined },
    );
    if (result.ok) {
      setProfile(result.data.data);
      setAvatarFailed(false);
    }
    else setError(result.message);
    setLoading(false);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const confirmLogout = () => {
    Alert.alert(
      "Sign out?",
      "You’ll need your phone number and a new verification code to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    );
  };

  const setReminders = async (enabled: boolean) => {
    if (!profile || savingReminders) return;
    const previous = profile.remindersEnabled;
    setProfile({ ...profile, remindersEnabled: enabled });
    setSavingReminders(true);
    const result = await api<{
      success: boolean;
      data: { remindersEnabled: boolean };
    }>("/api/patients/reminders", {
      method: "PATCH",
      token: token ?? undefined,
      body: { enabled },
    });
    setSavingReminders(false);
    if (!result.ok) {
      setProfile((current) =>
        current ? { ...current, remindersEnabled: previous } : current,
      );
      Alert.alert("Couldn’t update reminders", result.message);
    }
  };

  const displayPhone = profile?.account?.phone || phone || "Phone unavailable";
  const displayName = profile?.account?.name || "Patient profile";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headingRow}>
          <View>
            <Text variant="h2">My account</Text>
            <Text variant="caption" color="textMuted" style={s.subtitle}>
              Your care, details and preferences
            </Text>
          </View>
          <View style={[s.shield, { backgroundColor: colors.tealLight }]}>
            <ShieldCheck size={21} color={colors.teal} />
          </View>
        </View>

        {loading ? (
          <ProfileSkeleton colors={colors} />
        ) : error ? (
          <View
            style={[
              s.profileCard,
              s.errorCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text variant="bodyBold">We couldn’t load your details</Text>
            <Text variant="caption" color="textMuted" style={s.errorText}>
              {error}
            </Text>
            <Pressable
              onPress={loadProfile}
              style={[s.retryButton, { backgroundColor: colors.primaryLight }]}
            >
              <RefreshCw size={15} color={colors.primary} />
              <Text variant="label" style={{ color: colors.primary }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[
                s.profileCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={s.avatarWrap}>
                <View style={[s.avatar, { backgroundColor: colors.primary }]}> 
                  {profile?.account?.avatar && !avatarFailed ? (
                    <Image
                      source={{ uri: profile.account.avatar }}
                      style={s.avatarImage}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <Text style={s.avatarText}>
                      {initials(profile?.account?.name)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={s.profileCopy}>
                <View style={s.nameRow}>
                  <Text variant="h3" numberOfLines={1} style={s.name}>
                    {displayName}
                  </Text>
                  {profile?.account?.isVerified && (
                    <BadgeCheck size={18} color={colors.teal} />
                  )}
                </View>
                <Text variant="caption" color="textMuted">
                  {displayPhone}
                </Text>
                <View
                  style={[
                    s.patientBadge,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[s.patientBadgeText, { color: colors.primary }]}>
                    PATIENT
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Edit patient profile"
                onPress={() => router.push("/edit-patient-profile")}
                style={[s.editButton, { backgroundColor: colors.primaryLight }]}
              >
                <Pencil size={17} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
              HEALTH SNAPSHOT
            </Text>
            <View
              style={[
                s.snapshotCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Metric
                icon={<HeartPulse size={18} color={colors.primary} />}
                iconBg={colors.primaryLight}
                value={profile?.age ?? "—"}
                label="Age"
                colors={colors}
              />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Metric
                icon={<Ruler size={18} color={colors.teal} />}
                iconBg={colors.tealLight}
                value={profile?.heightCm ? `${profile.heightCm} cm` : "—"}
                label="Height"
                colors={colors}
              />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Metric
                icon={<Scale size={18} color={colors.secondary} />}
                iconBg={colors.secondaryLight}
                value={profile?.weightKg ? `${profile.weightKg} kg` : "—"}
                label="Weight"
                colors={colors}
              />
            </View>
            {profile?.pregnancyStatus && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textMuted }]}>CARE STATUS</Text>
                <CareStatusCard
                  status={profile.pregnancyStatus}
                  colors={colors}
                />
              </>
            )}
          </>
        )}

        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            s.menuCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {loading ? (
            <ReminderSkeleton colors={colors} />
          ) : (
            <View style={[s.menuRow, s.reminderRow]}>
              <View style={[s.menuIcon, { backgroundColor: colors.tealLight }]}> 
                <Bell size={19} color={colors.teal} />
              </View>
              <View style={s.menuCopy}>
              <Text variant="label" style={s.menuTitle}>
                Cycle reminders
              </Text>
              <Text variant="caption" color="textMuted">
                {profile?.remindersEnabled
                  ? "On — you’ll receive helpful cycle updates"
                  : "Off — cycle updates are paused"}
              </Text>
              <View
                accessibilityRole="radiogroup"
                style={[
                  s.reminderToggle,
                  { backgroundColor: colors.background },
                ]}
              >
                {([
                  { enabled: false, label: "Off", Icon: BellOff },
                  { enabled: true, label: "On", Icon: BellRing },
                ] as const).map(({ enabled, label, Icon }) => {
                  const selected = profile?.remindersEnabled === enabled;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="radio"
                      accessibilityLabel={`Turn cycle reminders ${label.toLowerCase()}`}
                      accessibilityState={{
                        checked: selected,
                        disabled: !profile || savingReminders,
                      }}
                      disabled={!profile || savingReminders}
                      onPress={() => setReminders(enabled)}
                      style={[
                        s.reminderOption,
                        selected && {
                          backgroundColor: enabled
                            ? colors.teal
                            : colors.surfaceElevated,
                        },
                        selected &&
                          !enabled && {
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                      ]}
                    >
                      {savingReminders && selected ? (
                        <ActivityIndicator
                          size="small"
                          color={enabled ? "#fff" : colors.textMuted}
                        />
                      ) : (
                        <Icon
                          size={15}
                          color={
                            selected && enabled
                              ? "#fff"
                              : selected
                                ? colors.text
                                : colors.textMuted
                          }
                        />
                      )}
                      <Text
                        style={[
                          s.reminderOptionText,
                          {
                            color:
                              selected && enabled
                                ? "#fff"
                                : selected
                                  ? colors.text
                                  : colors.textMuted,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              </View>
            </View>
          )}
          <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
          <Pressable
            style={s.menuRow}
            onPress={() => router.push("/(tabs)/help")}
          >
            <View
              style={[s.menuIcon, { backgroundColor: colors.secondaryLight }]}
            >
              <CircleHelp size={19} color={colors.secondary} />
            </View>
            <View style={s.menuCopy}>
              <Text variant="label" style={s.menuTitle}>
                Help and support
              </Text>
              <Text variant="caption" color="textMuted">
                Doctors, FAQs and guidance
              </Text>
            </View>
            <ChevronRight size={19} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
          APPEARANCE
        </Text>
        <View style={s.modeRow}>
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Smartphone],
            ] as const
          ).map(([value, label, Icon]) => {
            const selected = mode === value;
            return (
              <Pressable
                key={value}
                onPress={() => setMode(value)}
                style={[
                  s.modeButton,
                  {
                    backgroundColor: selected
                      ? colors.primaryLight
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Icon
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    s.modeText,
                    { color: selected ? colors.primary : colors.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={confirmLogout}
          style={[s.logoutButton, { borderColor: colors.danger + "55" }]}
        >
          <LogOut size={19} color={colors.danger} />
          <Text variant="bodyBold" color="danger">
            Sign out
          </Text>
        </Pressable>
        <Text
          variant="caption"
          color="textMuted"
          align="center"
          style={s.version}
        >
          GyneClinics · Version {config.appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  icon,
  iconBg,
  value,
  label,
  colors,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={s.metric}>
      <View style={[s.metricIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={[s.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function CareStatusCard({
  status,
  colors,
}: {
  status: NonNullable<PatientProfile["pregnancyStatus"]>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const copy = CARE_STATUS_COPY[status];
  const isPregnant = status === "pregnant";
  const isPostpartum = status === "postpartum";
  const accent = isPregnant
    ? colors.primary
    : isPostpartum || status === "trying_to_conceive"
      ? colors.secondary
      : colors.teal;
  const background = isPregnant
    ? colors.primaryLight
    : isPostpartum || status === "trying_to_conceive"
      ? colors.secondaryLight
      : colors.tealLight;

  const icon = isPregnant ? (
    <Baby size={23} color={accent} />
  ) : isPostpartum ? (
    <HeartHandshake size={23} color={accent} />
  ) : status === "trying_to_conceive" ? (
    <Sparkles size={23} color={accent} />
  ) : (
    <ShieldCheck size={23} color={accent} />
  );

  return (
    <View
      accessibilityLabel={`Care status: ${PREGNANCY_LABELS[status]}`}
      style={[s.careStatusCard, { backgroundColor: background }]}
    >
      <View style={[s.careStatusIcon, { backgroundColor: colors.surfaceElevated }]}>
        {icon}
      </View>
      <View style={s.careStatusCopy}>
        <Text style={[s.careStatusEyebrow, { color: accent }]}>PREGNANCY & CARE</Text>
        <Text style={[s.careStatusTitle, { color: colors.text }]}>{copy.title}</Text>
        <Text style={[s.careStatusDescription, { color: colors.textMuted }]}>{copy.description}</Text>
      </View>
    </View>
  );
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

function ProfileSkeleton({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const pulse = useSkeletonPulse();
  const fill = colors.border;

  return (
    <Animated.View
      accessibilityLabel="Loading patient profile"
      accessibilityRole="progressbar"
      style={{ opacity: pulse }}
    >
      <View
        style={[
          s.profileCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[s.skeletonAvatar, { backgroundColor: fill }]} />
        <View style={s.skeletonProfileCopy}>
          <View style={[s.skeletonLineLarge, { backgroundColor: fill }]} />
          <View style={[s.skeletonLineMedium, { backgroundColor: fill }]} />
          <View style={[s.skeletonBadge, { backgroundColor: fill }]} />
        </View>
        <View style={[s.skeletonEdit, { backgroundColor: fill }]} />
      </View>

      <View style={[s.skeletonSectionLabel, { backgroundColor: fill }]} />
      <View
        style={[
          s.snapshotCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {[0, 1, 2].map((item) => (
          <View key={item} style={s.metric}>
            <View style={[s.skeletonMetricIcon, { backgroundColor: fill }]} />
            <View style={[s.skeletonMetricValue, { backgroundColor: fill }]} />
            <View style={[s.skeletonMetricLabel, { backgroundColor: fill }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function ReminderSkeleton({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const pulse = useSkeletonPulse();
  const fill = colors.border;

  return (
    <Animated.View
      accessibilityLabel="Loading reminder preference"
      accessibilityRole="progressbar"
      style={[s.menuRow, s.reminderRow, { opacity: pulse }]}
    >
      <View style={[s.menuIcon, { backgroundColor: fill }]} />
      <View style={s.menuCopy}>
        <View style={[s.skeletonReminderTitle, { backgroundColor: fill }]} />
        <View style={[s.skeletonReminderText, { backgroundColor: fill }]} />
        <View style={[s.skeletonReminderToggle, { backgroundColor: fill }]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  subtitle: { marginTop: 3 },
  shield: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  errorCard: { alignItems: "flex-start", flexDirection: "column" },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarWrap: { position: "relative" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileCopy: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1 },
  patientBadge: {
    alignSelf: "flex-start",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  patientBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { marginTop: 5, marginBottom: 13 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 10,
  },
  snapshotCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
  },
  metric: { flex: 1, alignItems: "center" },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  metricValue: { fontSize: 14, fontWeight: "800" },
  metricLabel: { fontSize: 11, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 50 },
  careStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 15,
  },
  careStatusIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  careStatusCopy: { flex: 1, marginHorizontal: 12 },
  careStatusEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.9, marginBottom: 3 },
  careStatusTitle: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  careStatusDescription: { fontSize: 11, lineHeight: 16 },
  menuCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 15 },
  menuRow: { minHeight: 72, flexDirection: "row", alignItems: "center" },
  reminderRow: { alignItems: "flex-start", paddingVertical: 15 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuCopy: { flex: 1, paddingRight: 8 },
  menuTitle: { fontWeight: "700", marginBottom: 1 },
  reminderToggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 12,
    padding: 3,
    marginTop: 11,
    gap: 3,
  },
  reminderOption: {
    minWidth: 76,
    height: 34,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reminderOptionText: { fontSize: 12, fontWeight: "800" },
  skeletonAvatar: { width: 66, height: 66, borderRadius: 23 },
  skeletonProfileCopy: { flex: 1, marginLeft: 14, gap: 8 },
  skeletonLineLarge: { width: "68%", height: 18, borderRadius: 7 },
  skeletonLineMedium: { width: "50%", height: 12, borderRadius: 6 },
  skeletonBadge: { width: 57, height: 18, borderRadius: 7, marginTop: 2 },
  skeletonEdit: { width: 38, height: 38, borderRadius: 13 },
  skeletonSectionLabel: { width: 112, height: 10, borderRadius: 5, marginTop: 25, marginBottom: 11 },
  skeletonMetricIcon: { width: 34, height: 34, borderRadius: 11, marginBottom: 8 },
  skeletonMetricValue: { width: 44, height: 13, borderRadius: 6, marginBottom: 6 },
  skeletonMetricLabel: { width: 34, height: 9, borderRadius: 5 },
  skeletonReminderTitle: { width: 116, height: 13, borderRadius: 6, marginTop: 2 },
  skeletonReminderText: { width: "82%", height: 10, borderRadius: 5, marginTop: 8 },
  skeletonReminderToggle: { width: 159, height: 40, borderRadius: 12, marginTop: 11 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  modeRow: { flexDirection: "row", gap: 9 },
  modeButton: {
    flex: 1,
    height: 76,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  modeText: { fontSize: 12, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginTop: 27,
  },
  version: { marginTop: 18 },
});
