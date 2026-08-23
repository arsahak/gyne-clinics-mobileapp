import { useTheme } from "@/theme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InsightCard = {
  icon: string;
  title: string;
  description: string;
};

// D1, D2, D3, D4 — content for each lands once the open questions (baby growth
// single/multi-child, chart library) are settled; this establishes the screen,
// its nav entry, and the D5 disclaimer that must persist across all of them.
const CARDS: InsightCard[] = [
  { icon: "👶", title: "Baby Growth", description: "Track your baby's growth metrics over time." },
  { icon: "🌸", title: "Ovulation & Fertility Window", description: "Your fertile window, estimated from your cycle data." },
  { icon: "📊", title: "Cycle Analytics", description: "Average cycle length and variation trends." },
  { icon: "⚖️", title: "Weight Tracking", description: "Log and chart your weight over time." },
];

export default function InsightsScreen() {
  const { colors } = useTheme();
  const accentBg = colors.primaryLight;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.topBar}>
        <Text style={[s.screenTitle, { color: colors.text }]}>Insights</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.padH}>
          {/* D5: standing disclaimer, must stay visible on every Insights screen */}
          <View style={[s.disclaimer, { backgroundColor: accentBg, borderColor: "#f7abd9" }]}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>ℹ️</Text>
            <Text style={[s.disclaimerText, { color: "#834d8b" }]}>
              These insights are based on the data you enter and are informational only.{" "}
              <Text style={{ fontWeight: "700" }}>They are not a medical diagnosis — always consult a healthcare professional.</Text>
            </Text>
          </View>

          {CARDS.map((card) => (
            <View key={card.title} style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={[s.cardIcon, { backgroundColor: accentBg }]}>
                <Text style={{ fontSize: 22 }}>{card.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{card.title}</Text>
                <Text style={[s.cardDescription, { color: colors.textMuted }]}>{card.description}</Text>
              </View>
              <View style={[s.comingSoonBadge, { backgroundColor: colors.border }]}>
                <Text style={[s.comingSoonText, { color: colors.textMuted }]}>Coming soon</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  padH: { paddingHorizontal: 20 },

  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: "800" },

  disclaimer: { flexDirection: "row", borderRadius: 12, padding: 14, borderWidth: 1, alignItems: "flex-start", marginBottom: 20 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 12, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  cardDescription: { fontSize: 12, lineHeight: 17 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  comingSoonText: { fontSize: 10, fontWeight: "700" },
});
