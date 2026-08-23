import { COUNTRIES, Country, flagEmoji } from "@/constants/countries";
import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
function DoctorIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3v6a4 4 0 0 0 8 0V3" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 13v2a5 5 0 0 0 10 0v-2.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="19" cy="12.5" r="1.8" stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

  const [role,    setRole]    = useState<"patient" | "doctor">("patient");
  const [phone,   setPhone]   = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [focused, setFocused] = useState(false);

  // Country code picker
  const [country, setCountry]       = useState<Country>(COUNTRIES[0]!);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch]         = useState("");

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [search]);

  const openPicker  = () => { setSearch(""); setPickerOpen(true); };
  const closePicker = () => setPickerOpen(false);
  const pickCountry  = (c: Country) => { setCountry(c); closePicker(); };

  // Sliding tab indicator: 0 = Patient, 1 = Doctor
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: role === "doctor" ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 80,
    }).start();
  }, [role]);

  const tabPad     = 4;
  const tabGap     = 4;
  const pillWidth  = tabBarWidth > 0 ? (tabBarWidth - tabPad * 2 - tabGap) / 2 : 0;
  const tabIndicatorStyle = {
    width: pillWidth,
    backgroundColor: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [pink, DOCTOR_ACCENT] }),
    transform: [{ translateX: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, pillWidth + tabGap] }) }],
  };

  // Whole-page accent: pink for Patient, teal for Doctor
  const accent     = role === "doctor" ? DOCTOR_ACCENT : pink;
  const accentLite = role === "doctor" ? DOCTOR_ACCENT + "1A" : pinkLite;

  const valid     = phone.trim().length >= 7;
  const canSubmit = valid && agreed;

  const [sending, setSending] = useState(false);

  const toE164 = (dialCode: string, local: string) => {
    const digits = local.replace(/\D/g, "").replace(/^0+/, "");
    return `${dialCode}${digits}`;
  };

  const handleContinue = async () => {
    if (!canSubmit || sending) return;

    const e164Phone = toE164(country.dial, phone);
    setSending(true);
    const result = await api("/api/auth/otp/send", {
      method: "POST",
      body: { phone: e164Phone, role },
    });
    setSending(false);

    if (!result.ok) {
      Alert.alert("Couldn't send code", result.message);
      return;
    }

    router.push({ pathname: "/verify-otp", params: { phone: e164Phone, role } });
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
            <TopBlob pink={accent} />

            {/* floating decorative icons */}
            <View style={[s.floatBubble, s.floatTL, { backgroundColor: accentLite, borderColor: accent + "33" }]}>
              <HeartIcon color={accent} />
            </View>
            <View style={[s.floatBubble, s.floatTR, { backgroundColor: accentLite, borderColor: accent + "33" }]}>
              <StarIcon color={accent} />
            </View>

            {/* centre avatar ring */}
            <View style={[s.avatarRing, { borderColor: accent + "40", backgroundColor: accentLite }]}>
              <View style={[s.avatarInner, { backgroundColor: accent }]}>
                <UserIcon color="#fff" />
              </View>
            </View>
          </View>

          {/* ── Card form ── */}
          <View style={[s.card, {
            backgroundColor: colors.surface,
            shadowColor: isDark ? "#000" : accent,
          }]}>

            {/* Welcome heading */}
            <Text style={[s.title, { color: colors.text }]}>Welcome Back 👋</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>
              {role === "doctor"
                ? "Enter your mobile number to securely access your clinic dashboard."
                : "Enter your mobile number to securely access your health records."}
            </Text>

            {/* Role tabs — Patient / Doctor */}
            <View
              style={[s.tabBar, { borderColor: colors.border, backgroundColor: colors.background }]}
              onLayout={e => setTabBarWidth(e.nativeEvent.layout.width)}
            >
              {tabBarWidth > 0 && <Animated.View style={[s.tabIndicator, tabIndicatorStyle]} />}

              <Pressable style={s.tabBtn} onPress={() => setRole("patient")}>
                <UserIcon color={role === "patient" ? "#fff" : colors.textMuted} />
                <Text style={[s.tabText, { color: role === "patient" ? "#fff" : colors.textMuted }]}>
                  Patient
                </Text>
              </Pressable>
              <Pressable style={s.tabBtn} onPress={() => setRole("doctor")}>
                <DoctorIcon color={role === "doctor" ? "#fff" : colors.textMuted} />
                <Text style={[s.tabText, { color: role === "doctor" ? "#fff" : colors.textMuted }]}>
                  Doctor
                </Text>
              </Pressable>
            </View>

            {/* Phone label */}
            <Text style={[s.label, { color: colors.text }]}>Mobile Number</Text>

            {/* Phone input */}
            <View style={[
              s.inputRow,
              { borderColor: focused ? accent : colors.border, backgroundColor: colors.background },
              focused && { shadowColor: accent, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
            ]}>
              <Pressable style={[s.prefixWrap, { borderRightColor: colors.border }]} onPress={openPicker}>
                <Text style={s.flag}>{flagEmoji(country.iso2)}</Text>
                <Text style={[s.prefix, { color: focused ? accent : colors.text }]}>{country.dial}</Text>
                <ChevronDownIcon color={colors.textMuted} />
              </Pressable>
              <TextInput
                style={[s.phoneInput, { color: colors.text }]}
                placeholder="Phone number"
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
                { backgroundColor: agreed ? accent : "transparent", borderColor: agreed ? accent : colors.border },
              ]}>
                {agreed && (
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth={3}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </View>
              <Text style={[s.checkText, { color: colors.textMuted }]}>
                {role === "doctor" ? (
                  <>
                    I confirm my professional details are accurate and accept the{" "}
                    <Text style={{ color: accent, fontWeight: "700" }}>Terms of Service</Text>
                    {" "}and{" "}
                    <Text style={{ color: accent, fontWeight: "700" }}>Privacy Policy</Text>
                    , and consent to verification of my credentials.
                  </>
                ) : (
                  <>
                    I have read and accept the{" "}
                    <Text style={{ color: accent, fontWeight: "700" }}>Medical Disclaimer</Text>
                    {" "}and{" "}
                    <Text style={{ color: accent, fontWeight: "700" }}>Privacy Policy</Text>
                    , and consent to the collection and use of my health data for care and communication.
                  </>
                )}
              </Text>
            </Pressable>

            {/* CTA */}
            <Pressable
              onPress={handleContinue}
              disabled={!canSubmit || sending}
              style={[s.ctaBtn, { backgroundColor: canSubmit ? accent : colors.border, opacity: canSubmit && !sending ? 1 : 0.55 }]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <PhoneIcon color="#fff" />
                  <Text style={s.ctaText}>Get Verification Code</Text>
                </>
              )}
            </Pressable>

            {/* Secure badge */}
            <View style={[s.secureBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <ShieldIcon color={purple} />
              <Text style={[s.secureText, { color: colors.textMuted }]}>
                Encrypted in transit &amp; at rest
              </Text>
            </View>

          </View>

          {/* ── Footer disclaimer ── */}
          <Text style={[s.footNote, { color: colors.textMuted }]}>
            For informational use only. Not a substitute for medical advice.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country code picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closePicker}>
        <Pressable style={s.modalBackdrop} onPress={closePicker} />
        <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={s.modalHandle} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Select Country</Text>

          <View style={[s.searchRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <SearchIcon color={colors.textMuted} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Search country or code"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={item => item.iso2}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[s.countryRow, { borderBottomColor: colors.border }]}
                onPress={() => pickCountry(item)}
              >
                <Text style={s.flag}>{flagEmoji(item.iso2)}</Text>
                <Text style={[s.countryName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[s.countryDial, { color: colors.textMuted }]}>{item.dial}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={[s.noResults, { color: colors.textMuted }]}>No countries match.</Text>
            }
          />
        </View>
      </Modal>
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

  // Role tabs — Patient / Doctor
  tabBar: {
    flexDirection: "row", gap: 4,
    borderRadius: 14, borderWidth: 1.5,
    padding: 4, marginBottom: 22,
  },
  tabIndicator: {
    position: "absolute",
    top: 4, bottom: 4, left: 4,
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  tabText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },

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
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14,
    borderRightWidth: StyleSheet.hairlineWidth,
    height: "100%",
  },
  flag:       { fontSize: 18 },
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

  // Country picker modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: "75%",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingHorizontal: 20,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#00000022", marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 14 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, height: 46, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  countryRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryName: { flex: 1, fontSize: 15, fontWeight: "600" },
  countryDial: { fontSize: 14, fontWeight: "700" },
  noResults: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
