import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type NavIconName = "home" | "learn" | "help" | "insights" | "settings" | "chat" | "patients" | "availability";

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

    /* ── Insights (bar chart) ────────────────────────────────────────── */
    case "insights":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4"  y="12" width="4" height="8" rx="1" stroke={color} strokeWidth={sw} fill={filled ? color : "none"} />
          <Rect x="10" y="7"  width="4" height="13" rx="1" stroke={color} strokeWidth={sw} fill={filled ? color : "none"} />
          <Rect x="16" y="3"  width="4" height="17" rx="1" stroke={color} strokeWidth={sw} fill={filled ? color : "none"} />
        </Svg>
      );

    /* ── Chat (rounded bubble with tail) ───────────────────────────── */
    case "chat":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3C7.03 3 3 6.58 3 11c0 2.4 1.1 4.57 2.87 6.1L5 21l4.27-1.53C10.39 19.8 11.18 20 12 20c4.97 0 9-3.58 9-9s-4.03-8-9-8z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          <Circle cx="9"  cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
          <Circle cx="12" cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
          <Circle cx="15" cy="11" r={filled ? 1.1 : 0.9} fill={filled ? "#fff" : color} />
        </Svg>
      );

    /* ── Patients (two people) ───────────────────────────────────────── */
    case "patients":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={sw} fill={filled ? color : "none"} />
          <Path
            d="M2.5 21v-1.5A4.5 4.5 0 0 1 7 15h4a4.5 4.5 0 0 1 4.5 4.5V21"
            stroke={filled ? color : color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color + "33" : "none"}
          />
          <Path
            d="M16 8.5a2.7 2.7 0 1 0 0-5.4"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <Path
            d="M17.5 15.2c1.83.34 3.5 1.4 3.5 3.3V21"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    /* ── Availability (calendar with check) ──────────────────────────── */
    case "availability":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
            fill={filled ? color + "22" : "none"}
          />
          <Path d="M4 9h16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M8 3v3M16 3v3" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path
            d="M8.5 13.5l2 2 4-4.2"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
