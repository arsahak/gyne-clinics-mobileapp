import { CONSULTATION_POLICY, type ConsultationTimeline, messagingFor } from "@/lib/consultation";
import { useRegionalPricing } from "@/lib/pricing";
import type { Availability, Doctor } from "@/lib/types";
import { useTheme } from "@/theme";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, Briefcase, CalendarCheck, CalendarDays, MessageCircle, RotateCcw, ShieldCheck, Star } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

// Doctor pieces shared by the Help screens, matching the webapp's
// (component/doctors/*, booking-flow IncludedList).

type Colors = ReturnType<typeof useTheme>["colors"];

export const AVAILABILITY: Record<Availability, { label: string; color: string }> = {
  online: { label: "Online now", color: "#10b981" },
  today: { label: "Available today", color: "#217580" },
  this_week: { label: "This week", color: "#b08d48" },
  away: { label: "Away", color: "#71717a" },
};

export function AvailabilityLabel({ value }: { value: Availability }) {
  const a = AVAILABILITY[value];
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: a.color }]} />
      <Text style={[s.availability, { color: a.color }]}>{a.label}</Text>
    </View>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={s.row}>
      <Star size={14} color="#c69a3c" fill="#c69a3c" />
      <Text style={[s.ratingValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      {count !== undefined && <Text style={[s.ratingCount, { color: colors.textMuted }]}>({count})</Text>}
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { gap: 2 }]} accessibilityLabel={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < Math.round(value);
        return <Star key={i} size={size} color={on ? "#c69a3c" : colors.border} fill={on ? "#c69a3c" : "transparent"} />;
      })}
    </View>
  );
}

export function Chip({ label, tone, bg }: { label: string; tone: string; bg: string }) {
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: tone }]}>{label}</Text>
    </View>
  );
}

/** The doctor's photo, or initials on their colour. */
export function DoctorAvatar({ doctor, size }: { doctor: Pick<Doctor, "name" | "avatar" | "hue">; size: number }) {
  const end = (doctor.hue + 38) % 360;
  const initials = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  if (doctor.avatar) return <Image source={{ uri: doctor.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient
      colors={[`hsl(${doctor.hue}, 55%, 45%)`, `hsl(${end}, 50%, 38%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.32 }}>{initials}</Text>
    </LinearGradient>
  );
}

/** Where the patient's consultation with this doctor is, in a few words. */
function consultationLabel(c: ConsultationTimeline) {
  switch (c.state) {
    case "active":
      return { text: "Consultation in progress", bg: "#10b981", color: "#fff" };
    case "upcoming":
      return { text: `Booked · ${format(c.startsAt, "EEE d MMM, HH:mm")}`, bg: "#d13a8b", color: "#fff" };
    case "follow_up":
      return { text: `Free follow-up until ${format(c.followUpEndsAt, "d MMM")}`, bg: "#b08d48", color: "#fff" };
    default:
      return { text: `Consulted · ${format(c.startsAt, "d MMM yyyy")}`, bg: "#ffffff", color: "#18181b" };
  }
}

/** Matches the webapp's DoctorCard: cover, photo over its edge, then details. */
export function DoctorCard({
  doctor,
  consultation,
  compact = false,
  onPress,
}: {
  doctor: Doctor;
  consultation?: ConsultationTimeline | null;
  compact?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { fee } = useRegionalPricing();
  const coverEnd = (doctor.hue + 38) % 360;
  const messaging = messagingFor(doctor);
  const consulted = consultation ? consultationLabel(consultation) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={[`hsl(${doctor.hue}, 45%, 34%)`, `hsl(${coverEnd}, 48%, 48%)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cover}
      >
        {consulted && (
          <View style={[s.consulted, { backgroundColor: consulted.bg }]}>
            <CalendarCheck size={12} color={consulted.color} />
            <Text style={[s.consultedText, { color: consulted.color }]} numberOfLines={1}>
              {consulted.text}
            </Text>
          </View>
        )}
      </LinearGradient>
      <View style={[s.photoRing, { backgroundColor: colors.surface }]}>
        <DoctorAvatar doctor={doctor} size={80} />
      </View>

      <View style={s.body}>
        <View style={[s.row, { justifyContent: "center", gap: 5 }]}>
          <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
            {doctor.name}
          </Text>
          <BadgeCheck size={16} color={colors.teal} />
        </View>
        <Text style={[s.title, { color: colors.textMuted }]} numberOfLines={1}>
          {doctor.title || doctor.specialization}
        </Text>
        <View style={[s.row, { justifyContent: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }]}>
          <Rating value={doctor.rating} count={doctor.reviewCount} />
          <AvailabilityLabel value={doctor.availability} />
        </View>
        {messaging.free && (
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <View style={[s.chip, s.row, { backgroundColor: "#dcfce7", gap: 4 }]}>
              <MessageCircle size={12} color="#15803d" />
              <Text style={[s.chipText, { color: "#15803d" }]}>Free messages</Text>
            </View>
          </View>
        )}
        {!compact && doctor.focusAreas.length > 0 && (
          <View style={s.focus}>
            {doctor.focusAreas.slice(0, 3).map((area) => (
              <Chip key={area} label={area} tone={colors.text} bg={colors.background} />
            ))}
          </View>
        )}
        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <View style={s.row}>
            <Briefcase size={15} color={colors.textMuted} />
            <Text style={[s.footerText, { color: colors.textMuted }]}>{doctor.experienceYears} yrs exp.</Text>
          </View>
          {messaging.consultation ? (
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{fee(doctor.feeGBP).label}</Text>
              {doctor.feeGBP > 0 ? " / consultation" : ""}
            </Text>
          ) : (
            <Text style={[s.footerText, { color: "#15803d", fontWeight: "800" }]}>Free messages only</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** A short status for the small grid card. */
function consultationShort(c: ConsultationTimeline) {
  switch (c.state) {
    case "active":
      return { text: "In progress", bg: "#10b981", color: "#fff" };
    case "upcoming":
      return { text: `Booked · ${format(c.startsAt, "d MMM")}`, bg: "#d13a8b", color: "#fff" };
    case "follow_up":
      return { text: "Free follow-up", bg: "#b08d48", color: "#fff" };
    default:
      return { text: "Consulted", bg: "#ffffff", color: "#18181b" };
  }
}

/**
 * Half-width doctor card for the two-column list on phones: the same cover,
 * photo and details as DoctorCard, trimmed to fit.
 */
export function DoctorGridCard({
  doctor,
  consultation,
  width,
  onPress,
}: {
  doctor: Doctor;
  consultation?: ConsultationTimeline | null;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { fee } = useRegionalPricing();
  const coverEnd = (doctor.hue + 38) % 360;
  const messaging = messagingFor(doctor);
  const consulted = consultation ? consultationShort(consultation) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${doctor.name}, ${doctor.title || doctor.specialization}`}
      style={({ pressed }) => [g.card, { width, backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient
        colors={[`hsl(${doctor.hue}, 45%, 34%)`, `hsl(${coverEnd}, 48%, 48%)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={g.cover}
      >
        {consulted && (
          <View style={[g.badge, { backgroundColor: consulted.bg }]}>
            <Text style={[g.badgeText, { color: consulted.color }]} numberOfLines={1}>
              {consulted.text}
            </Text>
          </View>
        )}
      </LinearGradient>
      <View style={[g.photoRing, { backgroundColor: colors.surface }]}>
        <DoctorAvatar doctor={doctor} size={60} />
      </View>

      <View style={g.body}>
        <View style={[s.row, { justifyContent: "center", gap: 3 }]}>
          <Text style={[g.name, { color: colors.text }]} numberOfLines={1}>
            {doctor.name}
          </Text>
          <BadgeCheck size={13} color={colors.teal} />
        </View>
        <Text style={[g.title, { color: colors.textMuted }]} numberOfLines={1}>
          {doctor.title || doctor.specialization}
        </Text>

        <View style={[s.row, { justifyContent: "center", gap: 3, marginTop: 7 }]}>
          <Star size={12} color="#c69a3c" fill="#c69a3c" />
          <Text style={[g.small, { color: colors.text, fontWeight: "800" }]}>{doctor.rating.toFixed(1)}</Text>
          <Text style={[g.small, { color: colors.textMuted }]}>({doctor.reviewCount})</Text>
        </View>
        <View style={[s.row, { justifyContent: "center", gap: 4, marginTop: 4 }]}>
          <View style={[g.dot, { backgroundColor: AVAILABILITY[doctor.availability].color }]} />
          <Text style={[g.small, { color: AVAILABILITY[doctor.availability].color, fontWeight: "600" }]} numberOfLines={1}>
            {AVAILABILITY[doctor.availability].label}
          </Text>
        </View>

        {messaging.free && messaging.consultation && (
          <View style={[s.row, g.freeRow]}>
            <MessageCircle size={11} color="#15803d" />
            <Text style={g.freeText}>Free messages</Text>
          </View>
        )}
        {/* Pushes the footer to the bottom so cards in a row line up. */}
        <View style={g.spacer} />
        <View style={[g.footer, { borderTopColor: colors.border }]}>
          <View style={[s.row, { gap: 3 }]}>
            <Briefcase size={12} color={colors.textMuted} />
            <Text style={[g.small, { color: colors.textMuted }]}>{doctor.experienceYears} yrs</Text>
          </View>
          {messaging.consultation ? (
            <Text style={[g.fee, { color: colors.text }]} numberOfLines={1}>
              {fee(doctor.feeGBP).label}
            </Text>
          ) : (
            <Text style={[g.fee, { color: "#15803d" }]}>Free</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** What a consultation includes (same list as the webapp). */
export function IncludedList({ colors, accent }: { colors: Colors; accent: string }) {
  const { sessionHours, followUpDays, replyGuaranteeHours } = CONSULTATION_POLICY;
  const items = [
    { Icon: MessageCircle, text: `Private chat, open for ${sessionHours} hours` },
    { Icon: RotateCcw, text: `${followUpDays} days of free follow-up messages` },
    { Icon: ShieldCheck, text: `Full refund if no reply within ${replyGuaranteeHours} hours` },
    { Icon: CalendarDays, text: "Booking confirmed instantly" },
  ];
  return (
    <View style={{ gap: 9, marginTop: 14 }}>
      {items.map(({ Icon, text }) => (
        <View key={text} style={[s.row, { alignItems: "flex-start", gap: 9 }]}>
          <Icon size={16} color={accent} />
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  availability: { fontSize: 12, fontWeight: "600" },
  ratingValue: { fontSize: 13, fontWeight: "800" },
  ratingCount: { fontSize: 13 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: "700" },

  card: { borderWidth: 1, borderRadius: 24, overflow: "hidden", marginBottom: 14 },
  cover: { height: 104 },
  consulted: { position: "absolute", top: 12, left: 12, right: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "92%" },
  consultedText: { fontSize: 11.5, fontWeight: "800", flexShrink: 1 },
  photoRing: { position: "absolute", top: 104 - 44, alignSelf: "center", width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 18, paddingTop: 52, paddingBottom: 16 },
  name: { fontSize: 16, fontWeight: "800", maxWidth: "85%" },
  title: { fontSize: 13, textAlign: "center", marginTop: 3 },
  focus: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  footerText: { fontSize: 13 },
});

const COVER_H = 58;
const g = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  cover: { height: COVER_H },
  badge: { position: "absolute", top: 8, left: 8, maxWidth: "88%", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  photoRing: { position: "absolute", top: COVER_H - 34, alignSelf: "center", width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingHorizontal: 10, paddingTop: 40, paddingBottom: 12 },
  name: { fontSize: 14, fontWeight: "800", flexShrink: 1 },
  title: { fontSize: 11.5, textAlign: "center", marginTop: 2 },
  small: { fontSize: 11.5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
  spacer: { flex: 1, minHeight: 10 },
  fee: { fontSize: 14, fontWeight: "900", flexShrink: 1 },
  freeRow: { justifyContent: "center", gap: 4, marginTop: 7, backgroundColor: "#dcfce7", borderRadius: 999, paddingVertical: 3 },
  freeText: { color: "#15803d", fontSize: 10.5, fontWeight: "700" },
});
