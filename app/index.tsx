import { Redirect } from "expo-router";
import { routeForAccount, useAuth } from "@/store/AuthContext";

// Sends the user to the right place: sign in, onboarding, consent, waiting
// for approval (doctors), or the app. Decided by the backend's `nextStep`.
export default function Index() {
  const { isLoading, account } = useAuth();
  // Still reading the saved session — _layout shows a spinner.
  if (isLoading) return null;
  return <Redirect href={routeForAccount(account)} />;
}
