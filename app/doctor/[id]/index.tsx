import { AvailabilityLabel, Chip, DoctorAvatar, IncludedList, Rating, Stars } from "@/components/doctors";
import { summarizeWeek, scheduleOf } from "@/lib/availability";
import { describeBlocked, scanForContactDetails } from "@/lib/chat-guard";
import { messagingFor, STATE_LABEL } from "@/lib/consultation";
import { useRegionalPricing } from "@/lib/pricing";
import { getDoctor, getDoctorReviews, type MyReview, reportDoctor, submitReview } from "@/lib/services/doctors";
import type { Doctor, Review } from "@/lib/types";
import { useMyConsultations } from "@/lib/useMyConsultations";
import { useTheme } from "@/theme";
import { format, parseISO } from "date-fns";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  Info,
  Languages,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// A specialist's profile. Same as the webapp's /patient/doctors/[id]:
// profile, about, consultation hours, booking card, reviews and reporting.

const MY_STATUS: Record<MyReview["status"], { label: string; hint: string }> = {
  published: { label: "Published", hint: "Other patients can see it." },
  held: { label: "Waiting for a check", hint: "We check 1 and 2 star reviews before they appear, usually within a day." },
  hidden: { label: "Not shown", hint: "Our team took it down because it didn't follow the review rules." },
};

const REPORT_REASONS = [
  { value: "medical_concern", label: "Unsafe or wrong medical advice" },
  { value: "off_platform", label: "Asked me to talk or pay outside Gynex" },
  { value: "no_reply", label: "Didn't reply to me" },
  { value: "behaviour", label: "Rude or inappropriate" },
  { value: "payment", label: "Problem with a payment" },
  { value: "fake_profile", label: "Their details look wrong or fake" },
  { value: "other", label: "Something else" },
];

export default function DoctorProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fee, region, flag } = useRegionalPricing();
  const { byDoctor } = useMyConsultations();
  const accent = colors.primary;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [thanks, setThanks] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    const [found, r] = await Promise.all([getDoctor(id), getDoctorReviews(id)]);
    setDoctor(found ?? null);
    setReviews(r.reviews);
    setMine(r.mine);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const blocked = scanForContactDetails(text);
  const reviewValid = rating > 0 && text.trim().length >= 10 && blocked.length === 0;

  const sendReview = async () => {
    if (!reviewValid || sending) return;
    setSending(true);
    const result = await submitReview({ doctorId: id, rating, text });
    setSending(false);
    if (!result.ok) return Alert.alert("Couldn't send your review", result.message);
    setReviewOpen(false);
    setRating(0);
    setText("");
    setThanks(result.message || "Thank you for your review.");
    await load();
  };

  const sendReport = async () => {
    if (!reason || reporting) return;
    setReporting(true);
    const result = await reportDoctor({ doctorId: id, reason, details });
    setReporting(false);
    if (!result.ok) return Alert.alert("Couldn't send your report", result.message);
    setReportOpen(false);
    setReason("");
    setDetails("");
    Alert.alert("Report sent", result.message || "Thank you. Our team will look into it.");
  };

  const header = (title?: string, subtitle?: string) => (
    <View style={[s.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => router.back()} style={s.headerBtn} accessibilityLabel="Back">
        <ArrowLeft size={21} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title ?? "Specialist"}
        </Text>
        {!!subtitle && (
          <Text style={[s.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {header()}
        <ActivityIndicator color={accent} size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {header()}
        <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 60, paddingHorizontal: 32 }}>This doctor's profile isn't available.</Text>
      </SafeAreaView>
    );
  }

  const messaging = messagingFor(doctor);
  const current = byDoctor.get(doctor.id) ?? null;
  const open = current && current.state !== "closed" && current.state !== "refunded" ? current : null;
  const schedule = scheduleOf(doctor.schedule);
  const hours = summarizeWeek(schedule);
  const facts = [
    { Icon: Award, label: "Experience", value: `${doctor.experienceYears} years` },
    { Icon: Users, label: "Consultations", value: doctor.consultations.toLocaleString("en-GB") },
    { Icon: Clock, label: "Usually replies", value: doctor.responseTime },
  ];
  const others = mine ? reviews.filter((r) => r.id !== mine.id) : reviews;
  const openChat = () => router.push(`/consultation/${doctor.id}`);
  const book = () => router.push(`/doctor/${doctor.id}/book`);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {header(doctor.name, doctor.title)}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Profile */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.profileRow}>
            <DoctorAvatar doctor={doctor} size={76} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
                <View style={[s.row, s.badge, { backgroundColor: colors.tealLight }]}>
                  <BadgeCheck size={13} color={colors.teal} />
                  <Text style={[s.badgeText, { color: colors.teal }]}>Verified specialist</Text>
                </View>
                <AvailabilityLabel value={doctor.availability} />
              </View>
              <Text style={[s.specialization, { color: colors.text }]}>{doctor.specialization}</Text>
              <Rating value={doctor.rating} count={doctor.reviewCount} />
            </View>
          </View>
          <View style={s.facts}>
            {facts.map(({ Icon, label, value }) => (
              <View key={label} style={[s.fact, { backgroundColor: colors.background }]}>
                <Icon size={16} color={accent} />
                <Text style={[s.factLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[s.factValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Booking */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {!messaging.consultation && !open ? (
            <>
              <Text style={[s.muted, { color: colors.textMuted }]}>Messages</Text>
              <Text style={[s.price, { color: colors.text }]}>Free</Text>
              <Text style={[s.body, { color: colors.textMuted, marginTop: 8 }]}>
                {doctor.name} answers messages for free. Replies come when they're available, so this isn't for emergencies.
              </Text>
              <Pressable onPress={openChat} style={[s.cta, { backgroundColor: accent }]}>
                <MessageCircle size={18} color="#fff" />
                <Text style={s.ctaText}>Message for free</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[s.muted, { color: colors.textMuted }]}>Chat consultation</Text>
              {/* Price, with the pricing region on the right */}
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.price, { color: colors.text }]}>{fee(doctor.feeGBP).label}</Text>
                <View style={[s.row, s.regionPill, { backgroundColor: colors.background }]}>
                  <Text style={{ fontSize: 13 }}>{flag}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>{region.name}</Text>
                </View>
              </View>
              {current && !open && (
                <View style={[s.row, s.note, { backgroundColor: colors.background }]}>
                  <CalendarCheck size={15} color={accent} />
                  <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>
                    You consulted {doctor.name} on {format(current.startsAt, "d MMM yyyy")}.
                  </Text>
                </View>
              )}
              <IncludedList colors={colors} accent={accent} />

              {open ? (
                <View style={{ marginTop: 16, gap: 10 }}>
                  <View style={[s.row, s.note, { backgroundColor: colors.background, justifyContent: "space-between" }]}>
                    <Chip label={STATE_LABEL[open.state].label} tone={accent} bg={colors.primaryLight} />
                    <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                      {open.state === "upcoming"
                        ? `Starts ${format(open.startsAt, "EEE d MMM, HH:mm")}`
                        : open.state === "active"
                          ? `Open until ${format(open.sessionEndsAt, "d MMM, HH:mm")}`
                          : `Follow-up until ${format(open.followUpEndsAt, "d MMM")}`}
                    </Text>
                  </View>
                  <Pressable onPress={openChat} style={[s.cta, { backgroundColor: accent, marginTop: 0 }]}>
                    <MessageCircle size={18} color="#fff" />
                    <Text style={s.ctaText}>Open chat</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 16, gap: 10 }}>
                  <Pressable onPress={book} style={[s.cta, { backgroundColor: accent, marginTop: 0 }]}>
                    <CalendarCheck size={18} color="#fff" />
                    <Text style={s.ctaText}>{doctor.feeGBP > 0 ? "Book consultation" : "Book free consultation"}</Text>
                  </Pressable>
                  {messaging.free && (
                    <>
                      <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center" }}>or send a quick question for free</Text>
                      <Pressable onPress={openChat} style={[s.cta, s.ctaOutline, { borderColor: colors.border, marginTop: 0 }]}>
                        <MessageCircle size={18} color={colors.text} />
                        <Text style={[s.ctaText, { color: colors.text }]}>Message for free</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <View style={[s.row, s.disclaimer, { backgroundColor: colors.primaryLight }]}>
          <Info size={15} color={accent} />
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
            Chat guidance is informational and does not replace an in-person examination or diagnosis.
          </Text>
        </View>

        {/* About */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 18 }]}>
          <View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[s.body, { color: colors.textMuted, marginTop: 6 }]}>{doctor.about || "No introduction yet."}</Text>
          </View>
          {doctor.focusAreas.length > 0 && (
            <View>
              <Text style={[s.subTitle, { color: colors.text }]}>Areas of focus</Text>
              <View style={[s.row, { flexWrap: "wrap", gap: 6, marginTop: 8 }]}>
                {doctor.focusAreas.map((area) => (
                  <Chip key={area} label={area} tone={colors.secondary} bg={colors.secondaryLight} />
                ))}
              </View>
            </View>
          )}
          <View>
            <Text style={[s.subTitle, { color: colors.text }]}>Qualifications</Text>
            <View style={{ gap: 5, marginTop: 8 }}>
              {doctor.qualifications.map((q) => (
                <View key={q} style={s.row}>
                  <Award size={15} color="#c69a3c" />
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{q}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={[s.subTitle, { color: colors.text }]}>Practice</Text>
            {!!(doctor.clinic || doctor.city) && (
              <View style={s.row}>
                <Building2 size={15} color={accent} />
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{[doctor.clinic, doctor.city].filter(Boolean).join(", ")}</Text>
              </View>
            )}
            {doctor.languages.length > 0 && (
              <View style={s.row}>
                <Languages size={15} color={accent} />
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{doctor.languages.join(", ")}</Text>
              </View>
            )}
            {!!doctor.registrationNumber && (
              <View style={s.row}>
                <ShieldCheck size={15} color={accent} />
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{doctor.registrationNumber}</Text>
              </View>
            )}
          </View>
          <View>
            <View style={s.row}>
              <CalendarClock size={16} color={accent} />
              <Text style={[s.subTitle, { color: colors.text }]}>Consultation hours</Text>
            </View>
            {hours.length ? (
              <View style={{ gap: 5, marginTop: 8 }}>
                {hours.map((h) => (
                  <View key={h.days} style={[s.row, { gap: 14 }]}>
                    <Text style={{ width: 76, color: colors.text, fontWeight: "700", fontSize: 13 }}>{h.days}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{h.hours}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>No regular hours set right now.</Text>
            )}
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
              {schedule.slotMinutes}-minute consultations{schedule.instantChat ? " · instant chat when online" : ""}
            </Text>
          </View>
        </View>

        {/* Reviews */}
        <View style={[s.row, { justifyContent: "space-between", marginTop: 6, marginBottom: 12 }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Patient reviews</Text>
          {!mine && (
            <Pressable onPress={() => setReviewOpen(true)} style={[s.row, s.smallBtn, { borderColor: colors.border }]}>
              <MessageSquareText size={15} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12.5 }}>Write a review</Text>
            </Pressable>
          )}
        </View>
        {!!thanks && (
          <View style={[s.row, s.note, { backgroundColor: "#dcfce7", marginTop: 0, marginBottom: 10 }]}>
            <CheckCircle2 size={15} color="#15803d" />
            <Text style={{ flex: 1, color: "#14532d", fontSize: 13 }}>{thanks}</Text>
          </View>
        )}
        {mine && (
          <View style={[s.reviewCard, { borderColor: `${accent}55`, backgroundColor: colors.primaryLight }]}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ color: accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>YOUR REVIEW</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{MY_STATUS[mine.status].label}</Text>
            </View>
            <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
              <Stars value={mine.rating} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{format(parseISO(mine.date), "d MMM yyyy")}</Text>
            </View>
            <Text style={[s.body, { color: colors.text, marginTop: 8 }]}>{mine.text}</Text>
            {mine.status !== "published" && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>{MY_STATUS[mine.status].hint}</Text>}
          </View>
        )}
        {others.length === 0 && !mine ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>No reviews yet.</Text>
        ) : (
          others.map((r) => (
            <View key={r.id} style={[s.reviewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Stars value={r.rating} />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{format(parseISO(r.date), "d MMM yyyy")}</Text>
              </View>
              <Text style={[s.body, { color: colors.text, marginTop: 8 }]}>{r.text}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>{r.author}</Text>
            </View>
          ))
        )}

        <Pressable onPress={() => setReportOpen(true)} style={[s.row, { alignSelf: "center", marginTop: 18, paddingVertical: 8 }]}>
          <Flag size={14} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Report a problem</Text>
        </Pressable>
      </ScrollView>

      {/* Write a review */}
      <Modal visible={reviewOpen} animationType="slide" transparent onRequestClose={() => setReviewOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setReviewOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Review {doctor.name}</Text>
          <Text style={[m.sub, { color: colors.textMuted }]}>Reviews are anonymous: others see “Verified patient”. Please don't include personal details.</Text>
          <View style={[s.row, { justifyContent: "center", gap: 8, marginBottom: 16 }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}>
                <Star size={34} color={n <= rating ? "#c69a3c" : colors.border} fill={n <= rating ? "#c69a3c" : "transparent"} />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            maxLength={1000}
            multiline
            placeholder="How was your experience? (at least 10 characters)"
            placeholderTextColor={colors.textMuted}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 120, textAlignVertical: "top" }]}
          />
          {blocked.length > 0 && <Text style={{ color: colors.danger, fontSize: 12, marginTop: -8, marginBottom: 10 }}>Please remove {describeBlocked(blocked)}.</Text>}
          <Pressable onPress={sendReview} disabled={!reviewValid || sending} style={[m.saveBtn, { backgroundColor: accent, opacity: !reviewValid || sending ? 0.5 : 1 }]}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Submit review</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* Report a problem */}
      <Modal visible={reportOpen} animationType="slide" transparent onRequestClose={() => setReportOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setReportOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Report a problem</Text>
          <Text style={[m.sub, { color: colors.textMuted }]}>Tell the Gynex team what happened with {doctor.name}. Reports are private.</Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 6, marginBottom: 14 }]}>
            {REPORT_REASONS.map((r) => {
              const on = reason === r.value;
              return (
                <Pressable key={r.value} onPress={() => setReason(r.value)} style={[s.reasonChip, { borderColor: on ? "#ef4444" : colors.border, backgroundColor: on ? "#fee2e2" : colors.background }]}>
                  <Text style={{ fontSize: 12, color: on ? "#b91c1c" : colors.text, fontWeight: on ? "700" : "500" }}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder="Anything else we should know? (optional)"
            placeholderTextColor={colors.textMuted}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 96, textAlignVertical: "top" }]}
          />
          <Pressable onPress={sendReport} disabled={!reason || reporting} style={[m.saveBtn, { backgroundColor: "#ef4444", opacity: !reason || reporting ? 0.5 : 1 }]}>
            {reporting ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Send report</Text>}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  regionPill: { gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: 18, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },

  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 14 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  specialization: { fontSize: 14, fontWeight: "700" },
  facts: { flexDirection: "row", gap: 8, marginTop: 18 },
  fact: { flex: 1, borderRadius: 14, padding: 10 },
  factLabel: { fontSize: 11, marginTop: 6 },
  factValue: { fontSize: 13, fontWeight: "800", marginTop: 1 },

  muted: { fontSize: 13 },
  price: { fontSize: 30, fontWeight: "800", marginTop: 2 },
  note: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 16, marginTop: 16 },
  ctaOutline: { borderWidth: 1.5, backgroundColor: "transparent" },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  disclaimer: { alignItems: "flex-start", borderRadius: 14, padding: 12, marginBottom: 14 },

  sectionTitle: { fontSize: 19, fontWeight: "800" },
  subTitle: { fontSize: 13.5, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21 },
  smallBtn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  reviewCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  reasonChip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 6, marginBottom: 16 },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
