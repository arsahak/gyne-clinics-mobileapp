import { BRAND_GRADIENT } from "@/constants/brand";
import { config } from "@/constants/config";
import { COUNTRIES, Country, flagEmoji } from "@/constants/countries";
import { checkMobile, defaultPhoneCountry, formatPhoneInput, phonePlaceholder } from "@/lib/phone";
import { sendOtp } from "@/lib/services/auth";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import { BrandIcon } from "@/components/brand/Logo";

// ── Icons ─────────────────────────────────────────────────────────────────────
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


/** Opens a webapp page (terms, privacy) in the browser. */
function openWeb(path: string) {
  Linking.openURL(`${config.webUrl}${path}`).catch(() =>
    Alert.alert("Couldn't open link", `Visit ${config.webUrl}${path}`),
  );
}

const ERROR = "#e11d48";

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const pink     = colors.primary;
  const purple   = colors.secondary;

  const [phone,   setPhone]   = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  // Country code picker (preselected from where the phone is)
  const [country, setCountry]       = useState<Country>(defaultPhoneCountry);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch]         = useState("");

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [search]);

  const openPicker  = () => { setSearch(""); setPickerOpen(true); };
  const closePicker = () => setPickerOpen(false);
  const pickCountry  = (c: Country) => {
    setCountry(c);
    setPhone(p => formatPhoneInput(p, "", c.iso2).text);
    closePicker();
  };

  const onPhoneChange = (text: string) => {
    const next = formatPhoneInput(text, phone, country.iso2);
    if (next.country) setCountry(next.country);
    setPhone(next.text);
  };

  // One sign-in for everyone, like the webapp: patient or doctor is chosen
  // only when a new number creates an account (register screen).
  const accent     = pink;

  const placeholder = useMemo(() => phonePlaceholder(country.iso2), [country.iso2]);
  const check       = useMemo(() => checkMobile(phone, country.iso2), [phone, country.iso2]);
  const valid       = check.valid;
  const showError   = touched && !focused && phone.length > 0 && !valid;
  const canSubmit   = valid && agreed;

  const [sending, setSending] = useState(false);

  const handleContinue = async () => {
    if (!canSubmit || sending) return;

    if (!check.e164) return;
    setSending(true);
    const result = await sendOtp(check.e164);
    setSending(false);

    if (!result.ok) {
      Alert.alert("Couldn't send code", result.message);
      return;
    }

    router.push({ pathname: "/verify-otp", params: { phone: result.data.phone } });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Light status bar text on the brand hero. */}
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Brand hero ── */}
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.hero, { paddingTop: insets.top + 22 }]}
          >
            <View style={[s.glow, { top: -70, right: -60, width: 220, height: 220 }]} pointerEvents="none" />
            <View style={[s.glow, { bottom: 10, left: -80, width: 180, height: 180, opacity: 0.6 }]} pointerEvents="none" />

            {/* Just the app icon */}
            <View style={s.art}>
              <BrandIcon height={120} tone="white" animated />
            </View>

          </LinearGradient>

          {/* ── Card form ── */}
          <View style={[s.card, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? "#000" : accent,
          }]}>

            {/* Welcome heading */}
            <Text style={[s.title, { color: colors.text }]}>Welcome 👋</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>
              Sign in or create an account with your mobile number. We'll send you a one-time code.
            </Text>

            {/* Phone label */}
            <Text style={[s.label, { color: colors.text }]}>Mobile number</Text>

            {/* Phone input */}
            <View style={[
              s.inputRow,
              { borderColor: showError ? ERROR : focused ? accent : colors.border, backgroundColor: colors.background },
              focused && { shadowColor: accent, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
            ]}>
              <Pressable
                style={[s.prefixWrap, { borderRightColor: colors.border }]}
                onPress={openPicker}
                accessibilityRole="button"
                accessibilityLabel={`Country code ${country.name} ${country.dial}. Change country`}
                hitSlop={4}
              >
                <Text style={s.flag}>{flagEmoji(country.iso2)}</Text>
                <Text style={[s.prefix, { color: focused ? accent : colors.text }]}>{country.dial}</Text>
                <ChevronDownIcon color={colors.textMuted} />
              </Pressable>
              <TextInput
                style={[s.phoneInput, { color: colors.text }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                autoCorrect={false}
                maxLength={20}
                selectionColor={accent}
                accessibilityLabel="Mobile number"
                value={phone}
                onChangeText={onPhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setTouched(true); }}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {!valid && phone.length > 0 && (
                <Pressable
                  onPress={() => { setPhone(""); setTouched(false); }}
                  style={[s.clearBtn, { backgroundColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear number"
                  hitSlop={10}
                >
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke={colors.textMuted} strokeWidth={3.2} strokeLinecap="round" />
                  </Svg>
                </Pressable>
              )}
              {valid && (
                <View style={s.validIcon} accessibilityLabel="Valid number">
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}
            </View>

            {/* Error or hint under the field */}
            <Text
              style={[s.hint, { color: showError ? ERROR : colors.textMuted }]}
              accessibilityLiveRegion="polite"
            >
              {showError
                ? `Enter a valid ${country.name} mobile number.`
                : "We'll text you a 6-digit code. Standard SMS rates may apply."}
            </Text>

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
                I accept the{" "}
                <Text style={[s.link, { color: accent }]} onPress={() => openWeb("/terms")}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={[s.link, { color: accent }]} onPress={() => openWeb("/privacy")}>Privacy Policy</Text>
                .
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
                <Text style={s.ctaText}>Continue</Text>
              )}
            </Pressable>

            {/* Secure badge */}
            <View style={s.secureBadge}>
              <ShieldIcon color={purple} />
              <Text style={[s.secureText, { color: colors.textMuted }]}>
                Your data is encrypted and private
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
    paddingHorizontal: 24,
    paddingBottom: 96,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  glow: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.13)" },
  art: { alignSelf: "center", marginTop: 34, marginBottom: 10 },

  // ── Card ──
  card: {
    marginHorizontal: 18,
    marginTop: -46,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },

  title:    { fontSize: 24, fontWeight: "800", letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 20 },

  // Label
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },

  // Input
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    height: 56, marginBottom: 8,
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
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 16, letterSpacing: 0.3, height: "100%" },
  clearBtn:   { width: 20, height: 20, borderRadius: 10, marginRight: 14, alignItems: "center", justifyContent: "center" },
  hint:       { fontSize: 12, lineHeight: 17, marginBottom: 16, marginLeft: 2 },
  validIcon: {
    width: 22, height: 22, borderRadius: 11, marginRight: 14,
    backgroundColor: "#10b981", alignItems: "center", justifyContent: "center",
  },

  // Checkbox
  checkRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 22 },
  checkbox:  { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkText: { flex: 1, fontSize: 13, lineHeight: 20 },
  link:      { fontWeight: "700", textDecorationLine: "underline" },

  // CTA
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 16, paddingVertical: 16, marginBottom: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  // Secure badge
  secureBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
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
