import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

const TEST_OTP = "123456";

// ── Success overlay ───────────────────────────────────────────────────────────
function SuccessOverlay({ visible, pink }: { visible: boolean; pink: string }) {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[so.overlay, { opacity }]}>
      <Animated.View style={[so.card, { transform: [{ scale }] }]}>
        <View style={[so.outerRing, { borderColor: pink + "30" }]}>
          <View style={[so.innerRing, { borderColor: pink + "60" }]}>
            <Animated.View style={[so.circle, { backgroundColor: pink, transform: [{ scale: checkScale }] }]}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </View>
        </View>
        <Text style={so.title}>Verified! 🎉</Text>
        <Text style={so.sub}>Your number has been confirmed.{"\n"}Taking you in…</Text>
        <View style={[so.bar, { backgroundColor: pink + "20" }]}>
          <Animated.View style={[so.barFill, { backgroundColor: pink }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
const so = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", zIndex: 200 },
  card:      { backgroundColor: "#fff", borderRadius: 28, padding: 36, alignItems: "center", width: 300, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 16 },
  outerRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 16, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  innerRing: { width: 96,  height: 96,  borderRadius: 48, borderWidth: 8,  alignItems: "center", justifyContent: "center" },
  circle:    { width: 76,  height: 76,  borderRadius: 38, alignItems: "center", justifyContent: "center" },
  title:     { fontSize: 24, fontWeight: "900", color: "#111", marginBottom: 8 },
  sub:       { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 21, marginBottom: 20 },
  bar:       { width: "100%", height: 4, borderRadius: 2, overflow: "hidden" },
  barFill:   { height: "100%", width: "100%", borderRadius: 2 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VerifyOtpScreen() {
  const { colors }                = useTheme();
  const { login, isProfileDone }  = useAuth();
  const router                    = useRouter();
  const { phone }                 = useLocalSearchParams<{ phone: string }>();

  const pink     = colors.primary;
  const pinkLite = colors.primaryLight;

  const [digits,   setDigits]   = useState(["", "", "", "", "", ""]);
  const [status,   setStatus]   = useState<"idle" | "error" | "success">("idle");
  const [resendT,  setResendT]  = useState(30);

  // For shake animation on error
  const shakeX = useRef(new Animated.Value(0)).current;

  const refs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  // Countdown
  useEffect(() => {
    if (resendT <= 0) return;
    const t = setTimeout(() => setResendT(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendT]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (val: string, idx: number) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (status === "error") setStatus("idle");
    if (d && idx < 5) refs[idx + 1].current?.focus();
  };

  const handleBackspace = (key: string, idx: number) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      refs[idx - 1].current?.focus();
    }
  };

  const allFilled = digits.every(d => d !== "");

  const handleVerify = async () => {
    if (!allFilled) return;
    const code = digits.join("");

    if (code !== TEST_OTP) {
      setStatus("error");
      shake();
      // Clear boxes after shake
      setTimeout(() => {
        setDigits(["", "", "", "", "", ""]);
        refs[0].current?.focus();
      }, 400);
      return;
    }

    // ✅ Correct
    setStatus("success");
    await login();
    setTimeout(() => {
      router.replace(isProfileDone ? "/(tabs)" : "/health-profile");
    }, 2000);
  };

  const maskedPhone = phone ? `+44 **** ${phone.slice(-4)}` : "+44 *** ****";

  // Box border colour
  const boxBorderColor = (i: number) => {
    if (status === "success") return "#10b981";
    if (status === "error")   return "#ef4444";
    if (digits[i])            return pink;
    return colors.border;
  };
  const boxBg = (i: number) => {
    if (status === "success") return "#f0fdf4";
    if (status === "error")   return "#fff5f5";
    if (digits[i])            return pinkLite;
    return colors.surface;
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <SuccessOverlay visible={status === "success"} pink={pink} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2.2}
              strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={[s.backText, { color: colors.text }]}>Back</Text>
        </Pressable>

        <View style={s.content}>
          {/* Icon */}
          <View style={[s.iconRing, { borderColor: pink + "30", backgroundColor: pinkLite }]}>
            <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
              <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke={pink} strokeWidth={1.8} strokeLinecap="round"
                fill={pink} fillOpacity={0.15} />
              <Path d="M9 12l2 2 4-4" stroke={pink} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>

          <Text style={[s.title, { color: colors.text }]}>Enter Verification Code</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: pink, fontWeight: "700" }}>{maskedPhone}</Text>
          </Text>

          {/* Test hint */}
          <View style={[s.hintCard, { backgroundColor: pinkLite, borderColor: pink + "55" }]}>
            <Text style={{ fontSize: 13 }}>🧪</Text>
            <Text style={[s.hintText, { color: pink }]}>
              Testing mode — use code: <Text style={{ fontWeight: "900" }}>123456</Text>
            </Text>
          </View>

          {/* OTP boxes with shake */}
          <Animated.View style={[s.boxRow, { transform: [{ translateX: shakeX }] }]}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[
                  s.box,
                  {
                    backgroundColor: boxBg(i),
                    borderColor:     boxBorderColor(i),
                    color: status === "success" ? "#10b981" : status === "error" ? "#ef4444" : colors.text,
                  },
                ]}
                value={d}
                onChangeText={v => handleDigit(v, i)}
                onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={i === 0}
                selectTextOnFocus
                editable={status !== "success"}
              />
            ))}
          </Animated.View>

          {/* Status message */}
          {status === "error" && (
            <View style={s.errorRow}>
              <Circle cx="4" cy="4" r="4" fill="#ef4444" />
              <Text style={s.errorText}>Incorrect code. Please try again.</Text>
            </View>
          )}

          {/* Verify & Continue — ONLY navigates on correct code */}
          <Pressable
            onPress={handleVerify}
            disabled={!allFilled || status === "success"}
            style={[
              s.verifyBtn,
              {
                backgroundColor:
                  status === "success" ? "#10b981" :
                  allFilled           ? pink        :
                                        colors.border,
                opacity: !allFilled || status === "success" ? 0.6 : 1,
              },
            ]}
          >
            <Text style={s.verifyBtnText}>
              {status === "success" ? "✓  Verified!" : "Verify & Continue"}
            </Text>
          </Pressable>

          {/* Resend */}
          <View style={s.resendRow}>
            <Text style={[s.resendLabel, { color: colors.textMuted }]}>
              Didn't receive it?{"  "}
            </Text>
            {resendT > 0 ? (
              <Text style={[s.resendTimer, { color: colors.textMuted }]}>
                Resend in <Text style={{ fontWeight: "700" }}>{resendT}s</Text>
              </Text>
            ) : (
              <Pressable onPress={() => { setResendT(30); setDigits(["","","","","",""]); setStatus("idle"); }}>
                <Text style={[s.resendLink, { color: pink }]}>Resend Code</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, margin: 16, alignSelf: "flex-start" },
  backText: { fontSize: 15, fontWeight: "600" },

  content: { flex: 1, alignItems: "center", paddingHorizontal: 28, paddingTop: 10 },

  iconRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 12, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:    { fontSize: 26, fontWeight: "900", letterSpacing: -0.3, marginBottom: 10, textAlign: "center" },
  sub:      { fontSize: 15, lineHeight: 23, textAlign: "center", marginBottom: 22 },

  hintCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28 },
  hintText: { fontSize: 13, fontWeight: "600" },

  boxRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  box: {
    width: 50, height: 58, borderRadius: 14,
    borderWidth: 2, fontSize: 24, fontWeight: "900",
  },

  errorRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: "#ef4444", fontWeight: "600" },

  verifyBtn:     { width: "100%", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 22, marginTop: 4 },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  resendRow:   { flexDirection: "row", alignItems: "center" },
  resendLabel: { fontSize: 13 },
  resendTimer: { fontSize: 13 },
  resendLink:  { fontSize: 13, fontWeight: "800" },
});
