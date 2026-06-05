import { useTheme } from "@/theme";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ── Icons ─────────────────────────────────────────────────────────────────────
function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M12 16v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="8" r="0.7" fill={color} />
    </Svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg = { id: number; text: string; from: "user" | "gina"; time: string };

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Quick suggestions ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Period tracking tips",
  "HRT & Menopause",
  "PCOS symptoms",
  "Book a consultation",
];

const INITIAL: Msg[] = [
  {
    id: 1,
    from: "gina",
    time: now(),
    text: "Hello! I'm Gina, your GyneClinics AI assistant 👋\n\nI can help with general gynaecological questions. How can I help you today?",
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { colors } = useTheme();
  const pink      = colors.primary;
  const pinkLite  = colors.primaryLight;
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input, setInput]       = useState("");
  const [showSugg, setShowSugg] = useState(true);

  const send = (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt) return;

    const userMsg: Msg = { id: Date.now(), from: "user", text: txt, time: now() };
    const ginaReply: Msg = {
      id: Date.now() + 1,
      from: "gina",
      time: now(),
      text: "Thank you for your message. For personalised medical advice please book a consultation with our specialist team at GyneClinics.\n\nYou can reach us at gyneclinics.com or call +44 7554 228100. 💜",
    };
    setMessages((prev) => [...prev, userMsg, ginaReply]);
    setInput("");
    setShowSugg(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border }]}>
        {/* Avatar */}
        <View style={[s.avatarRing, { borderColor: pink + "55" }]}>
          <View style={[s.avatar, { backgroundColor: pinkLite }]}>
            <Text style={s.avatarEmoji}>👩‍⚕️</Text>
          </View>
          <View style={s.onlineDot} />
        </View>

        {/* Info */}
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: colors.text }]}>Gina</Text>
          <View style={s.headerSubRow}>
            <View style={s.onlineDotSmall} />
            <Text style={[s.headerSub, { color: colors.textMuted }]}>
              GyneClinics AI · Online
            </Text>
          </View>
        </View>

        {/* Info button */}
        <Pressable style={[s.infoBtn, { backgroundColor: colors.surface }]}>
          <InfoIcon color={colors.textMuted} />
        </Pressable>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.messageList, { paddingBottom: showSugg ? 8 : 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Date chip */}
          <View style={s.dateChip}>
            <Text style={[s.dateChipText, { color: colors.textMuted }]}>Today</Text>
          </View>

          {messages.map((msg) => {
            const isUser = msg.from === "user";
            return (
              <View key={msg.id} style={[s.msgRow, isUser ? s.msgRowRight : s.msgRowLeft]}>
                {/* Gina avatar */}
                {!isUser && (
                  <View style={[s.miniAvatar, { backgroundColor: pinkLite }]}>
                    <Text style={{ fontSize: 12 }}>👩‍⚕️</Text>
                  </View>
                )}

                <View style={s.bubbleCol}>
                  <View
                    style={[
                      s.bubble,
                      isUser
                        ? [s.userBubble, { backgroundColor: pink }]
                        : [s.ginaBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
                    ]}
                  >
                    <Text style={[s.bubbleText, { color: isUser ? "#fff" : colors.text }]}>
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={[s.timeText, { color: colors.textMuted, textAlign: isUser ? "right" : "left" }]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Quick suggestions */}
          {showSugg && (
            <View style={s.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => send(s)}
                  style={[suggStyle.pill, { borderColor: pink + "55", backgroundColor: pinkLite }]}
                >
                  <Text style={[suggStyle.pillText, { color: pink }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── Disclaimer ── */}
        <View style={[s.disclaimer, { backgroundColor: pinkLite }]}>
          <InfoIcon color={pink} />
          <Text style={[s.disclaimerText, { color: colors.textMuted }]}>
            Gina provides general info only. Always consult a qualified doctor.
          </Text>
        </View>

        {/* ── Input bar ── */}
        <View style={[s.inputBar, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
          <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Gina anything…"
              placeholderTextColor={colors.textMuted}
              style={[s.input, { color: colors.text }]}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              multiline
            />
          </View>
          <Pressable
            onPress={() => send()}
            style={[s.sendBtn, { backgroundColor: input.trim() ? pink : colors.border }]}
          >
            <SendIcon color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  avatarEmoji: { fontSize: 20 },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2, borderColor: "#fff",
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "800" },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDotSmall: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10b981" },
  headerSub: { fontSize: 12 },
  infoBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  // Messages
  messageList: { padding: 16, gap: 12 },
  dateChip: { alignSelf: "center", marginBottom: 4 },
  dateChipText: { fontSize: 12, fontWeight: "600" },

  msgRow:      { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowLeft:  { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  miniAvatar:  { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubbleCol:   { maxWidth: "75%", gap: 4 },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: { borderBottomRightRadius: 4 },
  ginaBubble: { borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  timeText:   { fontSize: 10, paddingHorizontal: 4 },

  // Suggestions
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },

  // Disclaimer
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 100,
  },
  input:   { fontSize: 14, lineHeight: 20 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

const suggStyle = StyleSheet.create({
  pill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: "600" },
});
