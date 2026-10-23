import { getMyDoctorProfile, type MyDoctorChanges, type MyDoctorProfile, updateMyDoctorProfile } from "@/lib/services/doctors";
import { uploadAvatar } from "@/lib/services/patient";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, Save, Stethoscope } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { FormSkeleton } from "@/components/ui/Skeleton";

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

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const sameList = (a: string[], b: string[]) => a.join("|") === b.join("|");

function initials(name?: string) {
  if (!name?.trim()) return "DR";
  return name.trim().split(/\s+/).filter((part) => part.toLowerCase() !== "dr.").slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DR";
}

export default function EditDoctorProfileScreen() {
  const { colors } = useTheme();
  const { refresh } = useAuth();
  const router = useRouter();
  const accent = colors.primary;
  const accentBg = `${accent}18`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [name, setName] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [languages, setLanguages] = useState("");
  const [title, setTitle] = useState("");
  const [registrationBody, setRegistrationBody] = useState("");
  const [about, setAbout] = useState("");
  const [original, setOriginal] = useState<MyDoctorProfile | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getMyDoctorProfile();
      if (!active) return;
      if (!result.ok) {
        setLoading(false);
        Alert.alert("Couldn’t load profile", result.message, [{ text: "Go back", onPress: () => router.back() }]);
        return;
      }
      // Pending changes (waiting for an admin) are what the doctor edits.
      const p = { ...result.data, ...(result.data.pendingUpdate?.fields ?? {}) };
      setOriginal(p);
      setName(p.fullName);
      setAvatar(result.data.pendingUpdate?.avatar ?? (result.data.avatar || null));
      setTitle(p.title);
      setQualifications(p.qualifications.join(", "));
      setSpecialization(p.specialization);
      setExperienceYears(String(p.experienceYears));
      setRegistrationNumber(p.registrationNumber);
      setRegistrationBody(p.registrationBody);
      setHospitalName(p.clinic);
      setHospitalAddress(p.city);
      setLanguages(p.languages.join(", "));
      setAbout(p.about);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  const saveProfilePhoto = async (localUri: string) => {
    setLocalAvatar(localUri);
    setAvatarFailed(false);
    setUploadingAvatar(true);
    const uploaded = await uploadAvatar(localUri);
    setUploadingAvatar(false);
    if (!uploaded.ok) {
      setLocalAvatar(null);
      Alert.alert("Couldn’t upload photo", uploaded.message);
      return;
    }
    setAvatar(uploaded.data.avatar || localUri);
    setLocalAvatar(null);
    void refresh();
    if (uploaded.data.inReview) Alert.alert("Photo sent for review", "Patients will see your new photo once an admin approves it.");
  };

  const openPhotoLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Photo access needed", "Allow photo access to choose a profile picture.");
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!picked.canceled && picked.assets[0]) await saveProfilePhoto(picked.assets[0].uri);
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera access needed", "Allow camera access to take a profile picture.");
    const captured = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
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

  // Only the changed fields are sent; for an approved doctor most wait for an admin.
  const save = async () => {
    if (!original) return;
    const experience = Number(experienceYears);
    if (name.trim().length < 2) return Alert.alert("Check your name", "Please enter at least 2 characters.");
    if (title.trim().length < 2) return Alert.alert("Job title required", "Add your job title, e.g. Consultant Gynaecologist.");
    if (!splitList(qualifications).length) return Alert.alert("Qualifications required", "Add at least one professional qualification.");
    if (!SPECIALIZATIONS.includes(specialization)) return Alert.alert("Specialization required", "Choose your specialization.");
    if (!Number.isFinite(experience) || experience < 0 || experience > 70) return Alert.alert("Check experience", "Enter experience between 0 and 70 years.");
    if (registrationNumber.trim().length < 3) return Alert.alert("Registration required", "Add your medical registration number.");
    if (registrationBody.trim().length < 2) return Alert.alert("Registration body required", "Add the body you're registered with, e.g. GMC.");
    if (hospitalAddress.trim().length < 2) return Alert.alert("City required", "Add the city you practise in.");
    if (!splitList(languages).length) return Alert.alert("Languages required", "Add at least one language.");

    const next = {
      fullName: name.trim(),
      title: title.trim(),
      qualifications: splitList(qualifications),
      specialization,
      experienceYears: experience,
      registrationNumber: registrationNumber.trim(),
      registrationBody: registrationBody.trim(),
      clinic: hospitalName.trim(),
      city: hospitalAddress.trim(),
      languages: splitList(languages),
      about: about.trim(),
    };
    const changes: MyDoctorChanges = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      const value = next[key];
      const before = original[key];
      const changed = Array.isArray(value) ? !sameList(value, before as string[]) : value !== before;
      if (changed) (changes as Record<string, unknown>)[key] = value;
    }
    if (!Object.keys(changes).length) return router.back();

    setSaving(true);
    const result = await updateMyDoctorProfile(changes);
    setSaving(false);
    if (!result.ok) return Alert.alert("Couldn’t save profile", result.message);
    await refresh();
    const note = result.data.reverification
      ? "Your profile was sent back for verification."
      : result.data.inReview
        ? result.message || "Patients will see your changes once an admin approves them."
        : "Your professional details have been saved.";
    Alert.alert("Profile updated", note, [{ text: "Done", onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerButton}><ArrowLeft size={21} color={colors.text} /></Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Edit doctor profile</Text>
        <View style={s.headerButton} />
      </View>
      {loading ? (
        <FormSkeleton fields={7} />
      ) : (
        <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.photoSection}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change profile picture" onPress={chooseProfilePhoto} disabled={uploadingAvatar} style={s.photoButton}>
                <View style={[s.profilePhoto, { backgroundColor: (localAvatar || avatar) && !avatarFailed ? colors.surface : accent, borderWidth: (localAvatar || avatar) && !avatarFailed ? 1 : 0, borderColor: colors.border }]}>
                  {(localAvatar || avatar) && !avatarFailed ? <Image source={{ uri: localAvatar || avatar || undefined }} style={s.profilePhotoImage} onError={() => setAvatarFailed(true)} /> : <Text style={s.profilePhotoInitials}>{initials(name)}</Text>}
                  {uploadingAvatar && <View style={s.profilePhotoLoading}><ActivityIndicator color="#fff" /></View>}
                </View>
                <View style={[s.photoCameraBadge, { backgroundColor: accent, borderColor: colors.background }]}><Camera size={16} color="#fff" /></View>
              </Pressable>
              <Text style={[s.photoTitle, { color: colors.text }]}>Professional profile picture</Text>
              <Text style={[s.photoHint, { color: colors.textMuted }]}>Tap the camera to take or choose a photo</Text>
            </View>

            <View style={[s.intro, { backgroundColor: accentBg }]}><Stethoscope size={22} color={accent} /><View style={s.introCopy}><Text style={[s.introTitle, { color: accent }]}>Keep your professional profile current</Text><Text style={[s.introText, { color: colors.textMuted }]}>Patients use these details when choosing and booking a doctor.</Text></View></View>

            <Text style={[s.section, { color: colors.textMuted }]}>PROFESSIONAL DETAILS</Text>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Dr. Sarah Miller" colors={colors} accent={accent} />
            <Field label="Job title" value={title} onChangeText={setTitle} placeholder="Consultant Gynaecologist" colors={colors} accent={accent} />
            <Text style={[s.label, { color: colors.text }]}>Specialization</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {SPECIALIZATIONS.map((option) => {
                const on = option === specialization;
                return (
                  <Pressable key={option} onPress={() => setSpecialization(option)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: on ? accent : colors.border, backgroundColor: on ? accentBg : colors.surface }}>
                    <Text style={{ fontSize: 13, fontWeight: on ? "700" : "500", color: on ? accent : colors.text }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="Qualifications" value={qualifications} onChangeText={setQualifications} placeholder="MBBS, MD (Gynecology)" hint="Separate multiple qualifications with commas" colors={colors} accent={accent} />
            <Field label="Experience (years)" value={experienceYears} onChangeText={setExperienceYears} placeholder="8" numeric colors={colors} accent={accent} />
            <Field label="Registration number" value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="BMDC-A-12345" colors={colors} accent={accent} />
            <Field label="Registration body" value={registrationBody} onChangeText={setRegistrationBody} placeholder="GMC, BMDC" hint="Registration changes are always checked by an admin" colors={colors} accent={accent} />

            <Text style={[s.section, { color: colors.textMuted }]}>PRACTICE INFORMATION</Text>
            <Field label="Hospital or clinic" value={hospitalName} onChangeText={setHospitalName} placeholder="Hospital or clinic name" colors={colors} accent={accent} />
            <Field label="City" value={hospitalAddress} onChangeText={setHospitalAddress} placeholder="London" colors={colors} accent={accent} />
            <Field label="Languages" value={languages} onChangeText={setLanguages} placeholder="Bangla, English" hint="Separate multiple languages with commas" colors={colors} accent={accent} />
            <Field label="About you" value={about} onChangeText={setAbout} placeholder="A short introduction patients see on your profile" colors={colors} accent={accent} multiline />

            <Pressable onPress={save} disabled={saving || uploadingAvatar} style={[s.saveButton, { backgroundColor: accent, opacity: saving || uploadingAvatar ? 0.65 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Save size={18} color="#fff" /><Text style={s.saveText}>Save changes</Text></>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, hint, numeric, multiline, colors, accent }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; hint?: string; numeric?: boolean; multiline?: boolean; colors: ReturnType<typeof useTheme>["colors"]; accent: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}><Text style={[s.label, { color: colors.text }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={numeric ? "numeric" : "default"} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, multiline && s.multilineInput, { color: colors.text, backgroundColor: colors.surface, borderColor: focused ? accent : colors.border }]} />{!!hint && <Text style={[s.hint, { color: colors.textMuted }]}>{hint}</Text>}</View>;
}

const s = StyleSheet.create({
  safe: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 }, headerButton: { width: 44, height: 40, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" }, loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 44 }, photoSection: { alignItems: "center", paddingTop: 4, paddingBottom: 22 }, photoButton: { position: "relative", marginBottom: 10 }, profilePhoto: { width: 92, height: 92, borderRadius: 31, overflow: "hidden", alignItems: "center", justifyContent: "center" }, profilePhotoImage: { width: "100%", height: "100%" }, profilePhotoInitials: { color: "#fff", fontSize: 30, fontWeight: "800" }, profilePhotoLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000066", alignItems: "center", justifyContent: "center" }, photoCameraBadge: { position: "absolute", right: -6, bottom: -4, width: 34, height: 34, borderRadius: 12, borderWidth: 3, alignItems: "center", justifyContent: "center" }, photoTitle: { fontSize: 14, fontWeight: "800" }, photoHint: { fontSize: 11, marginTop: 3 },
  intro: { flexDirection: "row", alignItems: "flex-start", borderRadius: 18, padding: 16 }, introCopy: { flex: 1, marginLeft: 11 }, introTitle: { fontSize: 14, fontWeight: "800", marginBottom: 3 }, introText: { fontSize: 12, lineHeight: 18 },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 25, marginBottom: 13 }, field: { marginBottom: 15 }, label: { fontSize: 13, fontWeight: "700", marginBottom: 7 }, input: { minHeight: 50, borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 }, multilineInput: { minHeight: 90 }, hint: { fontSize: 11, lineHeight: 16, marginTop: 5 }, saveButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 16, marginTop: 28 }, saveText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
