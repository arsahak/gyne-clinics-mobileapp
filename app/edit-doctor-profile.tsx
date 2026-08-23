import { DOCTOR_ACCENT } from "@/constants/theme";
import { api, uploadImage } from "@/lib/api";
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

type DoctorProfile = {
  qualifications?: string[];
  specialization?: string;
  experienceYears?: number;
  registrationNumber?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  languages?: string[];
  account?: { name?: string; avatar?: string };
};

function initials(name?: string) {
  if (!name?.trim()) return "DR";
  return name.trim().split(/\s+/).filter((part) => part.toLowerCase() !== "dr.").slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DR";
}

export default function EditDoctorProfileScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const accent = DOCTOR_ACCENT;
  const accentBg = `${DOCTOR_ACCENT}18`;
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

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await api<{ success: boolean; data: DoctorProfile }>("/api/doctors/me", { token: token ?? undefined });
      if (!active) return;
      if (!result.ok) {
        setLoading(false);
        Alert.alert("Couldn’t load profile", result.message, [{ text: "Go back", onPress: () => router.back() }]);
        return;
      }
      const profile = result.data.data;
      setName(profile.account?.name ?? "");
      setAvatar(profile.account?.avatar ?? null);
      setQualifications(profile.qualifications?.join(", ") ?? "");
      setSpecialization(profile.specialization ?? "");
      setExperienceYears(profile.experienceYears?.toString() ?? "");
      setRegistrationNumber(profile.registrationNumber ?? "");
      setHospitalName(profile.hospitalName ?? "");
      setHospitalAddress(profile.hospitalAddress ?? "");
      setLanguages(profile.languages?.join(", ") ?? "");
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
    const saved = await api<{ success: boolean; data: DoctorProfile }>("/api/doctors/me", {
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

  const save = async () => {
    const experience = Number(experienceYears);
    if (name.trim().length < 2) return Alert.alert("Check your name", "Please enter at least 2 characters.");
    if (!qualifications.trim()) return Alert.alert("Qualifications required", "Add at least one professional qualification.");
    if (!specialization.trim()) return Alert.alert("Specialization required", "Add your medical specialization.");
    if (!Number.isFinite(experience) || experience < 0 || experience > 80) return Alert.alert("Check experience", "Enter experience between 0 and 80 years.");
    if (!registrationNumber.trim()) return Alert.alert("Registration required", "Add your medical registration number.");

    setSaving(true);
    const result = await api("/api/doctors/me", {
      method: "PUT",
      token: token ?? undefined,
      body: {
        name: name.trim(),
        qualifications: qualifications.split(",").map((item) => item.trim()).filter(Boolean),
        specialization: specialization.trim(),
        experienceYears: experience,
        registrationNumber: registrationNumber.trim(),
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      },
    });
    setSaving(false);
    if (!result.ok) return Alert.alert("Couldn’t save profile", result.message);
    Alert.alert("Profile updated", "Your professional details have been saved.", [{ text: "Done", onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerButton}><ArrowLeft size={21} color={colors.text} /></Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Edit doctor profile</Text>
        <View style={s.headerButton} />
      </View>
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={accent} /></View>
      ) : (
        <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.photoSection}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change profile picture" onPress={chooseProfilePhoto} disabled={uploadingAvatar} style={s.photoButton}>
                <View style={[s.profilePhoto, { backgroundColor: accent }]}>
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
            <Field label="Qualifications" value={qualifications} onChangeText={setQualifications} placeholder="MBBS, MD (Gynecology)" hint="Separate multiple qualifications with commas" colors={colors} accent={accent} />
            <Field label="Specialization" value={specialization} onChangeText={setSpecialization} placeholder="Gynecology & Obstetrics" colors={colors} accent={accent} />
            <Field label="Experience (years)" value={experienceYears} onChangeText={setExperienceYears} placeholder="8" numeric colors={colors} accent={accent} />
            <Field label="Registration number" value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="BMDC-A-12345" colors={colors} accent={accent} />

            <Text style={[s.section, { color: colors.textMuted }]}>PRACTICE INFORMATION</Text>
            <Field label="Hospital or clinic" value={hospitalName} onChangeText={setHospitalName} placeholder="Hospital or clinic name" colors={colors} accent={accent} />
            <Field label="Practice address" value={hospitalAddress} onChangeText={setHospitalAddress} placeholder="Full practice address" colors={colors} accent={accent} multiline />
            <Field label="Languages" value={languages} onChangeText={setLanguages} placeholder="Bangla, English" hint="Separate multiple languages with commas" colors={colors} accent={accent} />

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
