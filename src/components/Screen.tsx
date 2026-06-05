import { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  keyboardShouldPersistTaps = "handled",
}: ScreenProps) {
  const theme = useTheme();

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.colors.background },
    padded && { paddingHorizontal: theme.spacing.lg },
    style,
  ];

  if (scroll) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={containerStyle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, containerStyle]}>
      <View style={styles.flex}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingVertical: 16,
  },
});
