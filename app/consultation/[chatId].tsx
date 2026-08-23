import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type ChatMessage = {
  _id: string;
  senderRole: "patient" | "doctor";
  text: string;
  wasRedacted: boolean;
  createdAt: string;
};

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function FlagIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 22V4M4 4h13l-2.5 4L17 12H4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ConsultationScreen() {
  const { colors } = useTheme();
  const { token, role } = useAuth();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const accent = role === "doctor" ? DOCTOR_ACCENT : colors.primary;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadMessages = useCallback(async () => {
    const result = await api<{ success: boolean; data: ChatMessage[] }>(`/api/chats/${chatId}/messages`, {
      token: token ?? undefined,
    });
    if (result.ok) setMessages(result.data.data);
  }, [chatId, token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadMessages();
      const interval = setInterval(() => { if (active) loadMessages(); }, 5000);
      return () => { active = false; clearInterval(interval); };
    }, [loadMessages])
  );

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const result = await api<{ success: boolean; message: string; data: ChatMessage }>("/api/chats/messages", {
      method: "POST",
      token: token ?? undefined,
      body: { chatId, text },
    });
    setSending(false);

    if (!result.ok) { Alert.alert("Couldn't send message", result.message); return; }

    setInput("");
    setMessages((prev) => [...prev, result.data.data]);
    if (result.data.data.wasRedacted) {
      Alert.alert("Message sent", "Some personal contact info was removed for your safety.");
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || submittingReport) return;
    setSubmittingReport(true);
    const result = await api("/api/chats/report", {
      method: "POST",
      token: token ?? undefined,
      body: { chatId, reason: reportReason.trim() },
    });
    setSubmittingReport(false);

    if (!result.ok) { Alert.alert("Couldn't submit report", result.message); return; }

    setReportOpen(false);
    setReportReason("");
    Alert.alert("Report submitted", "Our team will review this conversation.");
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <BackIcon color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Consultation</Text>
        <Pressable onPress={() => setReportOpen(true)} style={s.headerBtn}>
          <FlagIcon color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {!messages.length && (
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
              Say hello — your conversation starts here.
            </Text>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderRole === role;
            return (
              <View key={msg._id} style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}>
                <View style={s.bubbleCol}>
                  <View style={[s.bubble, isMine ? { backgroundColor: accent, borderBottomRightRadius: 4 } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 }]}>
                    <Text style={{ color: isMine ? "#fff" : colors.text, fontSize: 14, lineHeight: 21 }}>{msg.text}</Text>
                  </View>
                  {msg.wasRedacted && (
                    <Text style={[s.redactedNote, { color: colors.textMuted }]}>🔒 Contact info removed</Text>
                  )}
                  <Text style={[s.timeText, { color: colors.textMuted, textAlign: isMine ? "right" : "left" }]}>
                    {formatTime(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[s.inputBar, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
          <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.textMuted}
              style={[s.input, { color: colors.text }]}
              multiline
            />
          </View>
          <Pressable onPress={send} disabled={sending} style={[s.sendBtn, { backgroundColor: input.trim() ? accent : colors.border }]}>
            <SendIcon color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={reportOpen} animationType="slide" transparent onRequestClose={() => setReportOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setReportOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Report this Conversation</Text>
          <TextInput
            value={reportReason}
            onChangeText={setReportReason}
            placeholder="Briefly describe the issue…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 100, textAlignVertical: "top" }]}
          />
          <Pressable
            onPress={submitReport}
            disabled={!reportReason.trim() || submittingReport}
            style={[m.saveBtn, { backgroundColor: "#ef4444", opacity: !reportReason.trim() || submittingReport ? 0.6 : 1 }]}
          >
            <Text style={m.saveBtnText}>{submittingReport ? "Submitting…" : "Submit Report"}</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800" },

  messageList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: "row" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  bubbleCol: { maxWidth: "78%", gap: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  redactedNote: { fontSize: 10, fontStyle: "italic", paddingHorizontal: 4 },
  timeText: { fontSize: 10, paddingHorizontal: 4 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 10 : 6, maxHeight: 100 },
  input: { fontSize: 14, lineHeight: 20 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
