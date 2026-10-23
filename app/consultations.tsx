import { Chip, DoctorAvatar } from "@/components/doctors";
import { consultationDoctor, type ConsultationDoctor, type ConsultationTimeline, STATE_LABEL, timeline } from "@/lib/consultation";
import { formatMoney, type RegionId, REGIONS } from "@/lib/locale/regions";
import { getDoctors } from "@/lib/services/doctors";
import type { Consultation, Doctor } from "@/lib/types";
import { useMyConsultations } from "@/lib/useMyConsultations";
import { useTheme } from "@/theme";
import { differenceInCalendarDays, format, formatDistanceStrict } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, CalendarCheck, CalendarClock, Clock, MessageCircle, ReceiptText, Zap } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListSkeleton } from "@/components/ui/Skeleton";

// My consultations. Same as the webapp's /patient/consultations: upcoming,
// ongoing and past bookings, each with its chat and receipt.

type Tab = "upcoming" | "ongoing" | "past";

interface Row {
  c: Consultation;
  t: ConsultationTimeline;
  doctor: ConsultationDoctor;
}

const EMPTY: Record<Tab, { title: string; description: string }> = {
  upcoming: { title: "No upcoming consultations", description: "Book a time with a specialist and it will show here." },
  ongoing: { title: "No open chats", description: "Consultations you're chatting in, or in free follow-up, show here." },
  past: { title: "No past consultations", description: "Finished consultations and their receipts show here." },
};

const METHOD_LABEL: Record<string, string> = { card: "Card", local: "Other method", wallet: "Apple / Google Pay", free: "Free" };

/** "Today at 19:30", "Tomorrow at 09:00" or "Thu 24 Oct at 14:00". */
function startLabel(startsAt: Date, now: Date) {
  const days = differenceInCalendarDays(startsAt, now);
  const time = format(startsAt, "HH:mm");
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Tomorrow at ${time}`;
  return format(startsAt, "EEE d MMM 'at' HH:mm");
}

export default function ConsultationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = colors.primary;
  const { consultations, loaded, reload } = useMyConsultations();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The directory says which doctors are still listed (profile and chat open).
  useFocusEffect(
    useCallback(() => {
      void getDoctors().then((r) => r.ok && setDoctors(r.data));
    }, []),
  );

  const now = new Date();
  const rows = useMemo<Row[]>(
    () => consultations.map((c) => ({ c, t: timeline(c, new Date()), doctor: consultationDoctor(c, doctors) })),
    [consultations, doctors],
  );
  const groups: Record<Tab, Row[]> = {
    upcoming: rows.filter((r) => r.t.state === "upcoming").sort((a, b) => a.c.startsAt.localeCompare(b.c.startsAt)),
    ongoing: rows.filter((r) => r.t.state === "active" || r.t.state === "follow_up").sort((a, b) => b.c.startsAt.localeCompare(a.c.startsAt)),
    past: rows.filter((r) => r.t.state === "closed" || r.t.state === "refunded").sort((a, b) => b.c.startsAt.localeCompare(a.c.startsAt)),
  };
  // Open on upcoming, unless there's nothing there and something is ongoing.
  const tab = chosenTab ?? (groups.upcoming.length || !groups.ongoing.length ? "upcoming" : "ongoing");
  const visible = groups[tab];
  const receipt = rows.find((r) => r.c.id === receiptId);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.headerBtn} accessibilityLabel="Back">
          <ArrowLeft size={21} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.eyebrow, { color: accent }]}>Get help</Text>
          <Text style={[s.headerTitle, { color: colors.text }]}>My consultations</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/help")} style={[s.bookBtn, { backgroundColor: accent }]}>
          <Text style={s.bookText}>Book</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        <Text style={[s.description, { color: colors.textMuted }]}>Your bookings, chat windows and receipts.</Text>

        <View style={[s.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["upcoming", "ongoing", "past"] as const).map((value) => {
            const on = tab === value;
            return (
              <Pressable key={value} onPress={() => setTab(value)} style={[s.tab, on && { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={{ color: on ? colors.text : colors.textMuted, fontWeight: on ? "800" : "600", fontSize: 13 }}>
                  {value === "upcoming" ? "Upcoming" : value === "ongoing" ? "Ongoing" : "Past"} ({groups[value].length})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!loaded ? (
          <ListSkeleton rows={4} padded={false} />
        ) : visible.length === 0 ? (
          <View style={[s.empty, { borderColor: colors.border }]}>
            <CalendarCheck size={28} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: "800", marginTop: 10 }}>{EMPTY[tab].title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>{EMPTY[tab].description}</Text>
            <Pressable onPress={() => router.push("/(tabs)/help")} style={[s.emptyBtn, { backgroundColor: accent }]}>
              <Text style={s.bookText}>Find a specialist</Text>
            </Pressable>
          </View>
        ) : (
          visible.map((row) => <ConsultationCard key={row.c.id} row={row} now={now} onReceipt={() => setReceiptId(row.c.id)} />)
        )}
      </ScrollView>

      {/* Receipt */}
      <Modal visible={!!receipt} animationType="slide" transparent onRequestClose={() => setReceiptId(null)}>
        <Pressable style={m.backdrop} onPress={() => setReceiptId(null)} />
        {receipt && <Receipt row={receipt} onClose={() => setReceiptId(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function ConsultationCard({ row, now, onReceipt }: { row: Row; now: Date; onReceipt: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = colors.primary;
  const { c, t, doctor } = row;
  const status = STATE_LABEL[t.state];
  const ModeIcon = c.mode === "instant" ? Zap : CalendarClock;
  const ended = t.state === "closed" || t.state === "refunded";
  const tone = t.state === "active" ? "#15803d" : t.state === "follow_up" ? "#b08d48" : t.state === "refunded" ? "#b91c1c" : t.state === "closed" ? colors.textMuted : accent;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.row, { alignItems: "flex-start", gap: 12 }]}>
        <DoctorAvatar doctor={{ name: doctor.name, avatar: doctor.avatar, hue: doctor.hue }} size={44} />
        <View style={{ flex: 1 }}>
          <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
            <Pressable disabled={!doctor.listed} onPress={() => router.push(`/doctor/${doctor.id}`)} style={{ flex: 1 }}>
              <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                {doctor.name}
              </Text>
            </Pressable>
            <Chip label={status.label} tone={tone} bg={`${tone}1A`} />
          </View>
          <View style={[s.row, { marginTop: 3 }]}>
            <ModeIcon size={13} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 12.5 }} numberOfLines={1}>
              {c.mode === "instant" ? "Instant chat" : "Scheduled"}
              {doctor.title ? ` · ${doctor.title}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {t.state === "upcoming" ? (
        <View style={[s.row, s.when, { backgroundColor: colors.primaryLight }]}>
          <View style={[s.dateBox, { backgroundColor: colors.surface }]}>
            <Text style={{ color: accent, fontSize: 10, fontWeight: "800" }}>{format(t.startsAt, "MMM").toUpperCase()}</Text>
            <Text style={{ color: accent, fontSize: 18, fontWeight: "900" }}>{format(t.startsAt, "d")}</Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontWeight: "800" }}>{startLabel(t.startsAt, now)}</Text>
            <View style={s.row}>
              <Clock size={13} color={accent} />
              <Text style={{ color: accent, fontSize: 13 }}>Starts in {formatDistanceStrict(t.startsAt, now)}</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 14 }}>{format(t.startsAt, "EEE d MMM yyyy, HH:mm")}</Text>
      )}

      <Text style={[s.concern, { color: colors.textMuted, backgroundColor: colors.background }]} numberOfLines={2}>
        “{c.concern}”
      </Text>

      <View style={[s.row, { marginTop: 12, alignItems: "flex-start" }]}>
        <Fact label="Booking" value={c.id} mono />
        <Fact label="Paid" value={c.payment.amount ? formatMoney(c.payment.amount, c.payment.currency) : "Free"} />
        <Fact
          label={t.state === "follow_up" ? "Follow-up until" : t.state === "active" ? "Open until" : "Chat"}
          value={
            t.state === "follow_up"
              ? format(t.followUpEndsAt, "d MMM")
              : t.state === "active"
                ? format(t.sessionEndsAt, "d MMM, HH:mm")
                : t.state === "upcoming"
                  ? "Opens at start"
                  : "Closed"
          }
        />
      </View>

      <View style={[s.actions, { borderTopColor: colors.border }]}>
        {doctor.listed ? (
          <Pressable
            onPress={() => router.push(`/consultation/${c.doctorId}`)}
            style={[s.action, ended || t.state === "upcoming" ? { borderColor: colors.border, borderWidth: 1.5 } : { backgroundColor: accent }]}
          >
            <MessageCircle size={15} color={ended || t.state === "upcoming" ? colors.text : "#fff"} />
            <Text style={{ color: ended || t.state === "upcoming" ? colors.text : "#fff", fontWeight: "800", fontSize: 13 }}>
              {ended ? "View chat" : t.state === "upcoming" ? "Chat details" : "Open chat"}
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 12, alignSelf: "center" }}>This doctor is no longer listed.</Text>
        )}
        <Pressable onPress={onReceipt} style={s.action}>
          <ReceiptText size={15} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Receipt</Text>
        </Pressable>
        {ended && doctor.listed && (
          <Pressable onPress={() => router.push(`/doctor/${c.doctorId}/book`)} style={[s.action, { borderColor: colors.border, borderWidth: 1.5 }]}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Book again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "700", fontFamily: mono ? "Menlo" : undefined, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Receipt({ row, onClose }: { row: Row; onClose: () => void }) {
  const { colors } = useTheme();
  const { c, doctor } = row;
  const { payment } = c;
  const free = payment.method === "free";
  const rows: [string, string][] = [
    ["Booking ID", c.id],
    ["Specialist", doctor.name],
    ["Consultation", `${c.mode === "instant" ? "Instant chat" : "Scheduled chat"} · ${format(new Date(c.startsAt), "d MMM yyyy, HH:mm")}`],
    ["Booked on", format(new Date(c.bookedAt), "d MMM yyyy, HH:mm")],
    ["Pricing region", REGIONS[payment.regionId as RegionId]?.name ?? payment.regionId],
    ["Payment method", free ? "Free consultation" : `${METHOD_LABEL[payment.method] ?? "Card"}${payment.details ? ` · ${payment.details}` : ""}`],
  ];
  if (!free) rows.push(["Payment reference", payment.reference]);
  if (payment.paidAt) rows.push(["Paid on", format(new Date(payment.paidAt), "d MMM yyyy, HH:mm")]);

  return (
    <View style={[m.sheet, { backgroundColor: colors.surface }]}>
      <View style={[m.handle, { backgroundColor: colors.border }]} />
      <Text style={[m.title, { color: colors.text }]}>Receipt</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12.5, textAlign: "center", marginTop: 4, marginBottom: 16 }}>Gynex consultation receipt</Text>
      <View style={[s.row, s.total, { backgroundColor: colors.background }]}>
        <View style={s.row}>
          <ReceiptText size={16} color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total</Text>
        </View>
        <View style={s.row}>
          <Chip label={c.refundedAt ? "Refunded" : free ? "Free" : "Paid"} tone={c.refundedAt ? "#b91c1c" : "#15803d"} bg={c.refundedAt ? "#fee2e2" : "#dcfce7"} />
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{payment.amount ? formatMoney(payment.amount, payment.currency) : "Free"}</Text>
        </View>
      </View>
      <View style={[s.receiptRows, { borderColor: colors.border }]}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[s.receiptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
            <Text style={{ color: colors.text, fontSize: 13, flexShrink: 1, textAlign: "right" }}>{value}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onClose} style={[m.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
        <Text style={m.saveBtnText}>Close</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 12, fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  bookBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginRight: 6 },
  bookText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  scroll: { padding: 18, paddingBottom: 48 },
  description: { fontSize: 13, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },

  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 4, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: "transparent" },

  empty: { alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderRadius: 20, paddingVertical: 34, paddingHorizontal: 20 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },

  card: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 14 },
  name: { fontSize: 15, fontWeight: "800" },
  when: { borderRadius: 16, padding: 12, marginTop: 14, gap: 12 },
  dateBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  concern: { borderRadius: 14, padding: 11, fontSize: 13, lineHeight: 18, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },

  total: { justifyContent: "space-between", borderRadius: 16, padding: 14 },
  receiptRows: { borderWidth: 1, borderRadius: 16, marginTop: 12 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
