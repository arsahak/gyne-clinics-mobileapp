// ============================================================
//  GyneClinics Brand Palette — matches website globals.css
// ============================================================

export const palette = {
  white: "#FFFFFF",
  black: "#000000",

  // Neutrals
  zinc50:  "#FAFAFA",
  zinc100: "#F4F4F5",
  zinc200: "#E4E4E7",
  zinc300: "#D4D4D8",
  zinc400: "#A1A1AA",
  zinc500: "#71717A",
  zinc600: "#52525B",
  zinc700: "#3F3F46",
  zinc800: "#27272A",
  zinc900: "#18181B",
  zinc950: "#09090B",

  // ── Primary: Teal/Cyan (#217580) ──
  primary50:  "#effefc",
  primary100: "#cff9f6",
  primary200: "#a0f0eb",
  primary300: "#68e2dd",
  primary400: "#34cac6",
  primary500: "#217580", // Base
  primary600: "#1a5d66",
  primary700: "#164b52",
  primary800: "#143e44",
  primary900: "#133439",
  primary950: "#082125",

  // ── Secondary: Purple/Mauve (#834D8B) ──
  secondary50:  "#fbf6fd",
  secondary100: "#f5ebfa",
  secondary200: "#ebd6f4",
  secondary300: "#debceb",
  secondary400: "#cc9bdf",
  secondary500: "#834d8b", // Base
  secondary600: "#6d3a73",
  secondary700: "#5a2e5e",
  secondary800: "#4b264d",
  secondary900: "#3e223f",
  secondary950: "#29102a",

  // ── Accent: Pink/Magenta (#D13A8B) ──
  accent50:  "#fdf2f9",
  accent100: "#fce7f5",
  accent200: "#fad0eb",
  accent300: "#f7abd9",
  accent400: "#f27bc1",
  accent500: "#d13a8b", // Base
  accent600: "#b0266e",
  accent700: "#8e1d56",
  accent800: "#761b49",
  accent900: "#621a3f",
  accent950: "#3d0a23",

  // Semantic
  red500:   "#ef4444",
  green500: "#10b981",
  amber500: "#f59e0b",
} as const;

// ── Token type ──────────────────────────────────────────────────────────────
// primary   = Pink/Magenta #d13a8b  ← MAIN brand colour
// secondary = Purple       #834d8b
// teal      = Teal         #217580  ← supporting colour
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  // Primary — Pink #d13a8b
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryText: string;
  // Secondary — Purple #834d8b
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryText: string;
  // Teal — supporting #217580
  teal: string;
  tealLight: string;
  tealText: string;
  // Semantic
  danger: string;
  success: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  background:      palette.white,
  surface:         palette.zinc50,
  surfaceElevated: palette.white,
  border:          palette.zinc200,
  text:            palette.zinc900,
  textMuted:       palette.zinc500,

  // 🩷 Primary = Pink
  primary:      palette.accent500,    // #d13a8b
  primaryLight: palette.accent100,    // #fce7f5
  primaryDark:  palette.accent700,    // #8e1d56
  primaryText:  palette.white,

  // 💜 Secondary = Purple
  secondary:      palette.secondary500,
  secondaryLight: palette.secondary100,
  secondaryDark:  palette.secondary700,
  secondaryText:  palette.white,

  // 🩵 Teal = supporting
  teal:      palette.primary500,      // #217580
  tealLight: palette.primary100,      // #cff9f6
  tealText:  palette.white,

  danger:  palette.red500,
  success: palette.green500,
  warning: palette.amber500,
};

export const darkColors: ThemeColors = {
  background:      "#121212",
  surface:         "#1e1e1e",
  surfaceElevated: "#252525",
  border:          "#2e2e2e",
  text:            palette.zinc50,
  textMuted:       palette.zinc400,

  // 🩷 Primary = Pink (slightly lighter on dark)
  primary:      palette.accent400,    // #f27bc1
  primaryLight: "#2e0e1e",
  primaryDark:  palette.accent200,
  primaryText:  palette.white,

  // 💜 Secondary = Purple
  secondary:      palette.secondary400,
  secondaryLight: "#2a1a2e",
  secondaryDark:  palette.secondary200,
  secondaryText:  palette.white,

  // 🩵 Teal
  teal:      palette.primary400,      // #34cac6
  tealLight: "#1a3a3e",
  tealText:  palette.primary950,

  danger:  palette.red500,
  success: palette.green500,
  warning: palette.amber500,
};
