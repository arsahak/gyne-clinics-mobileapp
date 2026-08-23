import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ── Types ─────────────────────────────────────────────────────────────────────
type Doctor = {
  user: { _id: string; name?: string; phone?: string };
  qualifications?: string[];
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
  hospitalName?: string;
  hospitalAddress?: string;
  languages?: string[];
  consultationTypes?: ("online" | "in_person")[];
  availability?: { dayOfWeek: number; startTime: string; endTime: string }[];
  avgRating: number;
  reviewCount: number;
};
type Review = { _id: string; rating: number; comment: string; patient?: { name?: string }; createdAt: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function StarIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={filled ? color : "none"}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
function SmallStar({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

export default function DoctorProfileScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pink = colors.primary;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [starting, setStarting] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const result = await api<{ success: boolean; data: { doctor: Doctor; reviews: Review[] } }>(
          `/api/doctors/${id}`,
          { token: token ?? undefined }
        );
        if (active && result.ok) {
          setDoctor(result.data.data.doctor);
          setReviews(result.data.data.reviews);
        }
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [id, token])
  );

  const startChat = async () => {
    setStarting(true);
    const result = await api<{ success: boolean; data: { _id: string } }>("/api/chats", {
      method: "POST",
      token: token ?? undefined,
      body: { doctorId: id },
    });
    setStarting(false);
    if (!result.ok) { Alert.alert("Couldn't start chat", result.message); return; }
    router.push(`/consultation/${result.data.data._id}`);
  };

  const handleSubmitReview = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    const result = await api("/api/doctor-reviews", {
      method: "POST",
      token: token ?? undefined,
      body: { doctorId: id, rating, comment: comment.trim() },
    });
    setSubmitting(false);

    if (!result.ok) { Alert.alert("Couldn't save review", result.message); return; }

    setReviewOpen(false);
    setComment("");
    setRating(5);
    Alert.alert("Thank you!", "Your review has been saved.");
    // refresh
    const refreshed = await api<{ success: boolean; data: { doctor: Doctor; reviews: Review[] } }>(
      `/api/doctors/${id}`,
      { token: token ?? undefined }
    );
    if (refreshed.ok) {
      setDoctor(refreshed.data.data.doctor);
      setReviews(refreshed.data.data.reviews);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={pink} size="large" />
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <BackIcon color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: colors.textMuted }}>This doctor's profile isn't available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <BackIcon color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Identity */}
        <View style={[s.avatarWrap, { backgroundColor: colors.primaryLight }]}>
          <Text style={{ fontSize: 40 }}>👩‍⚕️</Text>
        </View>
        <Text style={[s.name, { color: colors.text }]}>{doctor.user.name || "Doctor"}</Text>
        <Text style={[s.role, { color: colors.textMuted }]}>
          {doctor.specialization || "Gynecology"}{doctor.experienceYears ? ` · ${doctor.experienceYears} yrs experience` : ""}
        </Text>

        {doctor.reviewCount > 0 && (
          <View style={s.ratingRow}>
            <SmallStar color="#f59e0b" />
            <Text style={[s.ratingText, { color: colors.text }]}>
              {doctor.avgRating.toFixed(1)} ({doctor.reviewCount} review{doctor.reviewCount === 1 ? "" : "s"})
            </Text>
          </View>
        )}

        {/* Info cards */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Consultation</Text>
          <View style={s.infoRow}>
            <Text style={{ color: colors.textMuted }}>Fee</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {doctor.consultationFee ? `£${doctor.consultationFee}/session` : "Not specified"}
            </Text>
          </View>
          {!!doctor.consultationTypes?.length && (
            <View style={s.infoRow}>
              <Text style={{ color: colors.textMuted }}>Type</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {doctor.consultationTypes.map((t) => (t === "online" ? "Online" : "In-person")).join(", ")}
              </Text>
            </View>
          )}
          {!!doctor.languages?.length && (
            <View style={s.infoRow}>
              <Text style={{ color: colors.textMuted }}>Languages</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{doctor.languages.join(", ")}</Text>
            </View>
          )}
        </View>

        {!!doctor.qualifications?.length && (
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Qualifications</Text>
            <Text style={{ color: colors.text, lineHeight: 21 }}>{doctor.qualifications.join(", ")}</Text>
          </View>
        )}

        {(doctor.hospitalName || doctor.hospitalAddress) && (
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Hospital / Clinic</Text>
            {!!doctor.hospitalName && <Text style={{ color: colors.text, fontWeight: "700" }}>{doctor.hospitalName}</Text>}
            {!!doctor.hospitalAddress && <Text style={{ color: colors.textMuted, marginTop: 2 }}>{doctor.hospitalAddress}</Text>}
          </View>
        )}

        {!!doctor.availability?.length && (
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Availability</Text>
            {doctor.availability.map((slot, i) => (
              <View key={i} style={s.infoRow}>
                <Text style={{ color: colors.textMuted }}>{DAYS[slot.dayOfWeek]}</Text>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{slot.startTime} – {slot.endTime}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reviews */}
        <View style={s.reviewsHeader}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Patient Reviews</Text>
          <Pressable onPress={() => setReviewOpen(true)}>
            <Text style={{ color: pink, fontWeight: "700", fontSize: 13 }}>Write a Review</Text>
          </Pressable>
        </View>
        {!reviews.length ? (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20 }}>No reviews yet.</Text>
        ) : (
          reviews.map((r) => (
            <View key={r._id} style={[s.reviewCard, { backgroundColor: colors.surface }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{r.patient?.name || "Patient"}</Text>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SmallStar key={i} color={i < r.rating ? "#f59e0b" : (colors.border as string)} />
                  ))}
                </View>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>{r.comment}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[s.ctaBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable onPress={startChat} disabled={starting} style={[s.ctaBtn, { backgroundColor: pink, opacity: starting ? 0.6 : 1 }]}>
          {starting ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Chat Now</Text>}
        </Pressable>
      </View>

      {/* Write review modal */}
      <Modal visible={reviewOpen} animationType="slide" transparent onRequestClose={() => setReviewOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setReviewOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Rate Your Consultation</Text>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 18 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Pressable key={i} onPress={() => setRating(i + 1)}>
                <StarIcon color="#f59e0b" filled={i < rating} />
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 120, textAlignVertical: "top" }]}
          />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 14 }}>
            Personal contact info is automatically removed from reviews.
          </Text>

          <Pressable
            onPress={handleSubmitReview}
            disabled={!comment.trim() || submitting}
            style={[m.saveBtn, { backgroundColor: pink, opacity: !comment.trim() || submitting ? 0.6 : 1 }]}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Submit Review</Text>}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: 24, paddingBottom: 100, alignItems: "center" },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  role: { fontSize: 14, marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 20 },
  ratingText: { fontSize: 13, fontWeight: "700" },

  card: { width: "100%", borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },

  reviewsHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  reviewCard: { width: "100%", borderRadius: 14, padding: 14, marginBottom: 10 },

  ctaBar: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  ctaBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
