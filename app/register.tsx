import { register } from "@/lib/services/auth";
import type { AppRole } from "@/lib/types";
import { routeForAccount, useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Stethoscope, UserRound } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// A new, verified number chooses how it will use GyneX (same step as
// the webapp's /register). The account is created with that role; the name
// and the rest are asked in onboarding.

const ROLES: { value: AppRole; title: string; body: string }[] = [
  { value: "patient", title: "I'm a patient", body: "Track my cycle, read trusted content and chat with specialists." },
  { value: "doctor", title: "I'm a gynaecology specialist", body: "Offer guidance to patients. Your profile is verified before going live." },
];

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const { phone, signupToken } = useLocalSearchParams<{ phone: string; signupToken: string }>();

  const [role, setRole] = useState<AppRole | null>(null);
  const [creating, setCreating] = useState(false);

  const accent = colors.primary;

  const create = async () => {
    if (!role || creating) return;
    if (!signupToken) {
      router.replace("/login");
      return;
    }
    setCreating(true);
    const result = await register(signupToken, role);
    setCreating(false);

    if (!result.ok) {
      // The verification is only valid for a short time.
      if (result.status === 401 || result.status === 409) {
        Alert.alert("Please sign in again", result.message, [{ text: "OK", onPress: () => router.replace("/login") }]);
        return;
      }
      Alert.alert("Couldn't create your account", result.message);
      return;
    }
    await signIn(result.data);
    router.replace(routeForAccount(result.data.account));
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace("/login")} style={s.backBtn} accessibilityLabel="Back to sign in">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={[s.topTitle, { color: colors.text }]}>Create your account</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text }]}>How will you use GyneX?</Text>
        <Text style={[s.sub, { color: colors.textMuted }]}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>{phone}</Text> is verified. Choose one to continue. This can't be
          changed later.
        </Text>

        <View accessibilityRole="radiogroup" style={s.list}>
          {ROLES.map(({ value, title, body }) => {
            const selected = role === value;
            const tone = accent;
            const Icon = value === "doctor" ? Stethoscope : UserRound;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setRole(value)}
                style={[
                  s.card,
                  { backgroundColor: colors.surface, borderColor: selected ? tone : colors.border },
                  selected && { shadowColor: tone, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 },
                ]}
              >
                <View style={[s.icon, { backgroundColor: `${tone}1A` }]}>
                  <Icon size={24} color={tone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[s.cardBody, { color: colors.textMuted }]}>{body}</Text>
                </View>
                <View style={[s.radio, { borderColor: selected ? tone : colors.border, backgroundColor: selected ? tone : "transparent" }]}>
                  {selected && <Check size={14} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          onPress={create}
          disabled={!role || creating}
          style={[s.cta, { backgroundColor: role ? accent : colors.border, opacity: role && !creating ? 1 : 0.6 }]}
        >
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 44, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "800", textAlign: "center" },

  scroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", lineHeight: 31 },
  sub: { fontSize: 13.5, lineHeight: 20, marginTop: 8, marginBottom: 24 },

  list: { gap: 12 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 14, borderWidth: 2, borderRadius: 22, padding: 18 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15.5, fontWeight: "800" },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },

  bottomBar: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
