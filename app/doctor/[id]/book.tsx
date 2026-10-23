import { AvailabilityLabel, DoctorAvatar, IncludedList } from "@/components/doctors";
import { scheduleOf, type Slot, slotsFor } from "@/lib/availability";
import { describeBlocked, scanForContactDetails } from "@/lib/chat-guard";
import { canStartInstantly, CONSULTATION_POLICY, isSlotStillAvailable, messagingFor, timeline } from "@/lib/consultation";
import { formatMoney } from "@/lib/locale/regions";
import { useRegionalPricing } from "@/lib/pricing";
import { sendMessage } from "@/lib/services/chats";
import { type BookedResult, bookFreeConsultation, type ConfirmationSms, confirmCheckout, newReference, startCheckout } from "@/lib/services/consultations";
import { getBookedSlots, getDoctor } from "@/lib/services/doctors";
import type { ConsultationMode, Doctor } from "@/lib/types";
import { useMyConsultations } from "@/lib/useMyConsultations";
import { useTheme } from "@/theme";
import { useStripe } from "@stripe/stripe-react-native";
import { addDays, addHours, format, isToday, isTomorrow } from "date-fns";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Info,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Zap,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Book a consultation. Same steps as the webapp's /patient/doctors/[id]/book:
// Time → Concern → Payment, then Stripe (or straight away when free), then
// the confirmation.

const STEPS = ["Time", "Concern", "Payment"] as const;
const MIN_CONCERN = 20;

const DAY_PARTS: { label: string; test: (hour: number) => boolean }[] = [
  { label: "Morning", test: (h) => h < 12 },
  { label: "Afternoon", test: (h) => h >= 12 && h < 17 },
  { label: "Evening", test: (h) => h >= 17 },
];

const groupByDayPart = (slots: Slot[]) =>
  DAY_PARTS.map((part) => ({ label: part.label, slots: slots.filter((sl) => part.test(sl.start.getHours())) })).filter((g) => g.slots.length > 0);

const dayName = (date: Date) => (isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : format(date, "EEE"));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Booked = { reference: string; mode: ConsultationMode; startsAt: Date; bookedAt: Date; payment: BookedResult["payment"]; sms: ConfirmationSms | null };

export default function BookScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { regionId, region, fee, flag } = useRegionalPricing();
  const { byDoctor, reload: reloadMine } = useMyConsultations();
  const accent = colors.primary;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [bookedStarts, setBookedStarts] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ConsultationMode | null>(null);
  const [dayChoice, setDayIndex] = useState<number | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [concern, setConcern] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const load = useCallback(async () => {
    const [found, taken] = await Promise.all([getDoctor(id), getBookedSlots(id)]);
    setDoctor(found ?? null);
    setBookedStarts(taken);
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

  const schedule = useMemo(() => scheduleOf(doctor?.schedule), [doctor?.schedule]);
  const days = useMemo(() => (doctor ? slotsFor(schedule, new Date(), bookedStarts) : []), [doctor, schedule, bookedStarts]);

  const header = (
    <View style={[s.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => router.back()} style={s.headerBtn} accessibilityLabel="Back">
        <ArrowLeft size={21} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[s.eyebrow, { color: accent }]}>Book a consultation</Text>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {doctor?.name ?? "Specialist"}
        </Text>
      </View>
    </View>
  );

  if (loading || !doctor) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {header}
        {loading ? (
          <ActivityIndicator color={accent} size="large" style={{ marginTop: 60 }} />
        ) : (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 60 }}>This doctor isn't available for booking.</Text>
        )}
      </SafeAreaView>
    );
  }

  const price = fee(doctor.feeGBP);
  const free = price.amount === 0;
  const instantAllowed = canStartInstantly(doctor.availability, schedule);
  const chosenMode: ConsultationMode = mode ?? (instantAllowed ? "instant" : "scheduled");
  const dayIndex = dayChoice ?? Math.max(0, days.findIndex((d) => d.slots.some((sl) => sl.available)));
  const selectedDay = days[dayIndex];
  const blocked = scanForContactDetails(concern);
  const current = byDoctor.get(doctor.id);
  const openConsultation = current && (current.state === "active" || current.state === "upcoming") ? current : null;

  if (booked) return <Confirmation booked={booked} doctor={doctor} />;

  if (!messagingFor(doctor).consultation) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {header}
        <View style={[s.card, s.center, { backgroundColor: colors.surface, borderColor: colors.border, margin: 18 }]}>
          <Text style={[s.h2, { color: colors.text }]}>Messages only</Text>
          <Text style={[s.muted, { color: colors.textMuted, textAlign: "center" }]}>{doctor.name} answers free messages and doesn't take consultations right now.</Text>
          <Pressable onPress={() => router.replace(`/consultation/${doctor.id}`)} style={[s.cta, { backgroundColor: accent }]}>
            <MessageCircle size={18} color="#fff" />
            <Text style={s.ctaText}>Message for free</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (openConsultation && step === 0) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {header}
        <View style={[s.card, s.center, { backgroundColor: colors.surface, borderColor: colors.border, margin: 18 }]}>
          <View style={[s.bigIcon, { backgroundColor: colors.primaryLight }]}>
            <MessageCircle size={28} color={accent} />
          </View>
          <Text style={[s.h2, { color: colors.text, marginTop: 14 }]}>You already have a consultation</Text>
          <Text style={[s.muted, { color: colors.textMuted, textAlign: "center" }]}>
            {openConsultation.state === "upcoming"
              ? `Your consultation with ${doctor.name} starts ${format(openConsultation.startsAt, "EEE d MMM 'at' HH:mm")}.`
              : `Your consultation with ${doctor.name} is in progress until ${format(openConsultation.sessionEndsAt, "EEE d MMM, HH:mm")}.`}
          </Text>
          <Pressable onPress={() => router.replace(`/consultation/${doctor.id}`)} style={[s.cta, { backgroundColor: accent }]}>
            <MessageCircle size={18} color="#fff" />
            <Text style={s.ctaText}>Open chat</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const stepValid = [chosenMode === "instant" ? instantAllowed : !!slot, concern.trim().length >= MIN_CONCERN && blocked.length === 0, agreed][step];

  /** Checks the slot again, then books: free straight away, paid through Stripe. */
  const checkout = async () => {
    if (working) return;
    const startsAt = chosenMode === "instant" ? new Date() : slot!;
    setWorking("Checking the schedule…");

    if (chosenMode === "scheduled") {
      const taken = await getBookedSlots(doctor.id);
      if (!isSlotStillAvailable(schedule, startsAt, new Date(), taken)) {
        setWorking(null);
        setBookedStarts(taken);
        setSlot(null);
        setStep(0);
        Alert.alert("That time was just taken", "Please pick another slot.");
        return;
      }
    } else if (doctor.availability !== "online") {
      setWorking(null);
      Alert.alert("The doctor just went offline", "Please schedule a time instead.");
      setMode("scheduled");
      setStep(0);
      return;
    }

    const request = {
      doctorId: doctor.id,
      mode: chosenMode,
      concern: concern.trim(),
      startsAt: startsAt.toISOString(),
      regionId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
    };
    const fail = (title: string, message: string) => {
      setWorking(null);
      Alert.alert(title, message);
    };

    let result: Booked | null = null;
    const bookFree = async () => {
      const reference = newReference();
      const saved = await bookFreeConsultation({ ...request, reference });
      if (!saved.ok) return fail("Couldn't book", saved.message);
      result = {
        reference,
        mode: chosenMode,
        startsAt,
        bookedAt: new Date(),
        payment: { amount: 0, currency: price.currency, regionId, method: "free", reference: "FREE", paidAt: new Date().toISOString() },
        sms: saved.data.sms,
      };
    };

    if (free) {
      setWorking("Confirming your booking…");
      await bookFree();
    } else {
      setWorking("Opening secure payment…");
      const started = await startCheckout(request);
      if (!started.ok) {
        if (started.status === 409 && /free/i.test(started.message)) await bookFree();
        else return fail("Payment couldn't start", started.message);
      } else {
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "GyneX",
          paymentIntentClientSecret: started.data.clientSecret,
          returnURL: "gyneclinics://stripe-redirect",
          allowsDelayedPaymentMethods: false,
        });
        if (initError) return fail("Payment couldn't start", initError.message);
        setWorking(null);
        const { error: paymentError } = await presentPaymentSheet();
        if (paymentError) {
          if (paymentError.code !== "Canceled") Alert.alert("Payment failed", paymentError.message);
          return;
        }
        setWorking("Confirming your payment…");
        // Stripe may take a moment; the webhook also saves the booking.
        for (let attempt = 0; attempt < 6 && !result; attempt++) {
          const confirmed = await confirmCheckout(started.data.paymentIntentId);
          if (!confirmed.ok) return fail("Payment received", `${confirmed.message} Your booking will show in My consultations shortly.`);
          if (confirmed.data.booked) {
            const b = confirmed.data.booked;
            result = { reference: b.reference, mode: chosenMode, startsAt: new Date(b.startsAt), bookedAt: new Date(b.bookedAt), payment: b.payment, sms: b.sms };
          } else await wait(2000);
        }
        if (!result) {
          setWorking(null);
          Alert.alert("Payment received", "Stripe is still confirming it. Your booking will show in My consultations in a moment.", [
            { text: "OK", onPress: () => router.replace("/consultations") },
          ]);
          return;
        }
      }
    }

    if (!result) return;
    // An instant chat opens now: start it with the concern.
    if (chosenMode === "instant") await sendMessage({ doctorId: doctor.id, text: concern.trim() });
    setWorking(null);
    setBooked(result);
    void reloadMine();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Doctor */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.row}>
              <DoctorAvatar doctor={doctor} size={44} />
              <View style={{ flex: 1 }}>
                <View style={s.row}>
                  <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                    {doctor.name}
                  </Text>
                  <BadgeCheck size={15} color={colors.teal} />
                </View>
                <AvailabilityLabel value={doctor.availability} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Consultation</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{price.label}</Text>
              </View>
            </View>
          </View>

          {/* Steps */}
          <View style={[s.row, { marginBottom: 14 }]}>
            {STEPS.map((label, i) => (
              <View key={label} style={[s.row, { flex: i < STEPS.length - 1 ? 1 : 0 }]}>
                <View style={[s.stepDot, i < step ? { backgroundColor: accent } : i === step ? { backgroundColor: colors.text } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                  {i < step ? <Check size={13} color="#fff" /> : <Text style={{ color: i === step ? colors.background : colors.textMuted, fontSize: 11, fontWeight: "800" }}>{i + 1}</Text>}
                </View>
                <Text style={{ color: i === step ? colors.text : colors.textMuted, fontWeight: i === step ? "800" : "500", fontSize: 12.5 }}>
                  {label === "Payment" && free ? "Confirm" : label}
                </Text>
                {i < STEPS.length - 1 && <View style={[s.stepLine, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {step === 0 && (
              <>
                <Text style={[s.h2, { color: colors.text }]}>When would you like to chat?</Text>
                <Text style={[s.muted, { color: colors.textMuted }]}>Your booking is confirmed automatically — no waiting for approval.</Text>
                <View style={{ gap: 10, marginTop: 14 }}>
                  <ModeOption
                    selected={chosenMode === "instant"}
                    disabled={!instantAllowed}
                    onSelect={() => setMode("instant")}
                    icon={<Zap size={20} color={chosenMode === "instant" ? accent : colors.textMuted} />}
                    title="Chat now"
                    body={instantAllowed ? `Starts right away · usually replies ${doctor.responseTime}` : "Available when the doctor is online"}
                  />
                  <ModeOption
                    selected={chosenMode === "scheduled"}
                    onSelect={() => setMode("scheduled")}
                    icon={<CalendarClock size={20} color={chosenMode === "scheduled" ? accent : colors.textMuted} />}
                    title="Schedule a time"
                    body="Pick a slot — the doctor will be ready for you"
                  />
                </View>

                {chosenMode === "scheduled" && (
                  <View style={{ marginTop: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {days.map((day, i) => {
                        const openSlots = day.slots.filter((sl) => sl.available).length;
                        const on = dayIndex === i;
                        return (
                          <Pressable
                            key={day.date.toISOString()}
                            disabled={openSlots === 0}
                            onPress={() => {
                              setDayIndex(i);
                              setSlot(null);
                            }}
                            style={[s.day, { borderColor: on ? accent : colors.border, backgroundColor: on ? colors.primaryLight : colors.background, opacity: openSlots ? 1 : 0.4 }]}
                          >
                            <Text style={{ color: on ? accent : colors.textMuted, fontSize: 11 }}>{dayName(day.date)}</Text>
                            <Text style={{ color: on ? accent : colors.text, fontSize: 18, fontWeight: "800" }}>{format(day.date, "d")}</Text>
                            <Text style={{ color: on ? accent : colors.textMuted, fontSize: 10 }}>
                              {openSlots ? `${openSlots} slots` : day.closed === "off" ? "Off" : day.closed === "time-off" ? "Away" : "Full"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    {selectedDay && selectedDay.slots.some((sl) => sl.available) ? (
                      groupByDayPart(selectedDay.slots).map((group) => (
                        <View key={group.label} style={{ marginTop: 14 }}>
                          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>{group.label}</Text>
                          <View style={s.slots}>
                            {group.slots.map((sl) => {
                              const on = slot?.getTime() === sl.start.getTime();
                              return (
                                <Pressable
                                  key={sl.start.toISOString()}
                                  disabled={!sl.available}
                                  onPress={() => setSlot(sl.start)}
                                  style={[s.slot, on ? { backgroundColor: accent, borderColor: accent } : sl.available ? { borderColor: colors.border } : { backgroundColor: colors.background, borderColor: "transparent" }]}
                                >
                                  <Text style={{ color: on ? "#fff" : sl.available ? colors.text : colors.textMuted, fontWeight: "700", fontSize: 13, textDecorationLine: sl.available ? "none" : "line-through" }}>
                                    {format(sl.start, "HH:mm")}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={[s.noSlots, { color: colors.textMuted, backgroundColor: colors.background }]}>
                        {doctor.name} has no open times in the next {schedule.bookingWindowDays} days.
                      </Text>
                    )}
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12 }}>{schedule.slotMinutes}-minute slots · shown in your local time zone.</Text>
                  </View>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <Text style={[s.h2, { color: colors.text }]}>What would you like help with?</Text>
                <Text style={[s.muted, { color: colors.textMuted }]}>This is sent to {doctor.name} as your first message, so they can prepare.</Text>
                <Text style={[s.label, { color: colors.text }]}>Describe your concern</Text>
                <TextInput
                  value={concern}
                  onChangeText={setConcern}
                  multiline
                  placeholder="e.g. My last two cycles were 38 and 41 days and I've had more cramps than usual…"
                  placeholderTextColor={colors.textMuted}
                  style={[s.input, { color: colors.text, borderColor: blocked.length ? colors.danger : colors.border, backgroundColor: colors.background }]}
                />
                {blocked.length > 0 ? (
                  <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{describeBlocked(blocked)}</Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                    {concern.trim().length}/{MIN_CONCERN} characters minimum. Include how long it has been happening and anything you've tracked.
                  </Text>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <Text style={[s.h2, { color: colors.text }]}>{free ? "Confirm your booking" : "Review & pay"}</Text>
                <Text style={[s.muted, { color: colors.textMuted }]}>
                  {free ? "This consultation is free — no payment needed." : "Next, we'll check the schedule and take you to secure payment."}
                </Text>
                <View style={[s.summary, { borderColor: colors.border }]}>
                  <SummaryRow label="Specialist" value={doctor.name} />
                  <SummaryRow label="When" value={chosenMode === "instant" ? "Now — chat opens straight away" : slot ? format(slot, "EEEE d MMMM 'at' HH:mm") : "—"} />
                  <SummaryRow label="Consultation fee" value={price.label} bold />
                  <SummaryRow label="Pricing region" value={`${flag} ${region.name}`} last />
                </View>
                {!free && (
                  <View style={[s.row, { flexWrap: "wrap", marginTop: 12 }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Pay with:</Text>
                    {["Card", "Apple Pay", "Google Pay"].map((method) => (
                      <View key={method} style={[s.method, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={{ color: colors.text, fontSize: 11.5, fontWeight: "700" }}>{method}</Text>
                      </View>
                    ))}
                    <Text style={{ color: colors.textMuted, fontSize: 11.5 }}>· secured by Stripe</Text>
                  </View>
                )}
                <Pressable onPress={() => setAgreed((v) => !v)} style={[s.row, { alignItems: "flex-start", marginTop: 16, gap: 10 }]} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
                  <View style={[s.check, { borderColor: agreed ? accent : colors.border, backgroundColor: agreed ? accent : "transparent" }]}>{agreed && <Check size={13} color="#fff" />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>I understand this chat gives guidance, not a diagnosis</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 2 }}>
                      Full refund if {doctor.name.split(" ").slice(0, 2).join(" ")} doesn't reply within {CONSULTATION_POLICY.replyGuaranteeHours} hours.
                    </Text>
                  </View>
                </Pressable>
              </>
            )}

            <View style={[s.row, s.stepActions, { borderTopColor: colors.border }]}>
              {step > 0 && (
                <Pressable onPress={() => setStep(step - 1)} disabled={!!working} style={[s.backBtn, { borderColor: colors.border }]}>
                  <ArrowLeft size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Back</Text>
                </Pressable>
              )}
              {step < 2 ? (
                <Pressable onPress={() => setStep(step + 1)} disabled={!stepValid} style={[s.nextBtn, { backgroundColor: accent, opacity: stepValid ? 1 : 0.45 }]}>
                  <Text style={s.ctaText}>Continue</Text>
                  <ArrowRight size={16} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={checkout} disabled={!stepValid || !!working} style={[s.nextBtn, { backgroundColor: accent, opacity: stepValid && !working ? 1 : 0.45 }]}>
                  {working ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={s.ctaText}>{working}</Text>
                    </>
                  ) : free ? (
                    <Text style={s.ctaText}>Confirm free booking</Text>
                  ) : (
                    <>
                      <LockKeyhole size={16} color="#fff" />
                      <Text style={s.ctaText}>Continue to payment · {price.label}</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>What's included</Text>
            <IncludedList colors={colors} accent={accent} />
          </View>
          <View style={[s.row, s.disclaimer, { backgroundColor: colors.primaryLight }]}>
            <Info size={15} color={accent} />
            <Text style={{ flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
              Chat consultations are for guidance only. In an emergency, call your local emergency number.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeOption({ selected, disabled, onSelect, icon, title, body }: { selected: boolean; disabled?: boolean; onSelect: () => void; icon: React.ReactNode; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={[s.mode, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primaryLight : colors.background, opacity: disabled ? 0.5 : 1 }]}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 2 }}>{body}</Text>
      </View>
    </Pressable>
  );
}

function SummaryRow({ label, value, bold = false, last = false }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[s.summaryRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: bold ? "800" : "500", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** "Consultation confirmed", as on the webapp. */
function Confirmation({ booked, doctor }: { booked: Booked; doctor: Doctor }) {
  const { colors } = useTheme();
  const router = useRouter();
  const accent = colors.primary;
  const instant = booked.mode === "instant";
  const free = booked.payment.method === "free";
  const t = timeline({ id: booked.reference, doctorId: doctor.id, mode: booked.mode, concern: "", startsAt: booked.startsAt.toISOString(), bookedAt: booked.bookedAt.toISOString(), payment: booked.payment }, booked.bookedAt);
  const sessionEnds = addHours(t.startsAt, CONSULTATION_POLICY.sessionHours);
  const followUpEnds = addDays(sessionEnds, CONSULTATION_POLICY.followUpDays);
  const steps = [
    { label: instant ? "Doctor availability checked" : "Schedule checked", at: booked.bookedAt },
    { label: free ? "Free consultation applied" : `Payment received${booked.payment.details ? ` · ${booked.payment.details}` : ""}`, at: booked.payment.paidAt ? new Date(booked.payment.paidAt) : booked.bookedAt },
    { label: "Consultation confirmed", at: booked.bookedAt },
    { label: instant ? "Chat open now" : `Chat opens ${format(t.startsAt, "EEE d MMM, HH:mm")}`, at: null as Date | null },
  ];
  const smsText =
    booked.sms?.status === "sent" ? `Confirmation text sent to ${booked.sms.to}` : "We couldn't text you a confirmation. Your booking is confirmed.";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: "center", paddingVertical: 26 }]}>
          <View style={[s.bigIcon, { backgroundColor: "#dcfce7" }]}>
            <CheckCircle2 size={34} color="#15803d" />
          </View>
          <Text style={[s.h1, { color: colors.text }]}>Consultation confirmed</Text>
          <Text style={[s.muted, { color: colors.textMuted, textAlign: "center" }]}>
            {instant ? `Your chat with ${doctor.name} is open now. They've been notified.` : `${doctor.name} will be ready for you on ${format(t.startsAt, "EEEE d MMMM 'at' HH:mm")}.`}
          </Text>
          <View style={[s.row, s.sms, { backgroundColor: booked.sms?.status === "sent" ? "#dcfce7" : "#fef3c7" }]}>
            <MessageSquareText size={15} color={booked.sms?.status === "sent" ? "#15803d" : "#a16207"} />
            <Text style={{ color: booked.sms?.status === "sent" ? "#14532d" : "#78350f", fontSize: 12.5, flex: 1 }}>{smsText}</Text>
          </View>

          <View style={{ alignSelf: "stretch", marginTop: 18, gap: 12 }}>
            {steps.map((st) => (
              <View key={st.label} style={s.row}>
                <View style={[s.stepDot, { backgroundColor: st.at ? "#10b981" : colors.primaryLight }]}>
                  {st.at ? <Check size={13} color="#fff" /> : <Clock3 size={13} color={accent} />}
                </View>
                <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{st.label}</Text>
                {st.at && <Text style={{ color: colors.textMuted, fontSize: 11 }}>{format(st.at, "HH:mm")}</Text>}
              </View>
            ))}
          </View>

          <View style={[s.summary, { borderColor: colors.border, alignSelf: "stretch" }]}>
            <SummaryRow label="Booking ID" value={booked.reference} />
            <SummaryRow label={free ? "Price" : "Amount paid"} value={booked.payment.amount ? formatMoney(booked.payment.amount, booked.payment.currency) : "Free"} />
            {!free && <SummaryRow label="Payment reference" value={booked.payment.reference} />}
            <SummaryRow label="Chat open until" value={format(sessionEnds, "d MMM, HH:mm")} />
            <SummaryRow label="Free follow-up until" value={format(followUpEnds, "d MMM yyyy")} last />
          </View>

          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 18 }}>
            <Pressable onPress={() => router.replace(`/consultation/${doctor.id}`)} style={[s.cta, { backgroundColor: accent, marginTop: 0 }]}>
              <MessageCircle size={18} color="#fff" />
              <Text style={s.ctaText}>{instant ? "Open chat" : "View chat"}</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/consultations")} style={[s.cta, { borderWidth: 1.5, borderColor: colors.border, marginTop: 0 }]}>
              <Text style={[s.ctaText, { color: colors.text }]}>My consultations</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 12, fontWeight: "700" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  scroll: { padding: 18, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  center: { alignItems: "center" },

  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 14 },
  name: { fontSize: 15, fontWeight: "800", flexShrink: 1 },
  h1: { fontSize: 24, fontWeight: "800", marginTop: 16, textAlign: "center" },
  h2: { fontSize: 19, fontWeight: "800" },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  label: { fontSize: 13, fontWeight: "800", marginTop: 16, marginBottom: 8 },
  bigIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },

  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepLine: { flex: 1, height: 1, marginHorizontal: 4 },
  mode: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14 },
  day: { width: 70, alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingVertical: 9 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "30.5%", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 10 },
  noSlots: { borderRadius: 16, paddingVertical: 22, paddingHorizontal: 14, textAlign: "center", fontSize: 13, marginTop: 14 },
  input: { minHeight: 150, borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 14, textAlignVertical: "top" },
  summary: { borderWidth: 1, borderRadius: 16, marginTop: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  method: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepActions: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingTop: 16 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, minHeight: 50 },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, minHeight: 50, paddingHorizontal: 12 },

  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 16, marginTop: 16, alignSelf: "stretch" },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  disclaimer: { alignItems: "flex-start", borderRadius: 14, padding: 12 },
  sms: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14, alignSelf: "stretch" },
});
