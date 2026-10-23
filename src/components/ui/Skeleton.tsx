import { type ReactNode, useEffect } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type DimensionValue,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";

// Loading placeholders shaped like the content they stand in for. Every
// skeleton on screen pulses together from one shared animation (still when
// the phone asks for reduced motion).

const pulse = new Animated.Value(1);
let started = false;

function startPulse() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .catch(() => false)
    .then((reduce) => {
      if (reduce) return;
      const ease = Easing.inOut(Easing.ease);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.45, duration: 750, easing: ease, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 750, easing: ease, useNativeDriver: true }),
        ]),
      ).start();
    });
}

function useSkeletonColors() {
  const { colors, isDark } = useTheme();
  return {
    fill: isDark ? "#2c2c2e" : "#ececef",
    card: colors.surface,
    border: colors.border,
  };
}

/** One pulsing placeholder block. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { fill } = useSkeletonColors();
  useEffect(startPulse, []);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: fill, opacity: pulse }, style]}
    />
  );
}

/** A few lines of text, the last one shorter. */
export function SkeletonText({ lines = 3, lineHeight = 12, gap = 9, lastWidth = "60%" }: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastWidth?: DimensionValue;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? lastWidth : "100%"} />
      ))}
    </View>
  );
}

/** A card with the usual surface and border. */
function SkeletonCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { card, border } = useSkeletonColors();
  return <View style={[s.card, { backgroundColor: card, borderColor: border }, style]}>{children}</View>;
}

/** Shown to screen readers while a screen loads. */
function Loading({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessible accessibilityRole="progressbar" accessibilityLabel="Loading">
      {children}
    </View>
  );
}

// ── Screen-shaped skeletons ──────────────────────────────────────────────────

/** Rows with an avatar and two lines: messages, patients, consultations. */
export function ListSkeleton({ rows = 6, padded = true }: { rows?: number; padded?: boolean }) {
  return (
    <Loading style={[padded && s.pad, { gap: 12 }]}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} style={s.row}>
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="80%" height={11} />
          </View>
          <Skeleton width={38} height={11} />
        </SkeletonCard>
      ))}
    </Loading>
  );
}

/** Two-column doctor cards (three on wide screens), as on Get help. */
export function DoctorGridSkeleton({ count = 4, horizontalPadding = 20, gap = 12 }: { count?: number; horizontalPadding?: number; gap?: number }) {
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);
  return (
    <Loading style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} style={{ width: cardWidth, padding: 0, overflow: "hidden" }}>
          <Skeleton height={58} radius={0} />
          <View style={{ alignItems: "center", marginTop: -30 }}>
            <Skeleton width={60} height={60} radius={30} style={s.ring} />
          </View>
          <View style={{ alignItems: "center", gap: 7, padding: 12, paddingTop: 10 }}>
            <Skeleton width="80%" height={13} />
            <Skeleton width="60%" height={10} />
            <Skeleton width="45%" height={10} />
            <Skeleton width="100%" height={1} style={{ marginTop: 6 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <Skeleton width={36} height={11} />
              <Skeleton width={30} height={13} />
            </View>
          </View>
        </SkeletonCard>
      ))}
    </Loading>
  );
}

/** A doctor's profile: cover, photo, name, three facts and two cards. */
export function DoctorProfileSkeleton() {
  return (
    <Loading style={s.pad}>
      <SkeletonCard style={{ padding: 0, overflow: "hidden" }}>
        <Skeleton height={110} radius={0} />
        <View style={{ alignItems: "center", marginTop: -44 }}>
          <Skeleton width={88} height={88} radius={44} style={s.ring} />
        </View>
        <View style={{ alignItems: "center", gap: 8, padding: 16 }}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="40%" height={12} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, width: "100%" }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={62} radius={14} style={{ flex: 1 }} />
            ))}
          </View>
        </View>
      </SkeletonCard>
      <SkeletonCard style={{ marginTop: 14, gap: 12 }}>
        <Skeleton width={90} height={11} />
        <Skeleton width={80} height={28} />
        <SkeletonText lines={4} />
        <Skeleton height={50} radius={16} style={{ marginTop: 6 }} />
      </SkeletonCard>
      <SkeletonCard style={{ marginTop: 14, gap: 12 }}>
        <Skeleton width={70} height={16} />
        <SkeletonText lines={4} />
      </SkeletonCard>
    </Loading>
  );
}

/** Booking: doctor summary, the three steps and the first step's options. */
export function BookingSkeleton() {
  return (
    <Loading style={s.pad}>
      <SkeletonCard style={s.row}>
        <Skeleton width={48} height={48} radius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="35%" height={11} />
        </View>
        <Skeleton width={46} height={22} />
      </SkeletonCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Skeleton width={26} height={26} radius={13} />
            <Skeleton width="55%" height={11} />
          </View>
        ))}
      </View>
      <SkeletonCard style={{ gap: 14 }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="90%" height={11} />
        <Skeleton height={64} radius={16} />
        <Skeleton height={64} radius={16} />
        <Skeleton height={50} radius={16} style={{ marginTop: 4 }} />
      </SkeletonCard>
    </Loading>
  );
}

/** An article: cover, category, title, byline and paragraphs. */
export function ArticleSkeleton() {
  return (
    <Loading style={s.pad}>
      <Skeleton height={190} radius={20} />
      <Skeleton width={90} height={22} radius={11} style={{ marginTop: 18 }} />
      <View style={{ gap: 10, marginTop: 14 }}>
        <Skeleton width="92%" height={22} />
        <Skeleton width="70%" height={22} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Skeleton width={32} height={32} radius={16} />
        <Skeleton width="40%" height={11} />
      </View>
      <View style={{ gap: 18, marginTop: 24 }}>
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
        <SkeletonText lines={4} lastWidth="40%" />
      </View>
    </Loading>
  );
}

/** A conversation: message bubbles on both sides. */
export function ChatSkeleton() {
  const bubbles: { mine: boolean; width: DimensionValue; height: number }[] = [
    { mine: false, width: "62%", height: 44 },
    { mine: true, width: "48%", height: 38 },
    { mine: false, width: "70%", height: 62 },
    { mine: true, width: "55%", height: 44 },
    { mine: false, width: "40%", height: 38 },
    { mine: true, width: "66%", height: 62 },
  ];
  return (
    <Loading style={[s.pad, { gap: 12, paddingTop: 16 }]}>
      <Skeleton width={110} height={20} radius={10} style={{ alignSelf: "center", marginBottom: 6 }} />
      {bubbles.map((b, i) => (
        <Skeleton
          key={i}
          width={b.width}
          height={b.height}
          radius={18}
          style={{ alignSelf: b.mine ? "flex-end" : "flex-start" }}
        />
      ))}
    </Loading>
  );
}

/** A profile form: photo and labelled fields. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Loading style={s.pad}>
      <View style={{ alignItems: "center", gap: 10, marginBottom: 22 }}>
        <Skeleton width={96} height={96} radius={48} />
        <Skeleton width={110} height={12} />
      </View>
      <SkeletonCard style={{ gap: 16 }}>
        {Array.from({ length: fields }, (_, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Skeleton width={i % 2 ? 90 : 120} height={11} />
            <Skeleton height={48} radius={14} />
          </View>
        ))}
      </SkeletonCard>
      <Skeleton height={52} radius={16} style={{ marginTop: 18 }} />
    </Loading>
  );
}

/** The doctor's home: greeting, the day-at-a-glance card and two lists. */
export function DoctorHomeSkeleton() {
  return (
    <Loading style={[s.pad, { paddingTop: 12 }]}>
      <View style={[s.row, { marginBottom: 16 }]}>
        <Skeleton width={48} height={48} radius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="35%" height={11} />
          <Skeleton width="50%" height={16} />
        </View>
        <Skeleton width={40} height={40} radius={20} />
      </View>
      <Skeleton height={190} radius={22} />
      {[0, 1].map((section) => (
        <View key={section} style={{ marginTop: 22, gap: 12 }}>
          <Skeleton width="45%" height={16} />
          {[0, 1].map((row) => (
            <SkeletonCard key={row} style={s.row}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="50%" height={13} />
                <Skeleton width="70%" height={11} />
              </View>
            </SkeletonCard>
          ))}
        </View>
      ))}
    </Loading>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  ring: { borderWidth: 4, borderColor: "transparent" },
});
