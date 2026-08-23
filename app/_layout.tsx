import * as NativeSplash from "expo-splash-screen";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { AuthProvider, useAuth } from "@/store/AuthContext";
import { ThemeProvider, useTheme } from "@/theme";

NativeSplash.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootStack />
            {!splashDone && (
              <AppSplashScreen onFinish={() => setSplashDone(true)} />
            )}
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const theme                              = useTheme();
  const { isLoggedIn, isProfileDone, isLoading } = useAuth();

  const barStyle = theme.isDark ? "light" : "dark";
  const barBg    = theme.isDark ? "#121212" : "#ffffff";

  // Wait for AsyncStorage to load before routing
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center",
                     backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={barStyle} backgroundColor={barBg} translucent={false} />
      <Stack
        screenOptions={{
          headerStyle:       { backgroundColor: theme.colors.background },
          headerTitleStyle:  { color: theme.colors.text },
          headerTintColor:   theme.colors.text,
          contentStyle:      { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          animation:         "slide_from_right",
        }}
      >
        <Stack.Screen name="index"           options={{ headerShown: false }} />
        <Stack.Screen name="login"           options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp"      options={{ headerShown: false }} />
        <Stack.Screen name="health-profile"  options={{ headerShown: false }} />
        <Stack.Screen name="edit-patient-profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-doctor-profile" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-profile"  options={{ headerShown: false }} />
        <Stack.Screen name="doctor-pending"  options={{ headerShown: false }} />
        <Stack.Screen name="content/[id]"    options={{ headerShown: false }} />
        <Stack.Screen name="doctor/[id]"     options={{ headerShown: false }} />
        <Stack.Screen name="consultation/[chatId]" options={{ headerShown: false }} />
        <Stack.Screen name="consultations"   options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="(doctor-tabs)"   options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"      options={{ title: "Not found" }} />
      </Stack>
    </>
  );
}
