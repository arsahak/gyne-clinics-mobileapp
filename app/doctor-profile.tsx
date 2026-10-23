import { DOCTOR_ACCENT } from "@/constants/brand";
import { api } from "@/lib/api";
import { acceptConsent } from "@/lib/services/auth";
import { routeForAccount, useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Svg, { Path } from "react-native-svg";

// ── Icons ─────────────────────────────────────────────────────────────────────
function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" fill={color} fillOpacity={0.12} />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const STEPS = ["Professional", "Consent"];

// Same choices as the webapp and the backend.
const SPECIALIZATIONS = [
  "General Gynaecology",
  "Reproductive Medicine",
  "Urogynaecology & Pelvic Health",
  "Menopause & HRT",
  "Pregnancy Care",
  "Adolescent Gynaecology",
  "Intimate Wellness",
];

/** "MBBS, MD" → ["MBBS", "MD"] */
const splitList = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

/** One choice from a short list, shown as chips. */
function Chips({ label, options, value, onChange, colors, accent }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; colors: any; accent: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fS.label, { color: colors.text }]}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const on = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: on ? accent : colors.border, backgroundColor: on ? accent + "1A" : colors.surface }}
            >
              <Text style={{ fontSize: 13, fontWeight: on ? "700" : "500", color: on ? accent : colors.text }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Reusable text input ────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType, hint, colors, accent,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: "default" | "numeric";
  hint?: string; colors: any; accent: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fS.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? "default"}
        style={[fS.input, {
          color: colors.text,
          backgroundColor: colors.surface,
          borderColor: focused ? accent : colors.border,
        }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <Text style={[fS.hint, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}
const fS = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  hint:  { fontSize: 11, marginTop: 6, lineHeight: 16 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DoctorProfileScreen() {
  const { colors } = useTheme();
  const { account, setAccount } = useAuth();
  const router = useRouter();
  const accent     = DOCTOR_ACCENT;
  const accentLite = DOCTOR_ACCENT + "1A";

  // Profile saved (e.g. on the webapp) but consent not given yet: only the consent step is left.
  const consentOnly = account?.nextStep === "consent";
  const [step, setStep] = useState(consentOnly ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);

  // Professional info
  const [name,               setName]               = useState("");
  const [qualifications,     setQualifications]     = useState("");
  const [specialization,     setSpecialization]     = useState("");
  const [experienceYears,    setExperienceYears]    = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [title,              setTitle]              = useState("");
  const [registrationBody,   setRegistrationBody]   = useState("");
  const [city,               setCity]               = useState("");
  const [languages,          setLanguages]          = useState("English");
  const [feeGBP,             setFeeGBP]             = useState("");

  // Consent (A5-equivalent for doctors)
  const [consentAccepted, setConsentAccepted] = useState(false);

  const canNext = [
    name.trim().length > 1 &&
      title.trim().length > 1 &&
      splitList(qualifications).length > 0 &&
      SPECIALIZATIONS.includes(specialization) &&
      experienceYears.trim() !== "" &&
      registrationNumber.trim().length > 2 &&
      registrationBody.trim().length > 1 &&
      city.trim().length > 1 &&
      splitList(languages).length > 0 &&
      feeGBP.trim() !== "" && Number(feeGBP) >= 0,
    consentAccepted,
  ][step];

  const back = () => setStep((s) => s - 1);

  const submitProfile = async () => {
    if (submitting) return;
    setSubmitting(true);

    if (!consentOnly) {
      // Mon–Fri 09:00–17:00 to start with; changed later under Schedule.
      const result = await api("/doctors/me", {
        method: "PUT",
        body: {
          fullName: name.trim(),
          title: title.trim(),
          specialization,
          qualifications: splitList(qualifications),
          experienceYears: Number(experienceYears),
          registrationNumber: registrationNumber.trim(),
          registrationBody: registrationBody.trim(),
          city: city.trim(),
          languages: splitList(languages),
          feeGBP: Number(feeGBP),
          schedule: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London" },
        },
      });
      if (!result.ok) {
        setSubmitting(false);
        Alert.alert("Couldn't save profile", result.message);
        return;
      }
    }

    // Terms, privacy and credential checks are accepted on the account.
    const consented = await acceptConsent();
    setSubmitting(false);
    if (!consented.ok) {
      Alert.alert("Couldn't save your consent", consented.message);
      return;
    }
    await setAccount(consented.data);
    router.replace(routeForAccount(consented.data));
  };

  const next = () => {
    if (step < 1) { setStep((s) => s + 1); return; }
    submitProfile();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* ── Top bar ── */}
        <View style={[s.topBar, { borderBottomColor: colors.border }]}>
          {step > 0 && !consentOnly ? (
            <Pressable onPress={back} style={s.backBtn}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : <View style={s.backBtn} />}

          <Text style={[s.topTitle, { color: colors.text }]}>
            {["Professional Details", "Consent"][step]}
          </Text>

          <View style={s.backBtn} />
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* STEP 0 — Professional details */}
          {step === 0 && (
            <>
              <Text style={[s.stepSub, { color: colors.textMuted }]}>
                Tell us about your qualifications and practice
              </Text>

              <Field label="Full Name" value={name} onChangeText={setName}
                placeholder="e.g. Dr. Sarah Miller" colors={colors} accent={accent} />

              <Field label="Job Title" value={title} onChangeText={setTitle}
                placeholder="e.g. Consultant Gynaecologist" colors={colors} accent={accent} />

              <Chips label="Specialization" options={SPECIALIZATIONS} value={specialization}
                onChange={setSpecialization} colors={colors} accent={accent} />

              <Field label="Qualifications" value={qualifications} onChangeText={setQualifications}
                placeholder="e.g. MBBS, MD (Gynecology)"
                hint="Separate multiple qualifications with commas"
                colors={colors} accent={accent} />

              <Field label="Years of Experience" value={experienceYears} onChangeText={setExperienceYears}
                placeholder="e.g. 8" keyboardType="numeric" colors={colors} accent={accent} />

              <Field label="Medical Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber}
                placeholder="e.g. BMDC-A-12345" colors={colors} accent={accent} />

              <Field label="Registration Body" value={registrationBody} onChangeText={setRegistrationBody}
                placeholder="e.g. GMC, BMDC" colors={colors} accent={accent} />

              <Field label="City" value={city} onChangeText={setCity}
                placeholder="e.g. London" colors={colors} accent={accent} />

              <Field label="Languages" value={languages} onChangeText={setLanguages}
                placeholder="e.g. English, Bangla"
                hint="Separate multiple languages with commas"
                colors={colors} accent={accent} />

              <Field label="Consultation Fee (GBP)" value={feeGBP} onChangeText={setFeeGBP}
                placeholder="e.g. 45" keyboardType="numeric"
                hint="UK & Europe price. Other regions adjust automatically. Enter 0 for free."
                colors={colors} accent={accent} />
            </>
          )}

          {/* STEP 1 — Consent */}
          {step === 1 && (
            <>
              <Text style={[s.stepSub, { color: colors.textMuted }]}>
                Please review and accept before we submit your profile for verification
              </Text>

              <Pressable
                style={[s.consentRow, { backgroundColor: consentAccepted ? accentLite : colors.surface, borderColor: consentAccepted ? accent : colors.border }]}
                onPress={() => setConsentAccepted(v => !v)}
              >
                <View style={[s.checkbox, { backgroundColor: consentAccepted ? accent : "transparent", borderColor: consentAccepted ? accent : colors.border }]}>
                  {consentAccepted && <CheckIcon color="#fff" />}
                </View>
                <Text style={[s.consentText, { color: colors.text }]}>
                  I confirm the professional details above are accurate and accept the{" "}
                  <Text style={{ color: accent, fontWeight: "700" }}>Terms of Service</Text>
                  {" "}and{" "}
                  <Text style={{ color: accent, fontWeight: "700" }}>Privacy Policy</Text>
                  , and consent to verification of my credentials by the administrator.
                </Text>
              </Pressable>

              <View style={[s.tipCard, { backgroundColor: accentLite, borderColor: accent + "44" }]}>
                <ShieldIcon color={accent} />
                <Text style={[s.tipText, { color: accent }]}>
                  Your profile will remain pending until an administrator verifies your credentials.
                  You'll be notified once it's approved.
                </Text>
              </View>
            </>
          )}

        </ScrollView>

        {/* ── Bottom bar ── */}
        <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>

          <View style={s.stepsRow}>
            {STEPS.map((label, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <View key={i} style={s.stepCol}>
                  <View style={[
                    s.stepDot,
                    done   ? { backgroundColor: accent } :
                    active ? { backgroundColor: accent + "28", borderColor: accent, borderWidth: 2 } :
                             { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 2 },
                  ]}>
                    {done
                      ? <CheckIcon color="#fff" />
                      : <Text style={{ fontSize: 10, fontWeight: "800", color: active ? accent : colors.textMuted }}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[s.stepLabel, { color: active ? accent : colors.textMuted }]}>{label}</Text>
                  {i < STEPS.length - 1 && (
                    <View style={[s.stepConnector, { backgroundColor: i < step ? accent : colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>

          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { backgroundColor: accent, width: `${((step + 1) / 2) * 100}%` as any }]} />
          </View>

          <Pressable
            onPress={next}
            disabled={!canNext || submitting}
            style={[s.ctaBtn, { backgroundColor: canNext ? accent : colors.border, opacity: canNext && !submitting ? 1 : 0.55 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.ctaText}>{step < 1 ? "Continue" : "Submit for Verification"}</Text>
                <ChevronRight color="#fff" />
              </>
            )}
          </Pressable>

        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },

  topBar:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:  { width: 44, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "800", textAlign: "center" },

  stepSub: { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  checkbox:   { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },

  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 13, borderWidth: 1, padding: 14, marginTop: 4 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },

  bottomBar: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === "ios" ? 28 : 20, borderTopWidth: StyleSheet.hairlineWidth },

  stepsRow:      { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  stepCol:       { flexDirection: "row", alignItems: "center" },
  stepDot:       { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepLabel:     { fontSize: 11, fontWeight: "700", marginLeft: 6, marginRight: 4 },
  stepConnector: { width: 28, height: 2, borderRadius: 1, marginHorizontal: 4 },

  progressBar:  { height: 4, borderRadius: 2, marginBottom: 14, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  ctaBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 15 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
