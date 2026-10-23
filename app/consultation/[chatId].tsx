import { describeBlocked, scanForContactDetails } from "@/lib/chat-guard";
import { messagingFor, STATE_LABEL, timeline } from "@/lib/consultation";
import { getDoctorChat, getPatientChat, sendMessage } from "@/lib/services/chats";
import { getMyConsultations } from "@/lib/services/consultations";
import { getDoctor, reportDoctor } from "@/lib/services/doctors";
import type { Consultation, Doctor, Message } from "@/lib/types";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { format, isToday } from "date-fns";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, CalendarClock, MessageCircle } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { ChatSkeleton } from "@/components/ui/Skeleton";

// One conversation. Patients open it with the doctor's id, doctors with the
// chat id (same as the webapp's Messages). Booking opens the Book screen.

const POLL_MS = 5_000;

// Same reasons as the webapp's "Report a problem".
const REPORT_REASONS = [
  { value: "medical_concern", label: "Unsafe or wrong medical advice" },
  { value: "off_platform", label: "Asked me to talk or pay outside Gynex" },
  { value: "no_reply", label: "Didn't reply to me" },
  { value: "behaviour", label: "Rude or inappropriate" },
  { value: "payment", label: "Problem with a payment" },
  { value: "fake_profile", label: "Their details look wrong or fake" },
  { value: "other", label: "Something else" },
];

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

function formatDay(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

/** The most relevant consultation: one still open or coming up, else the latest. */
function currentConsultation(list: Consultation[], now: Date) {
  const latestFirst = [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const withState = latestFirst.map((c) => ({ c, t: timeline(c, now) }));
  return withState.find(({ t }) => t.state === "active" || t.state === "upcoming" || t.state === "follow_up") ?? withState[0] ?? null;
}

export default function ConsultationScreen() {
  const { colors } = useTheme();
  const { role } = useAuth();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const isPatient = role !== "doctor";
  const accent = colors.primary;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [canSend, setCanSend] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [otherName, setOtherName] = useState<string | undefined>();
  const [doctor, setDoctor] = useState<Doctor | undefined>();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // ── Loading ───────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    if (isPatient) {
      const chat = await getPatientChat(chatId);
      setMessages(chat.messages);
      setCanSend(chat.canSend);
      setBlockedReason(chat.reason);
    } else {
      const chat = await getDoctorChat(chatId);
      if (chat) {
        setMessages(chat.messages);
        setOtherName(chat.patient.name);
        setPatientId(chat.patient.id);
      }
    }
  }, [chatId, isPatient]);

  const loadAll = useCallback(async () => {
    const [found, mine] = await Promise.all([isPatient ? getDoctor(chatId) : Promise.resolve(undefined), getMyConsultations()]);
    if (isPatient) {
      setDoctor(found);
      if (found) setOtherName(found.name);
    }
    if (mine.ok) setConsultations(mine.data);
    await loadMessages();
  }, [chatId, isPatient, loadMessages]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadAll();
        if (active) setLoading(false);
      })();
      // New messages while the chat is open.
      const timer = setInterval(() => void loadMessages(), POLL_MS);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [loadAll, loadMessages]),
  );

  // ── Consultation state ────────────────────────────────────────────────────

  const now = new Date();
  const mineHere = consultations.filter((c) => (isPatient ? c.doctorId === chatId : c.patient?.id === patientId));
  const current = currentConsultation(mineHere, now);
  const takesConsultations = doctor ? messagingFor(doctor).consultation : false;
  const open = current && (current.t.state === "active" || current.t.state === "upcoming");

  // ── Actions ───────────────────────────────────────────────────────────────

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const blocked = scanForContactDetails(text);
    if (blocked.length) {
      Alert.alert("Contact details aren't allowed", `Please remove ${describeBlocked(blocked)}. Keep the conversation inside Gynex.`);
      return;
    }
    setSending(true);
    const result = await sendMessage(isPatient ? { doctorId: chatId, text } : { chatId, text });
    setSending(false);
    if (!result.ok) {
      Alert.alert("Couldn't send", result.message);
      return;
    }
    setInput("");
    setMessages((prev) => [...prev, result.data]);
  };

  const submitReport = async () => {
    if (!reportReason || submittingReport) return;
    setSubmittingReport(true);
    const result = await reportDoctor({ doctorId: chatId, reason: reportReason, details: reportDetails });
    setSubmittingReport(false);
    if (!result.ok) {
      Alert.alert("Couldn't send report", result.message);
      return;
    }
    setReportOpen(false);
    setReportReason("");
    setReportDetails("");
    Alert.alert("Report sent", result.message || "Our team will look into it.");
  };

  // Booking happens on the Book screen (time, concern, payment), as on the webapp.
  const openBookSheet = () => {
    if (!doctor) return;
    if (!takesConsultations) {
      Alert.alert("Messages only", `${doctor.name} only takes free messages at the moment.`);
      return;
    }
    router.push(`/doctor/${doctor.id}/book`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const state = current ? STATE_LABEL[current.t.state] : null;
  const subtitle = current && state ? `Consultation · ${state.label}` : "Private consultation";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <BackIcon color={colors.text} />
        </Pressable>

        <View style={[s.avatar, { backgroundColor: `${accent}20` }]}>
          <Text style={{ color: accent, fontWeight: "800", fontSize: 13 }}>{initials(otherName)}</Text>
        </View>
        <View style={s.headerCopy}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {otherName || "Consultation"}
          </Text>
          <View style={s.headerStatusRow}>
            <View style={[s.statusDot, { backgroundColor: open ? colors.success : colors.border }]} />
            <Text style={[s.headerSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          </View>
        </View>

        {isPatient && takesConsultations && (
          <Pressable
            onPress={openBookSheet}
            accessibilityLabel="Book a consultation"
            style={[s.headerBookBtn, { backgroundColor: `${accent}16`, borderColor: `${accent}30` }]}
          >
            <Calendar size={18} color={accent} />
            <Text style={[s.headerBookText, { color: accent }]}>Book</Text>
          </Pressable>
        )}
        {isPatient && (
          <Pressable onPress={() => setReportOpen(true)} style={s.headerBtn} accessibilityLabel="Report a problem">
            <FlagIcon color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {current && (current.t.state === "upcoming" || current.t.state === "active" || current.t.state === "follow_up") && (
        <View style={[s.apptBanner, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
          <View style={[s.apptBannerIcon, { backgroundColor: `${accent}22` }]}>
            <CalendarClock size={15} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.apptBannerTitle, { color: colors.text }]}>
              {current.t.state === "upcoming"
                ? `Consultation · ${format(current.t.startsAt, "EEE d MMM, HH:mm")}`
                : current.t.state === "active"
                  ? "Consultation in progress"
                  : "Free follow-up"}
            </Text>
            <Text style={[s.apptBannerSubtitle, { color: colors.textMuted }]}>
              {current.t.state === "upcoming"
                ? "The chat opens at this time."
                : current.t.state === "active"
                  ? `Chat open until ${format(current.t.sessionEndsAt, "d MMM, HH:mm")}`
                  : `Questions on the same concern until ${format(current.t.followUpEndsAt, "d MMM")}`}
              {` · Ref ${current.c.id}`}
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        {loading ? (
          <ChatSkeleton />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {!messages.length && (
              <View style={s.emptyState}>
                <View style={[s.emptyIcon, { backgroundColor: `${accent}14` }]}>
                  <MessageCircle size={26} color={accent} />
                </View>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, marginTop: 12 }}>Say hello</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 30 }}>
                  Your conversation with {otherName || "them"} starts here.
                </Text>
              </View>
            )}
            {messages.map((msg, index) => {
              const isMine = msg.from === (isPatient ? "patient" : "doctor");
              const prev = messages[index - 1];
              const showDay = !prev || formatDay(prev.at) !== formatDay(msg.at);
              return (
                <View key={msg.id}>
                  {showDay && (
                    <View style={s.daySeparator}>
                      <View style={[s.dayPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700" }}>{formatDay(msg.at)}</Text>
                      </View>
                    </View>
                  )}
                  <View style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}>
                    <View style={s.bubbleCol}>
                      <View
                        style={[
                          s.bubble,
                          isMine
                            ? { backgroundColor: accent, borderBottomRightRadius: 4 }
                            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
                        ]}
                      >
                        <Text style={{ color: isMine ? "#fff" : colors.text, fontSize: 14, lineHeight: 21 }}>{msg.text}</Text>
                      </View>
                      <Text style={[s.timeText, { color: colors.textMuted, textAlign: isMine ? "right" : "left" }]}>{formatTime(msg.at)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {isPatient && !canSend && !loading ? (
          <View style={[s.lockedBar, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18, flex: 1 }}>
              {blockedReason || "Messages open when your consultation starts."}
            </Text>
            {takesConsultations && !open && (
              <Pressable onPress={openBookSheet} style={[s.lockedBtn, { backgroundColor: accent }]}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Book</Text>
              </Pressable>
            )}
          </View>
        ) : (
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
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <SendIcon color="#fff" />}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Report modal */}
      <Modal visible={reportOpen} animationType="slide" transparent onRequestClose={() => setReportOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setReportOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Report a Problem</Text>
          <View style={s.chips}>
            {REPORT_REASONS.map((r) => {
              const on = reportReason === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setReportReason(r.value)}
                  style={[s.chip, { borderColor: on ? "#ef4444" : colors.border, backgroundColor: on ? "#fee2e2" : colors.background }]}
                >
                  <Text style={{ fontSize: 12, color: on ? "#b91c1c" : colors.text, fontWeight: on ? "700" : "500" }}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder="What happened? (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 100, textAlignVertical: "top" }]}
          />
          <Pressable
            onPress={submitReport}
            disabled={!reportReason || submittingReport}
            style={[m.saveBtn, { backgroundColor: "#ef4444", opacity: !reportReason || submittingReport ? 0.6 : 1 }]}
          >
            <Text style={m.saveBtnText}>{submittingReport ? "Sending…" : "Send Report"}</Text>
          </Pressable>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerBookBtn: { height: 36, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  headerBookText: { fontSize: 11.5, fontWeight: "800" },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 14.5, fontWeight: "800" },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  headerSubtitle: { fontSize: 10 },

  apptBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderRadius: 14, padding: 11 },
  apptBannerIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  apptBannerTitle: { fontSize: 12.5, fontWeight: "800" },
  apptBannerSubtitle: { fontSize: 10.5, marginTop: 2 },

  messageList: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 12 },
  daySeparator: { alignItems: "center", marginVertical: 6 },
  dayPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  msgRow: { flexDirection: "row" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  bubbleCol: { maxWidth: "82%", gap: 4 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  timeText: { fontSize: 10, paddingHorizontal: 4 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 15, paddingVertical: Platform.OS === "ios" ? 10 : 6, maxHeight: 100 },
  input: { fontSize: 14, lineHeight: 20 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  lockedBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  lockedBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },

  modeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12 },
  dayRow: { gap: 8, paddingBottom: 12 },
  dayChip: { width: 56, alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingVertical: 8 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  slotChip: { width: "22%", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 9 },
  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8 },

  toast: { position: "absolute", top: 100, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
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
