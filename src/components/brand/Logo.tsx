import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Image } from "react-native";

// The Gynex figure (client artwork, without the name). "white" shows it in
// white on the brand gradient; "color" is the original teal.

const ICON_SOURCE = require("../../../assets/logo/gynex-icon.png");
const ICON_RATIO = 480 / 307; // height / width of the image
const SWING_MS = 1300;

/**
 * The Gynex figure. With `animated`, it dances gently: sways from its feet,
 * lifting a little at the middle of each swing. Still when the phone asks
 * for reduced motion.
 */
export function BrandIcon({
  height = 96,
  tone = "color",
  animated = false,
}: {
  height?: number;
  tone?: "color" | "white";
  animated?: boolean;
}) {
  const width = height / ICON_RATIO;
  // -1 = leaning left, 0 = upright, 1 = leaning right
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce || cancelled) return;
        const ease = Easing.inOut(Easing.sin);
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(t, { toValue: 1, duration: SWING_MS, easing: ease, useNativeDriver: true }),
            Animated.timing(t, { toValue: -1, duration: SWING_MS * 2, easing: ease, useNativeDriver: true }),
            Animated.timing(t, { toValue: 0, duration: SWING_MS, easing: ease, useNativeDriver: true }),
          ]),
        );
        loop.start();
      });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [animated, t]);

  const image = (
    <Image
      source={ICON_SOURCE}
      accessibilityRole="image"
      accessibilityLabel="Gynex"
      resizeMode="contain"
      style={{ height, width, tintColor: tone === "white" ? "#fff" : undefined }}
    />
  );
  if (!animated) return image;

  return (
    <Animated.View
      style={{
        width,
        height,
        transform: [
          // Rotate around the feet rather than the middle.
          { translateY: height / 2 },
          { rotate: t.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] }) },
          { translateY: -height / 2 },
          // Lift a little while passing upright.
          { translateY: t.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, -6, 0] }) },
          { scale: t.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 1.04, 1] }) },
        ],
      }}
    >
      {image}
    </Animated.View>
  );
}
