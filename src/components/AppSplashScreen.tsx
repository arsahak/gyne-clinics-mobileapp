import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ── Brand tokens ─────────────────────────────────────────────────────────────
const BG      = "#ffffff";   // clean white background
const PINK    = "#d13a8b";   // primary brand color
const PINK_LT = "#f472b6";   // lighter pink for glow/ring
const WHITE   = "#ffffff";

interface Props { onFinish: () => void; }

export function AppSplashScreen({ onFinish }: Props) {
  const screenOpacity = useRef(new Animated.Value(0)).current;

  // Logo
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Soft glow ring
  const ringScale   = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Text group
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(14)).current;

  // Footer
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerY       = useRef(new Animated.Value(10)).current;

  // Progress bar
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade screen in immediately
    Animated.timing(screenOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // Logo spring in
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Soft glow ring expands
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 1.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0,   duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();

    // Text slides up
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textY,       { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Footer slides up
    Animated.sequence([
      Animated.delay(550),
      Animated.parallel([
        Animated.timing(footerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(footerY,       { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    // Progress bar (JS driver — width)
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(barWidth, { toValue: 1, duration: 2300, useNativeDriver: false }),
    ]).start();

    // Fade out and finish
    const t = setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => onFinish());
    }, 3200);

    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[s.wrap, { opacity: screenOpacity }]}>
      <StatusBar style="dark" backgroundColor={BG} translucent={false} />

      {/* ── Centre cluster ── */}
      <View style={s.center}>

        {/* Glow ring — fades out as it grows */}
        <Animated.View style={[s.ring, {
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }]} />

        {/* Logo container */}
        <Animated.View style={[s.logoWrap, {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }]}>
          <Image
            source={require("../../assets/logo/gyneclinics-logo.png")}
            style={s.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App name + subtitle */}
        <Animated.View style={[s.textBlock, {
          opacity: textOpacity,
          transform: [{ translateY: textY }],
        }]}>
          <Text style={s.appName}>GyneClinics</Text>
          <Text style={s.appSub}>Expert Women's Care</Text>
        </Animated.View>

        {/* Loading bar */}
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, {
            width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }]} />
        </View>

      </View>

      {/* ── Footer — Facebook "from Meta" style ── */}
      <Animated.View style={[s.footer, {
        opacity: footerOpacity,
        transform: [{ translateY: footerY }],
      }]}>
        <Image
          source={require("../../assets/logo/gyneclinics-logo.png")}
          style={s.footerLogo}
          resizeMode="contain"
        />
        <Text style={s.footerFrom}>from</Text>
        <Text style={s.footerName}>GyneClinics</Text>
      </Animated.View>

    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const LOGO_SIZE = 120;

const s = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },

  // Glow ring
  ring: {
    position: "absolute",
    width: LOGO_SIZE + 20,
    height: LOGO_SIZE + 20,
    borderRadius: (LOGO_SIZE + 20) / 2,
    backgroundColor: PINK,
  },

  // Logo
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 14,
  },
  logoImg: { width: LOGO_SIZE - 28, height: LOGO_SIZE - 28, resizeMode: "contain", tintColor: WHITE },

  // Text block
  textBlock: {
    alignItems: "center",
    marginTop: 26,
  },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: 0.4,
  },
  appSub: {
    fontSize: 12,
    fontWeight: "600",
    color: PINK,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginTop: 6,
    opacity: 0.85,
  },

  // Progress bar
  barTrack: {
    width: 160,
    height: 3,
    borderRadius: 2,
    backgroundColor: `${PINK}22`,
    marginTop: 42,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: PINK,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 44,
    alignItems: "center",
    gap: 2,
  },
  footerLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    opacity: 0.6,
    marginBottom: 2,
  },
  footerFrom: {
    fontSize: 11,
    color: "#999999",
    letterSpacing: 0.3,
  },
  footerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333333",
    letterSpacing: 0.2,
  },
});
