import { Tabs } from "expo-router";
import { BottomNavBar } from "@/components/BottomNavBar";

export default function DoctorTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home"         />
      <Tabs.Screen name="chat"         />
      <Tabs.Screen name="patients"     />
      <Tabs.Screen name="availability" />
      <Tabs.Screen name="settings"     />
    </Tabs>
  );
}
