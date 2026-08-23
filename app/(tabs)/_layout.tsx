import { Tabs } from "expo-router";
import { BottomNavBar } from "@/components/BottomNavBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    />
      <Tabs.Screen name="learn"    />
      <Tabs.Screen name="help"     />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
