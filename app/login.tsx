import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

// ── Icons ─────────────────────────────────────────────────────────────────────
function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2.4} />
    </Svg>
  );
}
function PhoneIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.85 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 5.55 5.55l1.1-1.1a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.12} />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function HeartIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.18} />
    </Svg>
  );
}
function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.18} />
    </Svg>
  );
}

// ── Decorative blob ───────────────────────────────────────────────────────────
function TopBlob({ pink }: { pink: string }) {
  return (
    <Svg width="100%" height={220} viewBox="0 0 390 220" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <RadialGradient id="rg" cx="50%" cy="0%" rx="70%" ry="80%">
          <Stop offset="0%" stopColor={pink} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={pink} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Path
        d="M0 0 Q195 160 390 0 L390 220 L0 220 Z"
        fill="url(#rg)"
      />
    </Svg>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const router   = useRouter();
  const pink     = colors.primary;
  const pinkLite = colors.primaryLight;
  const purple   = colors.secondary;

  const [phone,   setPhone]   = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [focused, setFocused] = useState(false);

  const valid     = phone.trim().length >= 7;
  const canSubmit = valid && agreed;

  const handleContinue = () => {
    if (!canSubmit) return;
    router.push({ pathname: "/verify-otp", params: { phone } });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Top hero area ── */}
          <View style={s.hero}>
            <TopBlob pink={pink} />

            {/* floating decorative icons */}
            <View style={[s.floatBubble, s.floatTL, { backgroundColor: pinkLite, borderColor: pink + "33" }]}>
              <HeartIcon color={pink} />
            </View>
            <View style={[s.floatBubble, s.floatTR, { backgroundColor: pinkLite, borderColor: pink + "33" }]}>
              <StarIcon color={pink} />
            </View>

            {/* centre avatar ring */}
            <View style={[s.avatarRing, { borderColor: pink + "40", backgroundColor: pinkLite }]}>
              <View style={[s.avatarInner, { backgroundColor: pink }]}>
                <UserIcon color="#fff" />
              </View>
            </View>
          </View>

          {/* ── Card form ── */}
          <View style={[s.card, {
            backgroundColor: colors.surface,
            shadowColor: isDark ? "#000" : pink,
          }]}>

            {/* Welcome heading */}
            <Text style={[s.title, { color: colors.text }]}>Welcome Back 👋</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>
              Enter your mobile number to securely access your health records.
            </Text>

            {/* Patient chip — left aligned */}
            <View style={[s.chip, { borderColor: pink, backgroundColor: pinkLite }]}>
              <UserIcon color={pink} />
              <Text style={[s.chipText, { color: pink }]}>PATIENT ACCOUNT</Text>
            </View>

            {/* Phone label */}
            <Text style={[s.label, { color: colors.text }]}>Mobile Number</Text>

            {/* Phone input */}
            <View style={[
              s.inputRow,
              { borderColor: focused ? pink : colors.border, backgroundColor: colors.background },
              focused && { shadowColor: pink, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
            ]}>
              <View style={[s.prefixWrap, { borderRightColor: colors.border }]}>
                <PhoneIcon color={focused ? pink : colors.textMuted} />
                <Text style={[s.prefix, { color: focused ? pink : colors.text }]}>+44</Text>
              </View>
              <TextInput
                style={[s.phoneInput, { color: colors.text }]}
                placeholder="7700 000 000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {valid && (
                <View style={s.validPill}>
                  <View style={s.validDot} />
                  <Text style={s.validText}>Valid</Text>
                </View>
              )}
            </View>

            {/* Agree checkbox */}
            <Pressable style={s.checkRow} onPress={() => setAgreed(v => !v)}>
              <View style={[
                s.checkbox,
                { backgroundColor: agreed ? pink : "transparent", borderColor: agreed ? pink : colors.border },
              ]}>
                {agreed && (
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth={3}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </View>
              <Text style={[s.checkText, { color: colors.textMuted }]}>
                I agree to the{" "}
                <Text style={{ color: pink, fontWeight: "700" }}>Privacy Policy</Text>
                {" "}and consent to health-related notifications.
              </Text>
            </Pressable>

            {/* CTA */}
            <Pressable
              onPress={handleContinue}
              disabled={!canSubmit}
              style={[s.ctaBtn, { backgroundColor: canSubmit ? pink : colors.border, opacity: canSubmit ? 1 : 0.55 }]}
            >
              <PhoneIcon color="#fff" />
              <Text style={s.ctaText}>Get Verification Code</Text>
            </Pressable>

            {/* Secure badge */}
            <View style={[s.secureBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <ShieldIcon color={purple} />
              <Text style={[s.secureText, { color: colors.textMuted }]}>
                256-bit encrypted &amp; HIPAA compliant
              </Text>
            </View>

          </View>

          {/* ── Footer disclaimer ── */}
          <Text style={[s.footNote, { color: colors.textMuted }]}>
            For informational use only. Not a substitute for medical advice.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  // ── Hero ──
  hero: {
    height: 210,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 28,
    overflow: "hidden",
  },
  floatBubble: {
    position: "absolute",
    width: 46, height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  floatTL: { top: 36, left: 28 },
  floatTR: { top: 48, right: 28 },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
  },

  // ── Card ──
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },

  title:    { fontSize: 28, fontWeight: "900", letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 20 },

  // Chip — left aligned
  chip:     {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1.5,
    marginBottom: 22,
  },
  chipText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },

  // Label
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },

  // Input
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    height: 56, marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
  },
  prefixWrap: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14,
    borderRightWidth: StyleSheet.hairlineWidth,
    height: "100%",
  },
  prefix:     { fontSize: 15, fontWeight: "700" },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 15 },
  validPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginRight: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: "#d1fae5",
  },
  validDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  validText: { fontSize: 11, fontWeight: "700", color: "#059669" },

  // Checkbox
  checkRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 22 },
  checkbox:  { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // CTA
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 16, paddingVertical: 16, marginBottom: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  // Secure badge
  secureBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14,
  },
  secureText: { fontSize: 12, fontWeight: "600" },

  // Footer note
  footNote: { fontSize: 11, textAlign: "center", marginTop: 20, paddingHorizontal: 32, lineHeight: 17 },
});
