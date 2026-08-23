import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Svg, { Path, Rect } from "react-native-svg";

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
function CalIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" fill={color} fillOpacity={0.12} />
    </Svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CYCLE_LENGTHS    = ["21", "24", "26", "28", "30", "32", "35", "40+"];
const PERIOD_DURATIONS = ["2", "3", "4", "5", "6", "7", "8+"];
const PREGNANCY_LABELS = ["Not Pregnant", "Pregnant", "Postpartum", "Trying to Conceive"];
const PREGNANCY_VALUE: Record<string, string> = {
  "Not Pregnant": "not_pregnant",
  "Pregnant": "pregnant",
  "Postpartum": "postpartum",
  "Trying to Conceive": "trying_to_conceive",
};
const STEPS = ["Personal", "Cycle", "Consent"];

function calcAge(dob: Date): number {
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

// ── Date picker button ─────────────────────────────────────────────────────────
function DatePickerField({
  label, date, onDateChange, colors, pink,
}: {
  label: string;
  date: Date | null;
  onDateChange: (d: Date) => void;
  colors: any;
  pink: string;
}) {
  const [show, setShow] = useState(false);

  const displayValue = date
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Tap to select";

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) onDateChange(selected);
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 10);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fS.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        style={[
          fS.dateBtn,
          {
            backgroundColor: colors.surface,
            borderColor: show ? pink : colors.border,
          },
        ]}
      >
        <CalIcon color={date ? pink : colors.textMuted} />
        <Text style={[fS.dateBtnText, { color: date ? colors.text : colors.textMuted }]}>
          {displayValue}
        </Text>
        <View style={[fS.dateBadge, { backgroundColor: pink + "18" }]}>
          <Text style={[fS.dateBadgeText, { color: pink }]}>
            {date ? "Change" : "Select"}
          </Text>
        </View>
      </Pressable>

      {/* iOS — modal sheet */}
      {Platform.OS === "ios" && (
        <Modal visible={show} transparent animationType="slide">
          <Pressable style={fS.modalOverlay} onPress={() => setShow(false)} />
          <View style={[fS.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[fS.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[fS.modalTitle, { color: colors.text }]}>{label}</Text>
            <DateTimePicker
              value={date ?? new Date(1995, 0, 1)}
              mode="date"
              display="spinner"
              onChange={handleChange}
              maximumDate={maxDate}
              textColor={colors.text}
            />
            <Pressable
              style={[fS.modalDone, { backgroundColor: pink }]}
              onPress={() => setShow(false)}
            >
              <Text style={fS.modalDoneText}>Done</Text>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Android — native inline */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={date ?? new Date(1995, 0, 1)}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maxDate}
        />
      )}
    </View>
  );
}
const fS = StyleSheet.create({
  label:         { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input:         { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  dateBtn:       { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14 },
  dateBtnText:   { flex: 1, fontSize: 14 },
  dateBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dateBadgeText: { fontSize: 12, fontWeight: "700" },
  modalOverlay:  { flex: 1, backgroundColor: "#00000055" },
  modalSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle:    { fontSize: 16, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  modalDone:     { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  modalDoneText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

// ── Reusable text input ────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType, colors, pink,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: "default" | "numeric" | "email-address";
  colors: any; pink: string;
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
          borderColor: focused ? pink : colors.border,
        }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ── Pill selector ─────────────────────────────────────────────────────────────
function PillSelect({
  options, value, onChange, pink, colors,
}: {
  options: string[]; value: string; onChange: (v: string) => void;
  pink: string; pinkLite: string; colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {options.map((o) => {
        const sel = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
            backgroundColor: sel ? pink      : colors.surface,
            borderColor:     sel ? pink      : colors.border,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: sel ? "#fff" : colors.textMuted }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HealthProfileScreen() {
  const { colors }          = useTheme();
  const { completeProfile, token } = useAuth();
  const router              = useRouter();
  const pink     = colors.primary;
  const pinkLite = colors.primaryLight;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Personal
  const [name,     setName]     = useState("");
  const [dob,      setDob]      = useState<Date | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Cycle & pregnancy
  const [cycleLen,        setCycleLen]        = useState("28");
  const [periodLen,       setPeriodLen]       = useState("5");
  const [lastPeriod,      setLastPeriod]      = useState<Date | null>(null);
  const [pregnancyLabel,  setPregnancyLabel]  = useState("Not Pregnant");

  // Consent (A5 — mandatory before accessing health features)
  const [consentAccepted, setConsentAccepted] = useState(false);

  const canNext = [
    name.trim().length > 1 && dob !== null && heightCm.trim() !== "" && weightKg.trim() !== "",
    cycleLen !== "" && periodLen !== "",
    consentAccepted,
  ][step];

  const back = () => setStep((s) => s - 1);

  const submitProfile = async () => {
    if (!dob || submitting) return;
    setSubmitting(true);

    const result = await api("/api/patients/me", {
      method: "PUT",
      token: token ?? undefined,
      body: {
        name,
        age: calcAge(dob),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        menstrualHistory: {
          lastPeriodDate: lastPeriod ? lastPeriod.toISOString() : undefined,
          cycleLengthDays: Number(cycleLen.replace(/\D/g, "")),
          periodLengthDays: Number(periodLen.replace(/\D/g, "")),
        },
        pregnancyStatus: PREGNANCY_VALUE[pregnancyLabel],
        consentAccepted: true,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      Alert.alert("Couldn't save profile", result.message);
      return;
    }

    await completeProfile();
    router.replace("/(tabs)");
  };

  const next = () => {
    if (step < 2) { setStep((s) => s + 1); return; }
    submitProfile();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* ── Top bar — back + title only ── */}
        <View style={[s.topBar, { borderBottomColor: colors.border }]}>
          {step > 0 ? (
            <Pressable onPress={back} style={s.backBtn}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : <View style={s.backBtn} />}

          <Text style={[s.topTitle, { color: colors.text }]}>
            {["Personal Info", "Cycle Info", "Consent"][step]}
          </Text>

          <View style={s.backBtn} />
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* STEP 0 — Personal */}
          {step === 0 && (
            <>
              <Text style={[s.stepSub, { color: colors.textMuted }]}>Help us personalise your care</Text>
              <Field label="Full Name" value={name} onChangeText={setName}
                placeholder="e.g. Sarah Miller" colors={colors} pink={pink} />

              <DatePickerField
                label="Date of Birth"
                date={dob}
                onDateChange={setDob}
                colors={colors}
                pink={pink}
              />

              <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm}
                placeholder="e.g. 165" keyboardType="numeric" colors={colors} pink={pink} />
              <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg}
                placeholder="e.g. 60" keyboardType="numeric" colors={colors} pink={pink} />
            </>
          )}

          {/* STEP 1 — Cycle & pregnancy status */}
          {step === 1 && (
            <>
              <Text style={[s.stepSub, { color: colors.textMuted }]}>Track your menstrual cycle accurately</Text>

              <Text style={[fS.label, { color: colors.text }]}>Average Cycle Length (days)</Text>
              <PillSelect options={CYCLE_LENGTHS} value={cycleLen} onChange={setCycleLen}
                pink={pink} pinkLite={pinkLite} colors={colors} />

              <Text style={[fS.label, { color: colors.text }]}>Period Duration (days)</Text>
              <PillSelect options={PERIOD_DURATIONS} value={periodLen} onChange={setPeriodLen}
                pink={pink} pinkLite={pinkLite} colors={colors} />

              <DatePickerField
                label="Last Period Start Date"
                date={lastPeriod}
                onDateChange={setLastPeriod}
                colors={colors}
                pink={pink}
              />

              <Text style={[fS.label, { color: colors.text }]}>Pregnancy Status</Text>
              <PillSelect options={PREGNANCY_LABELS} value={pregnancyLabel} onChange={setPregnancyLabel}
                pink={pink} pinkLite={pinkLite} colors={colors} />
            </>
          )}

          {/* STEP 2 — Consent & Disclaimer (mandatory) */}
          {step === 2 && (
            <>
              <Text style={[s.stepSub, { color: colors.textMuted }]}>
                Please review and accept before we save your health profile
              </Text>

              <Pressable
                style={[s.consentRow, { backgroundColor: consentAccepted ? pinkLite : colors.surface, borderColor: consentAccepted ? pink : colors.border }]}
                onPress={() => setConsentAccepted(v => !v)}
              >
                <View style={[s.checkbox, { backgroundColor: consentAccepted ? pink : "transparent", borderColor: consentAccepted ? pink : colors.border }]}>
                  {consentAccepted && <CheckIcon color="#fff" />}
                </View>
                <Text style={[s.consentText, { color: colors.text }]}>
                  I have read and accept the{" "}
                  <Text style={{ color: pink, fontWeight: "700" }}>Medical Disclaimer</Text>
                  {" "}and consent to the collection and use of my health data for care and communication.
                  This information is for informational purposes only and is not a substitute for professional medical advice.
                </Text>
              </Pressable>

              <View style={[s.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ShieldIcon color={colors.secondary ?? pink} />
                <Text style={[s.tipText, { color: colors.textMuted }]}>
                  Your health data is encrypted and never shared without your consent.
                </Text>
              </View>
            </>
          )}

        </ScrollView>

        {/* ── Bottom bar — step dots + progress + CTA ── */}
        <View style={[s.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>

          {/* Step indicator dots + labels */}
          <View style={s.stepsRow}>
            {STEPS.map((label, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <View key={i} style={s.stepCol}>
                  <View style={[
                    s.stepDot,
                    done   ? { backgroundColor: pink } :
                    active ? { backgroundColor: pink + "28", borderColor: pink, borderWidth: 2 } :
                             { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 2 },
                  ]}>
                    {done
                      ? <CheckIcon color="#fff" />
                      : <Text style={{ fontSize: 10, fontWeight: "800", color: active ? pink : colors.textMuted }}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[s.stepLabel, { color: active ? pink : colors.textMuted }]}>{label}</Text>
                  {i < STEPS.length - 1 && (
                    <View style={[s.stepConnector, { backgroundColor: i < step ? pink : colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Progress bar */}
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { backgroundColor: pink, width: `${((step + 1) / 3) * 100}%` as any }]} />
          </View>

          {/* CTA */}
          <Pressable
            onPress={next}
            disabled={!canNext || submitting}
            style={[s.ctaBtn, { backgroundColor: canNext ? pink : colors.border, opacity: canNext && !submitting ? 1 : 0.55 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.ctaText}>{step < 2 ? "Continue" : "Complete Profile"}</Text>
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

  // Top bar
  topBar:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:  { width: 44, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "800", textAlign: "center" },

  // Step subtitle
  stepSub: { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  // Consent
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  checkbox:   { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Tip card
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 13, borderWidth: 1, padding: 14, marginTop: 4 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Bottom bar
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === "ios" ? 28 : 20, borderTopWidth: StyleSheet.hairlineWidth },

  // Step dots row
  stepsRow:      { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  stepCol:       { flexDirection: "row", alignItems: "center" },
  stepDot:       { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepLabel:     { fontSize: 11, fontWeight: "700", marginLeft: 6, marginRight: 4 },
  stepConnector: { width: 28, height: 2, borderRadius: 1, marginHorizontal: 4 },

  // Progress
  progressBar:  { height: 4, borderRadius: 2, marginBottom: 14, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  // CTA
  ctaBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 15 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
