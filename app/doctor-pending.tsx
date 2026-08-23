import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function XIcon({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" stroke={color} strokeWidth={1.8} />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

type DoctorProfileResponse = {
  success: boolean;
  data: { approvalStatus: "pending" | "approved" | "rejected"; rejectionReason?: string };
};

export default function DoctorPendingScreen() {
  const { colors } = useTheme();
  const { token, approvalStatus, setApprovalStatus, logout } = useAuth();
  const router = useRouter();
  const accent     = DOCTOR_ACCENT;
  const accentLite = DOCTOR_ACCENT + "1A";

  const [checking, setChecking] = useState(false);

  const rejected = approvalStatus === "rejected";

  const checkStatus = async () => {
    setChecking(true);
    const result = await api<DoctorProfileResponse>("/api/doctors/me", {
      method: "GET",
      token: token ?? undefined,
    });
    setChecking(false);

    if (!result.ok) {
      Alert.alert("Couldn't check status", result.message);
      return;
    }

    const status = result.data.data.approvalStatus;
    await setApprovalStatus(status);

    if (status === "approved") {
      router.replace("/(doctor-tabs)/home");
    } else if (status === "pending") {
      Alert.alert("Still under review", "Your profile hasn't been verified yet. Please check back later.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <View style={[s.iconRing, { borderColor: (rejected ? "#ef4444" : accent) + "30", backgroundColor: rejected ? "#ef444418" : accentLite }]}>
          {rejected ? <XIcon color="#ef4444" /> : <ClockIcon color={accent} />}
        </View>

        <Text style={[s.title, { color: colors.text }]}>
          {rejected ? "Verification Not Approved" : "Profile Under Review"}
        </Text>
        <Text style={[s.sub, { color: colors.textMuted }]}>
          {rejected
            ? "An administrator was unable to verify your credentials. Please contact support for more details."
            : "Thanks for submitting your professional details. An administrator is verifying your credentials — this usually doesn't take long."}
        </Text>

        <Pressable
          onPress={checkStatus}
          disabled={checking}
          style={[s.ctaBtn, { backgroundColor: accent, opacity: checking ? 0.6 : 1 }]}
        >
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Check Status</Text>}
        </Pressable>

        <Pressable onPress={handleLogout} style={s.logoutBtn}>
          <Text style={[s.logoutText, { color: colors.textMuted }]}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  iconRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 12, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:    { fontSize: 22, fontWeight: "900", letterSpacing: -0.3, marginBottom: 10, textAlign: "center" },
  sub:      { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 32 },

  ctaBtn:  { width: "100%", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  logoutBtn:  { paddingVertical: 8 },
  logoutText: { fontSize: 14, fontWeight: "600" },
});
