import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";

// The GyneClinics lotus: a common women's wellness motif, drawn in layered
// white so it sits on the brand gradient with no frame. Used on the splash
// (blooming) and the login hero (still).

const VIEW_W = 120;
const VIEW_H = 90;

function Glow() {
  return (
    <>
      <Defs>
        <RadialGradient id="lotusGlow" cx="50%" cy="58%" r="50%">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="60" cy="52" rx="60" ry="38" fill="url(#lotusGlow)" />
    </>
  );
}

function OuterPetals() {
  return (
    <>
      <Path d="M60 68C40 70 22 61 13 45c19-5 38 4 47 23z" fill="#fff" fillOpacity={0.45} />
      <Path d="M60 68c20 2 38-7 47-23-19-5-38 4-47 23z" fill="#fff" fillOpacity={0.45} />
    </>
  );
}

function MiddlePetals() {
  return (
    <>
      <Path d="M60 67C44 61 34 47 34 28c15 3 25 16 26 39z" fill="#fff" fillOpacity={0.72} />
      <Path d="M60 67c16-6 26-20 26-39-15 3-25 16-26 39z" fill="#fff" fillOpacity={0.72} />
    </>
  );
}

function CentrePetal() {
  return (
    <>
      <Path d="M60 10c11 15 14 37 0 57-14-20-11-42 0-57z" fill="#fff" />
      <Path d="M60 24v34" stroke="#d13a8b" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

function Water() {
  return (
    <>
      <Path d="M28 77c10 4 22 6 32 6s22-2 32-6" stroke="#fff" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M44 85c5 1.3 10.5 2 16 2s11-.7 16-2" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
    </>
  );
}

function Sparkles() {
  return (
    <>
      <Path d="M96 12l1.6 4.4L102 18l-4.4 1.6L96 24l-1.6-4.4L90 18l4.4-1.6z" fill="#fff" fillOpacity={0.85} />
      <Path d="M22 22l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" fill="#fff" fillOpacity={0.6} />
    </>
  );
}

/** The full lotus, still. */
export function LotusArt({ width = 150 }: { width?: number }) {
  const height = (width * VIEW_H) / VIEW_W;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} fill="none">
      <Glow />
      <OuterPetals />
      <MiddlePetals />
      <CentrePetal />
      <Water />
      <Sparkles />
    </Svg>
  );
}

/**
 * The lotus opening layer by layer: water, outer, middle, then centre petals
 * rise into place, and the sparkles appear last.
 * `still` shows it fully open at once (for reduced motion).
 */
export function LotusBloom({ width = 190, still = false }: { width?: number; still?: boolean }) {
  const height = (width * VIEW_H) / VIEW_W;
  const layers = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(still ? 1 : 0))).current;

  useEffect(() => {
    if (still) {
      layers.forEach(v => { v.stopAnimation(); v.setValue(1); });
      return;
    }
    Animated.stagger(
      170,
      layers.map(v => Animated.spring(v, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true })),
    ).start();
  }, [layers, still]);

  const layer = (index: number, children: ReactNode, rise = 14) => {
    const v = layers[index]!;
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: v,
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            ],
          },
        ]}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} fill="none">
          {children}
        </Svg>
      </Animated.View>
    );
  };

  return (
    <View style={{ width, height }}>
      {layer(0, <Glow />, 0)}
      {layer(1, <Water />, 6)}
      {layer(2, <OuterPetals />)}
      {layer(3, <MiddlePetals />)}
      {layer(4, <CentrePetal />, 20)}
      {layer(5, <Sparkles />, 0)}
    </View>
  );
}
