import { BRAND_GRADIENT } from "@/constants/brand";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { BrandIcon } from "@/components/brand/Logo";

// Launch screen in the same brand gradient as the login hero.
// The icon settles in, the name and promise follow, and four dots below pulse
// in turn — one for each phase of the cycle the app helps track.

const SHOW_MS = 2600;
const PHASES = ["Period", "Follicular", "Ovulation", "Luteal"];

interface Props { onFinish: () => void; }

export function AppSplashScreen({ onFinish }: Props) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  // Keep the latest callback without restarting the timers.
  const finish = useRef(onFinish);
  finish.current = onFinish;

  const screen = useRef(new Animated.Value(1)).current;
  const logo   = useRef(new Animated.Value(0)).current;
  const text   = useRef(new Animated.Value(0)).current;
  const footer = useRef(new Animated.Value(0)).current;
  const dots   = useRef(PHASES.map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      logo.setValue(1);
      text.setValue(1);
      footer.setValue(1);
      const t = setTimeout(() => finish.current(), 900);
      return () => clearTimeout(t);
    }

    const ease = Easing.out(Easing.cubic);
    Animated.spring(logo, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(650),
      Animated.timing(text, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(footer, { toValue: 1, duration: 480, easing: ease, useNativeDriver: true }),
    ]).start();

    // Cycle dots: each phase lights up in turn.
    const pulse = Animated.loop(
      Animated.stagger(
        180,
        dots.map(d =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0.35, duration: 380, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    const startDots = setTimeout(() => pulse.start(), 900);

    const done = setTimeout(() => {
      Animated.timing(screen, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true })
        .start(() => finish.current());
    }, SHOW_MS);

    return () => {
      clearTimeout(startDots);
      clearTimeout(done);
      pulse.stop();
    };
  }, [reduceMotion, dots, footer, logo, screen, text]);

  const rise = (v: Animated.Value, from = 14) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <Animated.View
      style={[s.wrap, { opacity: screen }]}
      accessible
      accessibilityLabel="GyneX. Women's health, in your pocket. Loading"
    >
      <StatusBar style="light" />
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, { top: -90, right: -80, width: 280, height: 280 }]} pointerEvents="none" />
      <View style={[s.glow, { bottom: 120, left: -110, width: 240, height: 240, opacity: 0.55 }]} pointerEvents="none" />

      <View style={s.center}>
        <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }] }}>
          <BrandIcon height={130} tone="white" animated />
        </Animated.View>

        <Animated.View style={[s.textBlock, rise(text)]}>
          <Text style={s.appName}>GyneX</Text>
          <Text style={s.tagline}>Women's health, in your pocket.</Text>
        </Animated.View>

        <Animated.View style={[s.dots, { opacity: footer }]}>
          {dots.map((d, i) => (
            <Animated.View
              key={PHASES[i]}
              style={[s.dot, { opacity: d, transform: [{ scale: d.interpolate({ inputRange: [0.35, 1], outputRange: [0.8, 1.15] }) }] }]}
            />
          ))}
        </Animated.View>
      </View>

      <Animated.View style={[s.footer, rise(footer, 10)]}>
        <ShieldCheck size={14} color="rgba(255,255,255,0.85)" />
        <Text style={s.footerText}>Private · Secure · Doctor-led care</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: "hidden",
  },

  glow: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 30 },

  textBlock: { alignItems: "center", marginTop: 22 },
  appName: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "500", marginTop: 4, letterSpacing: 0.1 },

  dots: { flexDirection: "row", gap: 10, marginTop: 34 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },

  footer: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
});
