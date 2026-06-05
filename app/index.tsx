import { useAuth } from "@/store/AuthContext";
import { Redirect } from "expo-router";

// Smart entry-point redirect based on auth state
export default function Index() {
  const { isLoggedIn, isProfileDone, isLoading } = useAuth();

  // Still loading AsyncStorage — _layout shows spinner
  if (isLoading) return null;

  // Not logged in → Login
  if (!isLoggedIn) return <Redirect href="/login" />;

  // Logged in but profile not done → Health Profile
  if (!isProfileDone) return <Redirect href="/health-profile" />;

  // Fully onboarded → Main app
  return <Redirect href="/(tabs)" />;
}
