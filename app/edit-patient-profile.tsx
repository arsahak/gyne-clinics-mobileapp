import { api, uploadImage } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, CalendarDays, Camera, Check, HeartPulse, Save, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PregnancyStatus = "not_pregnant" | "pregnant" | "postpartum" | "trying_to_conceive";
type Profile = {
  age?: number; heightCm?: number; weightKg?: number; pregnancyStatus?: PregnancyStatus;
  menstrualHistory?: { lastPeriodDate?: string; cycleLengthDays?: number; periodLengthDays?: number };
  account?: { name?: string; phone?: string; avatar?: string };
};

function initials(name?: string) {
  if (!name?.trim()) return "P";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_OPTIONS: { value: PregnancyStatus; label: string }[] = [
  { value: "not_pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Pregnant" },
  { value: "postpartum", label: "Postpartum" },
  { value: "trying_to_conceive", label: "Trying to conceive" },
];

export default function EditPatientProfileScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [lastPeriod, setLastPeriod] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const [androidDatePicked, setAndroidDatePicked] = useState(false);
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus>("not_pregnant");

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await api<{ success: boolean; data: Profile }>("/api/patients/me", { token: token ?? undefined });
      if (!active) return;
      if (!result.ok) {
        setLoading(false);
        Alert.alert("Couldn’t load profile", result.message, [{ text: "Go back", onPress: () => router.back() }]);
        return;
      }
      const p = result.data.data;
      setName(p.account?.name ?? "");
      setAvatar(p.account?.avatar ?? null);
      setAge(p.age?.toString() ?? "");
      setHeight(p.heightCm?.toString() ?? "");
      setWeight(p.weightKg?.toString() ?? "");
      setCycleLength(p.menstrualHistory?.cycleLengthDays?.toString() ?? "28");
      setPeriodLength(p.menstrualHistory?.periodLengthDays?.toString() ?? "5");
      setLastPeriod(p.menstrualHistory?.lastPeriodDate ? new Date(p.menstrualHistory.lastPeriodDate) : null);
      setPregnancyStatus(p.pregnancyStatus ?? "not_pregnant");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router, token]);

  const saveProfilePhoto = async (localUri: string) => {
    setLocalAvatar(localUri);
    setAvatarFailed(false);
    setUploadingAvatar(true);

    const uploaded = await uploadImage(localUri, token ?? undefined);
    if (!uploaded.ok) {
      setUploadingAvatar(false);
      setLocalAvatar(null);
      Alert.alert("Couldn’t upload photo", uploaded.message);
      return;
    }

    const saved = await api<{ success: boolean; data: Profile }>("/api/patients/me", {
      method: "PUT",
      token: token ?? undefined,
      body: { avatar: uploaded.data.url },
    });
    setUploadingAvatar(false);
    if (!saved.ok) {
      setLocalAvatar(null);
      Alert.alert("Couldn’t save photo", saved.message);
      return;
    }

    setAvatar(saved.data.data.account?.avatar ?? uploaded.data.url);
    setLocalAvatar(null);
  };

  const openPhotoLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to choose a profile picture.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!picked.canceled && picked.assets[0]) await saveProfilePhoto(picked.assets[0].uri);
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Allow camera access to take a profile picture.");
      return;
    }
    const captured = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!captured.canceled && captured.assets[0]) await saveProfilePhoto(captured.assets[0].uri);
  };

  const chooseProfilePhoto = () => {
    if (uploadingAvatar) return;
    Alert.alert("Profile picture", "Choose how you’d like to add your photo.", [
      { text: "Take photo", onPress: openCamera },
      { text: "Choose from library", onPress: openPhotoLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openDatePicker = () => {
    setDraftDate(lastPeriod ?? new Date());
    setAndroidDatePicked(false);
    setShowDate(true);
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setShowDate(false);
      return;
    }
    if (date) {
      setDraftDate(date);
      if (Platform.OS === "android") setAndroidDatePicked(true);
    }
  };

  const confirmDate = () => {
    setLastPeriod(draftDate);
    setShowDate(false);
  };

  const save = async () => {
    const values = { age: Number(age), height: Number(height), weight: Number(weight), cycle: Number(cycleLength), period: Number(periodLength) };
    if (name.trim().length < 2) return Alert.alert("Check your name", "Please enter at least 2 characters.");
    if (!Number.isFinite(values.age) || values.age < 10 || values.age > 120) return Alert.alert("Check your age", "Enter an age between 10 and 120.");
    if (!Number.isFinite(values.height) || values.height < 80 || values.height > 250) return Alert.alert("Check your height", "Enter a height between 80 and 250 cm.");
    if (!Number.isFinite(values.weight) || values.weight < 20 || values.weight > 400) return Alert.alert("Check your weight", "Enter a weight between 20 and 400 kg.");
    if (!Number.isFinite(values.cycle) || values.cycle < 15 || values.cycle > 90) return Alert.alert("Check cycle length", "Enter a cycle length between 15 and 90 days.");
    if (!Number.isFinite(values.period) || values.period < 1 || values.period > 20) return Alert.alert("Check period length", "Enter a period length between 1 and 20 days.");

    setSaving(true);
    const result = await api<{ success: boolean }>("/api/patients/me", {
      method: "PUT",
      token: token ?? undefined,
      body: {
        name: name.trim(), age: values.age, heightCm: values.height, weightKg: values.weight,
        pregnancyStatus,
        menstrualHistory: {
          cycleLengthDays: values.cycle,
          periodLengthDays: values.period,
          ...(lastPeriod ? { lastPeriodDate: lastPeriod.toISOString() } : {}),
        },
      },
    });
    setSaving(false);
    if (!result.ok) return Alert.alert("Couldn’t save profile", result.message);
    Alert.alert("Profile updated", "Your health details have been saved.", [{ text: "Done", onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerButton}><ArrowLeft size={21} color={colors.text} /></Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Edit health profile</Text>
        <View style={s.headerButton} />
      </View>
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.photoSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
                onPress={chooseProfilePhoto}
                disabled={uploadingAvatar}
                style={s.photoButton}
              >
                <View style={[s.profilePhoto, { backgroundColor: colors.primary }]}> 
                  {(localAvatar || avatar) && !avatarFailed ? (
                    <Image
                      source={{ uri: localAvatar || avatar || undefined }}
                      style={s.profilePhotoImage}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <Text style={s.profilePhotoInitials}>{initials(name)}</Text>
                  )}
                  {uploadingAvatar && (
                    <View style={s.profilePhotoLoading}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                <View style={[s.photoCameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                  <Camera size={16} color="#fff" />
                </View>
              </Pressable>
              <Text style={[s.photoTitle, { color: colors.text }]}>Profile picture</Text>
              <Text style={[s.photoHint, { color: colors.textMuted }]}>
                Tap the camera to take or choose a photo
              </Text>
            </View>

            <View style={[s.intro, { backgroundColor: colors.primaryLight }]}> 
              <HeartPulse size={22} color={colors.primary} />
              <View style={s.introCopy}>
                <Text style={[s.introTitle, { color: colors.primary }]}>Keep your care profile current</Text>
                <Text style={[s.introText, { color: colors.textMuted }]}>Accurate details improve cycle estimates and help doctors understand your needs.</Text>
              </View>
            </View>

            <Text style={[s.section, { color: colors.textMuted }]}>PERSONAL DETAILS</Text>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" colors={colors} />
            <View style={s.twoColumns}>
              <View style={s.column}><Field label="Age" value={age} onChangeText={setAge} placeholder="Age" numeric colors={colors} /></View>
              <View style={s.column}><Field label="Height (cm)" value={height} onChangeText={setHeight} placeholder="165" numeric colors={colors} /></View>
            </View>
            <Field label="Weight (kg)" value={weight} onChangeText={setWeight} placeholder="60" numeric colors={colors} />

            <Text style={[s.section, { color: colors.textMuted }]}>CYCLE DETAILS</Text>
            <View style={s.twoColumns}>
              <View style={s.column}><Field label="Cycle length" value={cycleLength} onChangeText={setCycleLength} placeholder="28 days" numeric colors={colors} /></View>
              <View style={s.column}><Field label="Period length" value={periodLength} onChangeText={setPeriodLength} placeholder="5 days" numeric colors={colors} /></View>
            </View>
            <View style={s.dateField}>
              <Text style={[s.label, { color: colors.text }]}>Last period start</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose last period start date"
                onPress={openDatePicker}
                style={[
                  s.dateButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <CalendarDays
                  size={18}
                  color={lastPeriod ? colors.primary : colors.textMuted}
                />
                <Text
                  style={{
                    color: lastPeriod ? colors.text : colors.textMuted,
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  {lastPeriod ? formatShortDate(lastPeriod) : "Tap to select"}
                </Text>
                <View style={[s.dateBadge, { backgroundColor: colors.primaryLight }]}> 
                  <Text style={[s.dateBadgeText, { color: colors.primary }]}> 
                    {lastPeriod ? "Change" : "Select"}
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text style={[s.label, { color: colors.text, marginTop: 17 }]}>Pregnancy status</Text>
            <View style={s.chips}>
              {STATUS_OPTIONS.map((option) => {
                const selected = pregnancyStatus === option.value;
                return <Pressable key={option.value} onPress={() => setPregnancyStatus(option.value)} style={[s.chip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
                  {selected && <Check size={14} color="#fff" />}<Text style={{ color: selected ? "#fff" : colors.text, fontSize: 13, fontWeight: "600" }}>{option.label}</Text>
                </Pressable>;
              })}
            </View>
            <Pressable onPress={save} disabled={saving} style={[s.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={s.saveText}>Save changes</Text></>}
            </Pressable>
          </ScrollView>

          <Modal
            visible={showDate}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDate(false)}
          >
            <Pressable style={s.dateBackdrop} onPress={() => setShowDate(false)} />
            <View style={[s.dateSheet, { backgroundColor: colors.surfaceElevated }]}> 
              <View style={[s.dateHandle, { backgroundColor: colors.border }]} />
              <Pressable
                accessibilityLabel="Close date picker"
                onPress={() => setShowDate(false)}
                style={[s.dateClose, { backgroundColor: colors.background }]}
              >
                <X size={18} color={colors.textMuted} />
              </Pressable>

              {(Platform.OS !== "android" || !androidDatePicked) && (
                <DateTimePicker
                  value={draftDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              <View style={s.dateActions}>
                <Pressable onPress={() => setShowDate(false)} style={[s.dateCancel, { borderColor: colors.border }]}> 
                  <Text style={[s.dateCancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmDate} style={[s.dateConfirm, { backgroundColor: colors.primary }]}> 
                  <Check size={17} color="#fff" />
                  <Text style={s.dateConfirmText}>Confirm date</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, numeric, colors }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; numeric?: boolean; colors: ReturnType<typeof useTheme>["colors"] }) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}><Text style={[s.label, { color: colors.text }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={numeric ? "numeric" : "default"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.border }]} /></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 },
  headerButton: { width: 44, height: 40, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" }, loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 44 },
  photoSection: { alignItems: "center", paddingTop: 4, paddingBottom: 22 },
  photoButton: { position: "relative", marginBottom: 10 },
  profilePhoto: { width: 92, height: 92, borderRadius: 31, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  profilePhotoImage: { width: "100%", height: "100%" },
  profilePhotoInitials: { color: "#fff", fontSize: 30, fontWeight: "800" },
  profilePhotoLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000066", alignItems: "center", justifyContent: "center" },
  photoCameraBadge: { position: "absolute", right: -6, bottom: -4, width: 34, height: 34, borderRadius: 12, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  photoTitle: { fontSize: 14, fontWeight: "800" },
  photoHint: { fontSize: 11, marginTop: 3 },
  intro: { flexDirection: "row", alignItems: "flex-start", borderRadius: 18, padding: 16 }, introCopy: { flex: 1, marginLeft: 11 }, introTitle: { fontSize: 14, fontWeight: "800", marginBottom: 3 }, introText: { fontSize: 12, lineHeight: 18 },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 25, marginBottom: 13 }, field: { marginBottom: 15 }, label: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 }, twoColumns: { flexDirection: "row", gap: 11 }, column: { flex: 1 },
  dateField: { marginBottom: 15 },
  dateButton: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 14 },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateBadgeText: { fontSize: 12, fontWeight: "700" },
  dateBackdrop: { flex: 1, backgroundColor: "#00000066" },
  dateSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 32 : 22 },
  dateHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  dateClose: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 4 },
  dateActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  dateCancel: { flex: 1, height: 48, borderWidth: 1.5, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dateCancelText: { fontSize: 14, fontWeight: "700" },
  dateConfirm: { flex: 1.6, height: 48, borderRadius: 14, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  dateConfirmText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  saveButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 15, marginTop: 28 }, saveText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
