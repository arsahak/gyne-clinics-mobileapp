import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type NavIconName = "home" | "learn" | "help" | "chat" | "settings";

interface Props {
  name:    NavIconName;
  color:   string;
  size?:   number;
  filled?: boolean;
}

export function NavIcon({ name, color, size = 24, filled = false }: Props) {
  const sw = filled ? 2.4 : 1.8;

  switch (name) {

    /* ── Home ─────────────────────────────────────────────────────────── */
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* roof / walls */}
          <Path
            d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          {/* door — always transparent so roof fill doesn't cover it */}
          <Path
            d="M9 21v-6a3 3 0 0 1 6 0v6"
            stroke={filled ? "#fff" : color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );

    /* ── Learn (open book) ───────────────────────────────────────────── */
    case "learn":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color + "55" : "none"}
          />
          <Path
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color + "55" : "none"}
          />
        </Svg>
      );

    /* ── Help (speech bubble with ?) ────────────────────────────────── */
    case "help":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12" cy="12" r="10"
            stroke={color} strokeWidth={sw}
            fill={filled ? color : "none"}
          />
          <Path
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
            stroke={filled ? "#fff" : color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Circle cx="12" cy="17" r="0.7" fill={filled ? "#fff" : color} />
        </Svg>
      );

    /* ── Chat (rounded bubble with tail) ───────────────────────────── */
    case "chat":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* rounded bubble */}
          <Path
            d="M12 3C7.03 3 3 6.58 3 11c0 2.4 1.1 4.57 2.87 6.1L5 21l4.27-1.53C10.39 19.8 11.18 20 12 20c4.97 0 9-3.58 9-9s-4.03-8-9-8z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          {/* three dots */}
          <Circle cx="9"  cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
          <Circle cx="12" cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
          <Circle cx="15" cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
        </Svg>
      );

    /* ── Settings (sliders — fills perfectly) ───────────────────────── */
    case "settings":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* top track */}
          <Path d="M4 7h16"  stroke={color} strokeWidth={sw} strokeLinecap="round" />
          {/* top knob */}
          <Circle
            cx="9" cy="7" r="2.8"
            stroke={color} strokeWidth={sw}
            fill={filled ? color : "none"}
          />
          {/* bottom track */}
          <Path d="M4 17h16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          {/* bottom knob */}
          <Circle
            cx="15" cy="17" r="2.8"
            stroke={color} strokeWidth={sw}
            fill={filled ? color : "none"}
          />
        </Svg>
      );
  }
}
