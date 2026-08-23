import { AdBanner } from "@/components";
import { DOCTOR_ACCENT } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ─── types ──────────────────────────────────────────────────────────────────

type AppointmentPatient = { _id: string; name?: string; phone?: string };
type Appointment = {
  _id: string;
  patient: AppointmentPatient;
  scheduledAt: string;
  status: "scheduled" | "completed" | "cancelled";
  reason?: string;
  reviewed: boolean;
};

type ActivityItem = {
  type: "appointment_completed" | "period_entry";
  patientName: string;
  createdAt: string;
};

type Notification = {
  type: "new_submission" | "consultation_request" | "abnormal_cycle";
  patientId: string;
  patientName: string;
  message: string;
  createdAt: string;
};

type DashboardData = {
  name: string | null;
  avatar: string | null;
  today: string;
  totalAssignedPatients: number;
  todaysAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  completedAppointments: Appointment[];
  recentActivity: ActivityItem[];
  notifications: Notification[];
  notificationCount: number;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function formatFullDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

function doctorName(name?: string | null) {
  return name?.trim().replace(/^dr\.?\s+/i, "") || "Doctor";
}

function initials(name?: string | null) {
  const normalized = doctorName(name);
  if (normalized === "Doctor") return "DR";
  return normalized.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

const NOTIF_ICON: Record<Notification["type"], string> = {
  new_submission: "📋",
  consultation_request: "📅",
  abnormal_cycle: "⚠️",
};

// ─── main screen ────────────────────────────────────────────────────────────

export default function DoctorHomeScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const accent = DOCTOR_ACCENT;
  const accentBg = DOCTOR_ACCENT + "18";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savingAppt, setSavingAppt] = useState(false);
  const [apptPhone, setApptPhone] = useState("");
  const [apptDate, setApptDate] = useState<Date | null>(null);
  const [apptTime, setApptTime] = useState<Date | null>(null);
  const [apptReason, setApptReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadData = useCallback(async () => {
    const result = await api<{ success: boolean; data: DashboardData }>("/api/doctors/dashboard", { token: token ?? undefined });
    if (result.ok) {
      setDashboard(result.data.data);
      setAvatarFailed(false);
    }
  }, [token]);

  // Refetch every time this screen gains focus (not just on manual pull-to-refresh),
  // so appointment/notification state stays current when returning to it.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadData();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAppointmentAction = (appt: Appointment, status: "completed" | "cancelled") => {
    Alert.alert(
      status === "completed" ? "Mark completed" : "Cancel appointment",
      `${appt.patient?.name || "This patient"}'s appointment?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            const result = await api(`/api/doctors/appointments/${appt._id}/status`, {
              method: "PATCH",
              token: token ?? undefined,
              body: { status },
            });
            if (!result.ok) { Alert.alert("Couldn't update appointment", result.message); return; }
            await loadData();
          },
        },
      ]
    );
  };

  const handleMarkReviewed = async (appt: Appointment) => {
    const result = await api(`/api/doctors/appointments/${appt._id}/review`, {
      method: "PATCH",
      token: token ?? undefined,
    });
    if (!result.ok) { Alert.alert("Couldn't update", result.message); return; }
    await loadData();
  };

  const openAddAppointment = () => {
    setApptPhone("");
    setApptDate(new Date());
    setApptTime(new Date());
    setApptReason("");
    setAddOpen(true);
  };

  const handleCreateAppointment = async () => {
    if (!apptPhone.trim() || !apptDate || !apptTime || savingAppt) return;
    setSavingAppt(true);

    const scheduledAt = new Date(
      apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(),
      apptTime.getHours(), apptTime.getMinutes()
    );

    const result = await api("/api/doctors/appointments", {
      method: "POST",
      token: token ?? undefined,
      body: { patientPhone: apptPhone.trim(), scheduledAt: scheduledAt.toISOString(), reason: apptReason.trim() || undefined },
    });

    setSavingAppt(false);

    if (!result.ok) {
      Alert.alert("Couldn't create appointment", result.message);
      return;
    }

    setAddOpen(false);
    await loadData();
  };

  const showPatientDetail = (patient?: AppointmentPatient) => {
    if (!patient) return;
    Alert.alert(patient.name || "Patient", patient.phone ? `Phone: ${patient.phone}` : "No additional details available.");
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={accent} size="large" />
      </SafeAreaView>
    );
  }

  const notificationBadge = !!dashboard?.notificationCount;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: accent }]}>
              {dashboard?.avatar && !avatarFailed ? (
                <Image
                  source={{ uri: dashboard.avatar }}
                  style={s.avatarImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={s.avatarInitials}>{initials(dashboard?.name)}</Text>
              )}
            </View>
            <View style={s.ml10}>
              <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting()}</Text>
              <Text style={[s.name, { color: colors.text }]}>
                {doctorName(dashboard?.name)}
              </Text>
            </View>
          </View>
          <Pressable style={[s.bellBtn, { backgroundColor: accentBg }]} onPress={() => setNotifOpen(true)}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            {notificationBadge && <View style={s.bellBadge} />}
          </Pressable>
        </View>

        {/* ── Hero card ── */}
        <LinearGradient
          colors={["#2f9aa8", "#175a63"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.dropletWatermark} pointerEvents="none">
            <Svg width={130} height={130} viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
              <Path d="M12 2l7 8a9 9 0 1 1-14 0z" stroke="none" />
            </Svg>
          </View>

          <Text style={s.heroLabel}>{formatFullDate(new Date())}</Text>
          <Text style={s.heroTitle}>Here's your day at a glance</Text>

          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{dashboard?.totalAssignedPatients ?? 0}</Text>
              <Text style={s.heroStatLabel}>Assigned Patients</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{dashboard?.todaysAppointments.length ?? 0}</Text>
              <Text style={s.heroStatLabel}>Today's Appointments</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Ad banner (F1) ── */}
        <AdBanner placement="doctor_home" />

        {/* ── D3: Today's Appointments ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Appointments</Text>
          <Pressable onPress={openAddAppointment}>
            <Text style={[s.addLink, { color: accent }]}>+ New</Text>
          </Pressable>
        </View>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {!dashboard?.todaysAppointments.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No appointments scheduled today.</Text>
          ) : (
            dashboard.todaysAppointments.map((appt, i) => (
              <Pressable
                key={appt._id}
                onPress={() => showPatientDetail(appt.patient)}
                style={[s.apptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.apptName, { color: colors.text }]}>{appt.patient?.name || "Patient"}</Text>
                  <Text style={[s.apptSub, { color: colors.textMuted }]}>
                    {formatTime(new Date(appt.scheduledAt))}{appt.reason ? ` · ${appt.reason}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => handleAppointmentAction(appt, "completed")} style={[s.miniBtn, { backgroundColor: accent }]}>
                    <Text style={s.miniBtnText}>Complete</Text>
                  </Pressable>
                  <Pressable onPress={() => handleAppointmentAction(appt, "cancelled")} style={[s.miniBtn, { backgroundColor: colors.border }]}>
                    <Text style={[s.miniBtnText, { color: colors.textMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* ── D3: Upcoming Consultations ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Consultations</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {!dashboard?.upcomingAppointments.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Nothing upcoming.</Text>
          ) : (
            dashboard.upcomingAppointments.map((appt, i) => (
              <Pressable
                key={appt._id}
                onPress={() => showPatientDetail(appt.patient)}
                style={[s.apptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.apptName, { color: colors.text }]}>{appt.patient?.name || "Patient"}</Text>
                  <Text style={[s.apptSub, { color: colors.textMuted }]}>
                    {formatShort(new Date(appt.scheduledAt))}, {formatTime(new Date(appt.scheduledAt))}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* ── D3: Completed Visits ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Completed Visits</Text>
        <View style={[s.card, { backgroundColor: colors.surface, marginBottom: 20 }]}>
          {!dashboard?.completedAppointments.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No completed visits yet.</Text>
          ) : (
            dashboard.completedAppointments.map((appt, i) => (
              <Pressable
                key={appt._id}
                onPress={() => showPatientDetail(appt.patient)}
                style={[s.apptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.apptName, { color: colors.text }]}>{appt.patient?.name || "Patient"}</Text>
                  <Text style={[s.apptSub, { color: colors.textMuted }]}>
                    {formatShort(new Date(appt.scheduledAt))}{appt.reason ? ` · ${appt.reason}` : ""}
                  </Text>
                </View>
                {appt.reviewed ? (
                  <View style={[s.badge, { backgroundColor: accentBg }]}>
                    <Text style={[s.badgeText, { color: accent }]}>Reviewed</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => handleMarkReviewed(appt)} style={[s.miniBtn, { backgroundColor: accent }]}>
                    <Text style={s.miniBtnText}>Mark Reviewed</Text>
                  </Pressable>
                )}
              </Pressable>
            ))
          )}
        </View>

        {/* ── D1: Recent Activity ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <View style={[s.card, { backgroundColor: colors.surface, marginBottom: 20 }]}>
          {!dashboard?.recentActivity.length ? (
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No recent activity.</Text>
          ) : (
            dashboard.recentActivity.map((item, i) => (
              <View key={i} style={[s.activityRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text style={{ fontSize: 16 }}>{item.type === "period_entry" ? "📋" : "✅"}</Text>
                <Text style={[s.activityText, { color: colors.text }]}>
                  {item.patientName} {item.type === "period_entry" ? "logged a new period entry" : "completed a visit"}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(item.createdAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Notifications modal (D4) ── */}
      <Modal visible={notifOpen} animationType="slide" transparent onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setNotifOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface, maxHeight: "70%" }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Notifications</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!dashboard?.notifications.length ? (
              <Text style={[s.emptyText, { color: colors.textMuted, paddingVertical: 20 }]}>No notifications right now.</Text>
            ) : (
              dashboard.notifications.map((n, i) => (
                <View key={i} style={[s.activityRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={{ fontSize: 16 }}>{NOTIF_ICON[n.type]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.apptName, { color: colors.text }]}>{n.patientName}</Text>
                    <Text style={[s.apptSub, { color: colors.textMuted }]}>{n.message}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{timeAgo(n.createdAt)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── New appointment modal ── */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setAddOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>New Appointment</Text>

          <Text style={[m.fieldLabel, { color: colors.text }]}>Patient Phone</Text>
          <TextInput
            value={apptPhone}
            onChangeText={setApptPhone}
            placeholder="e.g. +447700000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />

          <Text style={[m.fieldLabel, { color: colors.text }]}>Date</Text>
          <Pressable onPress={() => setShowDatePicker(true)} style={[m.input, { backgroundColor: colors.background, borderColor: colors.border, justifyContent: "center" }]}>
            <Text style={{ color: colors.text }}>{apptDate ? formatShort(apptDate) : "Select date"}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={apptDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_: DateTimePickerEvent, d?: Date) => { if (Platform.OS === "android") setShowDatePicker(false); if (d) setApptDate(d); }}
            />
          )}

          <Text style={[m.fieldLabel, { color: colors.text }]}>Time</Text>
          <Pressable onPress={() => setShowTimePicker(true)} style={[m.input, { backgroundColor: colors.background, borderColor: colors.border, justifyContent: "center" }]}>
            <Text style={{ color: colors.text }}>{apptTime ? formatTime(apptTime) : "Select time"}</Text>
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={apptTime ?? new Date()}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_: DateTimePickerEvent, d?: Date) => { if (Platform.OS === "android") setShowTimePicker(false); if (d) setApptTime(d); }}
            />
          )}

          <Text style={[m.fieldLabel, { color: colors.text }]}>Reason (optional)</Text>
          <TextInput
            value={apptReason}
            onChangeText={setApptReason}
            placeholder="e.g. Irregular cycle follow-up"
            placeholderTextColor={colors.textMuted}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />

          <Pressable
            onPress={handleCreateAppointment}
            disabled={!apptPhone.trim() || savingAppt}
            style={[m.saveBtn, { backgroundColor: accent, opacity: !apptPhone.trim() || savingAppt ? 0.6 : 1 }]}
          >
            {savingAppt ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Create Appointment</Text>}
          </Pressable>
          <Pressable onPress={() => setAddOpen(false)} style={{ paddingVertical: 8, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  avatarWrap: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ml10: { marginLeft: 10 },
  greeting: { fontSize: 12, fontWeight: "400" },
  name: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#fff" },

  heroCard: { borderRadius: 20, padding: 22, marginBottom: 20, overflow: "hidden", position: "relative" },
  dropletWatermark: { position: "absolute", right: -14, top: -18 },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", marginTop: 4, marginBottom: 18 },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1, alignItems: "flex-start" },
  heroStatValue: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600", marginTop: 2 },
  heroStatDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: "rgba(255,255,255,0.35)", marginHorizontal: 16 },

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  addLink: { fontSize: 13, fontWeight: "700" },

  card: { borderRadius: 18, padding: 6, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 16 },

  apptRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12 },
  apptName: { fontSize: 14, fontWeight: "700" },
  apptSub: { fontSize: 12, marginTop: 2 },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  miniBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12 },
  activityText: { flex: 1, fontSize: 13, fontWeight: "500" },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
