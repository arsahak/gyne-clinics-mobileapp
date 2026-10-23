import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

/**
 * The current cycle as a ring: period, fertile window, ovulation and today
 * (same drawing as the webapp's CycleRing). Colours suit a dark or brand
 * background; pass others for a light card.
 */
export function CycleRing({
  cycleLength,
  periodLength,
  ovulationDay,
  cycleDay,
  size = 150,
  track = "rgba(255,255,255,0.22)",
  period = "#ffffff",
  fertile = "#c7dde5",
  ovulation = "#e9d5ff",
  marker = "#ffffff",
  children,
}: {
  cycleLength: number;
  periodLength: number;
  ovulationDay: number;
  cycleDay: number;
  size?: number;
  track?: string;
  period?: string;
  fertile?: string;
  ovulation?: string;
  marker?: string;
  children?: ReactNode;
}) {
  const stroke = size * 0.085;
  const r = (size - stroke) / 2 - 3;
  const c = 2 * Math.PI * r;
  const gap = 2.5;
  const center = size / 2;
  const seg = (fromDay: number, toDay: number) => {
    const start = ((fromDay - 1) / cycleLength) * c;
    const length = Math.max(0, ((toDay - fromDay + 1) / cycleLength) * c - gap);
    return { strokeDasharray: `${length} ${c}`, strokeDashoffset: -start };
  };
  const at = (day: number) => {
    const angle = ((day - 0.5) / cycleLength) * 2 * Math.PI - Math.PI / 2;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const today = at(Math.min(Math.max(cycleDay, 1), cycleLength));
  const ov = at(ovulationDay);

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Cycle day ${cycleDay} of ${cycleLength}`}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={r} stroke={track} strokeWidth={stroke} fill="none" />
          <Circle cx={center} cy={center} r={r} stroke={period} strokeWidth={stroke} strokeLinecap="round" fill="none" {...seg(1, periodLength)} />
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={fertile}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
            {...seg(Math.max(periodLength + 1, ovulationDay - 5), Math.min(cycleLength, ovulationDay + 1))}
          />
        </G>
        <Circle cx={ov.x} cy={ov.y} r={stroke / 2 - 1} fill={ovulation} />
        <Circle cx={today.x} cy={today.y} r={stroke / 2 + 3} fill="#804898" stroke={marker} strokeWidth={3} />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}
