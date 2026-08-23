import { useAuth } from "@/store/AuthContext";
import { Redirect } from "expo-router";

// Smart entry-point redirect based on auth state
export default function Index() {
  const { isLoggedIn, isProfileDone, isLoading, role, approvalStatus } = useAuth();

  // Still loading AsyncStorage — _layout shows spinner
  if (isLoading) return null;

  // Not logged in → Login
  if (!isLoggedIn) return <Redirect href="/login" />;

  if (role === "doctor") {
    if (!isProfileDone) return <Redirect href="/doctor-profile" />;
    if (approvalStatus !== "approved") return <Redirect href="/doctor-pending" />;
    return <Redirect href="/(doctor-tabs)/home" />;
  }

  // Logged in but profile not done → Health Profile
  if (!isProfileDone) return <Redirect href="/health-profile" />;

  // Fully onboarded → Main app
  return <Redirect href="/(tabs)" />;
}
