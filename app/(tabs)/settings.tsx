import { Screen, Text } from "@/components";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

export default function SettingsScreen() {
  const { colors, setMode, mode } = useTheme();
  const { logout }                = useAuth();
  const router                    = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen scroll>
      <Text variant="h2" style={{ marginBottom: 4 }}>Settings</Text>
      <Text variant="body" color="textMuted" style={{ marginBottom: 20 }}>
        Manage your preferences
      </Text>

      {/* Appearance */}
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <Text variant="h3" style={{ marginBottom: 14 }}>🎨 Appearance</Text>
        <View style={s.row}>
          {(["light", "dark", "system"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                s.modeBtn,
                {
                  borderColor:     mode === m ? colors.primary : colors.border,
                  backgroundColor: mode === m ? colors.primaryLight : colors.background,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>
                {m === "light" ? "☀️" : m === "dark" ? "🌙" : "📱"}
              </Text>
              <Text style={{
                color:          mode === m ? colors.primary : colors.text,
                fontWeight:     mode === m ? "700" : "500",
                fontSize:       12,
                textTransform:  "capitalize",
                marginTop:      4,
              }}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Account */}
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <Text variant="h3" style={{ marginBottom: 14 }}>👤 Account</Text>
        {["Edit Profile", "Notification Preferences", "Privacy Settings"].map((item, i) => (
          <Pressable
            key={i}
            style={[s.listItem, {
              borderBottomColor: colors.border,
              borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
            }]}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>{item}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Sign out */}
      <Pressable
        onPress={handleLogout}
        style={[s.card, s.logoutBtn, { borderColor: "#ef444433", backgroundColor: "#fff5f5" }]}
      >
        <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 15, textAlign: "center" }}>
          Sign Out
        </Text>
      </Pressable>

      {/* About */}
      <View style={[s.card, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "55", borderWidth: 1 }]}>
        <Text style={{ fontSize: 22, marginBottom: 6 }}>👩‍⚕️</Text>
        <Text variant="h3" style={{ color: colors.primary, marginBottom: 4 }}>GyneClinics App</Text>
        <Text variant="caption" style={{ color: colors.secondary }}>
          Version 1.0.0 · gyneclinics.com
        </Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  card:      { borderRadius: 18, padding: 18, marginBottom: 14 },
  logoutBtn: { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  row:      { flexDirection: "row", gap: 10 },
  modeBtn:  { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
});
