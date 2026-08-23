import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen, Text } from "@/components";
import { useTheme } from "@/theme";

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="h1" align="center">
          404
        </Text>
        <Text variant="body" color="textMuted" align="center" style={styles.subtitle}>
          This screen doesn’t exist.
        </Text>
        <Link href="/(tabs)/index" style={[styles.link, { color: theme.colors.primary }]}>
          Go back home
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  subtitle: { marginBottom: 16 },
  link: { fontSize: 16, fontWeight: "600" },
});
