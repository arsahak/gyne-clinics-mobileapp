import { sendOtp, verifyOtp } from "@/lib/services/auth";
import { routeForAccount, useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import Svg, { Path } from "react-native-svg";
import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";
import { AlertCircle, CheckCircle2, Clock, RotateCw } from "lucide-react-native";

// Match the backend's OTP rules (backend/utils/phoneOtp.ts).
const RESEND_SECONDS = 30;
const EXPIRES_SECONDS = 10 * 60;

/** 125 → "2:05" */
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

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

const ERROR = "#ef4444";
const WARN = "#d97706";

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VerifyOtpScreen() {
  const { colors }  = useTheme();
  const { signIn }  = useAuth();
  const router      = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const pink     = colors.primary;
  const pinkLite = colors.primaryLight;

  const [digits,   setDigits]   = useState(["", "", "", "", "", ""]);
  const [status,   setStatus]   = useState<"idle" | "verifying" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resending, setResending] = useState(false);
  const [notice,   setNotice]   = useState("");

  // Timers: when the code expires and when another can be sent.
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + EXPIRES_SECONDS * 1000);
  const [resendAt,  setResendAt]  = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const expiresIn = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendIn  = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired   = expiresIn === 0;

  // For shake animation on error
  const shakeX = useRef(new Animated.Value(0)).current;

  const refs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

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
    const nums = val.replace(/\D/g, "");
    // Whole code pasted or AutoFilled from the SMS: fill every box and check it.
    if (nums.length >= 6) {
      const code = nums.slice(0, 6);
      setDigits(code.split(""));
      refs[5]?.current?.blur();
      void handleVerify(code);
      return;
    }
    const d = nums.slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (status === "error") setStatus("idle");
    if (d && idx < 5) refs[idx + 1]?.current?.focus();
  };

  const handleBackspace = (key: string, idx: number) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      refs[idx - 1]?.current?.focus();
    }
  };

  const allFilled = digits.every(d => d !== "");

  const handleVerify = async (pasted?: string) => {
    const code = pasted ?? digits.join("");
    if (code.length < 6 || status === "verifying" || status === "success") return;

    if (expired) {
      setErrorMsg("This code has expired. Request a new one below.");
      setStatus("error");
      shake();
      return;
    }

    setStatus("verifying");
    const result = await verifyOtp(phone, code);

    if (!result.ok) {
      // Not an app account (e.g. a staff number) — not a wrong-code problem,
      // so don't shake the boxes.
      if (result.status === 403) {
        setStatus("idle");
        Alert.alert("Can't sign in here", result.message, [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
        return;
      }

      // Keep the message until they type again; clear the boxes for a retry.
      setErrorMsg(result.message || "Incorrect code. Please try again.");
      setStatus("error");
      shake();
      setTimeout(() => {
        setDigits(["", "", "", "", "", ""]);
        refs[0]?.current?.focus();
      }, 400);
      return;
    }

    setStatus("success");
    const verified = result.data;
    if (verified.kind === "newUser") {
      // New number: choose patient or doctor, then the account is created.
      setTimeout(() => router.replace({ pathname: "/register", params: { phone: verified.phone, signupToken: verified.signupToken } }), 1500);
      return;
    }
    await signIn(verified.session);
    // Onboarding, consent, waiting for approval, or the app — as the backend says.
    setTimeout(() => router.replace(routeForAccount(verified.session.account)), 1500);
  };

  const handleResend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true);
    const result = await sendOtp(phone);
    setResending(false);
    if (!result.ok) {
      Alert.alert("Couldn't send a new code", result.message);
      return;
    }
    const sentAt = Date.now();
    setExpiresAt(sentAt + EXPIRES_SECONDS * 1000);
    setResendAt(sentAt + RESEND_SECONDS * 1000);
    setNow(sentAt);
    setDigits(["", "", "", "", "", ""]);
    setStatus("idle");
    setNotice("New code sent");
    setTimeout(() => setNotice(""), 4000);
    refs[0]?.current?.focus();
  };

  // "+44 •••• 0101": the country code and last four digits only.
  const maskedPhone = (() => {
    if (!phone) return "your phone";
    const code = parsePhoneNumberFromString(`+${phone.replace(/\D/g, "")}`)?.countryCallingCode;
    return `${code ? `+${code} ` : ""}•••• ${phone.slice(-4)}`;
  })();

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
                // The first box takes the code AutoFilled from the SMS.
                textContentType={i === 0 ? "oneTimeCode" : "none"}
                autoComplete={i === 0 ? "sms-otp" : "off"}
                accessibilityLabel={`Digit ${i + 1} of 6`}
                textAlign="center"
                autoFocus={i === 0}
                selectTextOnFocus
                editable={status !== "success" && status !== "verifying"}
              />
            ))}
          </Animated.View>

          {/* Error, or how long the code is valid for */}
          {status === "error" ? (
            <View style={s.statusRow}>
              <AlertCircle size={15} color={ERROR} />
              <Text style={[s.statusText, { color: ERROR }]}>{errorMsg}</Text>
            </View>
          ) : expired ? (
            <View style={s.statusRow}>
              <AlertCircle size={15} color={ERROR} />
              <Text style={[s.statusText, { color: ERROR }]}>Code expired. Request a new one below.</Text>
            </View>
          ) : (
            <View style={s.statusRow} accessibilityLiveRegion="none">
              <Clock size={15} color={expiresIn <= 60 ? WARN : colors.textMuted} />
              <Text style={[s.statusText, { color: expiresIn <= 60 ? WARN : colors.textMuted }]}>
                Code expires in <Text style={s.timer}>{clock(expiresIn)}</Text>
              </Text>
            </View>
          )}

          {/* Verify & Continue — ONLY navigates on correct code */}
          <Pressable
            onPress={() => void handleVerify()}
            disabled={!allFilled || status === "success" || status === "verifying"}
            style={[
              s.verifyBtn,
              {
                backgroundColor:
                  status === "success" ? "#10b981" :
                  allFilled           ? pink        :
                                        colors.border,
                opacity: !allFilled || status === "success" || status === "verifying" ? 0.6 : 1,
              },
            ]}
          >
            <Text style={s.verifyBtnText}>
              {status === "success"   ? "✓  Verified!" :
               status === "verifying" ? "Verifying…" :
                                         "Verify & Continue"}
            </Text>
          </Pressable>

          {/* Resend */}
          <View style={s.resendBlock}>
            <Text style={[s.resendLabel, { color: colors.textMuted }]}>Didn't get the code?</Text>
            {resendIn > 0 && !expired ? (
              <View style={[s.resendBtn, { borderColor: colors.border }]}>
                <RotateCw size={15} color={colors.textMuted} />
                <Text style={[s.resendText, { color: colors.textMuted }]}>
                  Resend in <Text style={s.timer}>{clock(resendIn)}</Text>
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleResend}
                disabled={resending}
                accessibilityRole="button"
                style={({ pressed }) => [s.resendBtn, { borderColor: pink, backgroundColor: pinkLite, opacity: pressed || resending ? 0.7 : 1 }]}
              >
                <RotateCw size={15} color={pink} />
                <Text style={[s.resendText, { color: pink }]}>{resending ? "Sending…" : "Resend code"}</Text>
              </Pressable>
            )}
            {notice !== "" && (
              <View style={[s.statusRow, { marginTop: 10, marginBottom: 0 }]}>
                <CheckCircle2 size={15} color="#10b981" />
                <Text style={[s.statusText, { color: "#10b981" }]}>{notice}</Text>
              </View>
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
  sub:      { fontSize: 15, lineHeight: 23, textAlign: "center", marginBottom: 28 },


  boxRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  box: {
    width: 50, height: 58, borderRadius: 14,
    borderWidth: 2, fontSize: 24, fontWeight: "900",
  },

  statusRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  statusText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  timer:      { fontWeight: "800", fontVariant: ["tabular-nums"] },

  verifyBtn:     { width: "100%", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 22, marginTop: 4 },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  resendBlock: { alignItems: "center", gap: 10 },
  resendLabel: { fontSize: 13 },
  resendBtn:   { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  resendText:  { fontSize: 14, fontWeight: "800" },
});
