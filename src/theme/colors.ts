// ============================================================
//  Gynex Brand Palette — the client logo's purple and teal
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

  // ── Brand purple (#804898): main colour for patients and doctors ──
  purple50:  "#f9f6fa",
  purple100: "#f0e9f3",
  purple200: "#dfd1e5",
  purple300: "#c6add1",
  purple400: "#a67fb7",
  purple500: "#804898", // Base
  purple600: "#6c3c80",
  purple700: "#573167",
  purple800: "#452752",
  purple900: "#361e40",
  purple950: "#24142b",

  // ── Brand teal (#207898): second brand colour ──
  teal50:  "#f4f8fa",
  teal100: "#e4eff3",
  teal200: "#c7dde5",
  teal300: "#9bc2d1",
  teal400: "#63a0b7",
  teal500: "#207898", // Base
  teal600: "#1b6580",
  teal700: "#165267",
  teal800: "#114152",
  teal900: "#0d3240",
  teal950: "#09222b",

  // Semantic
  red500:   "#ef4444",
  green500: "#10b981",
  amber500: "#f59e0b",
} as const;

// ── Token type ──────────────────────────────────────────────────────────────
// primary   = Purple #804898  ← MAIN brand colour (patients and doctors)
// secondary = Teal   #207898  ← second brand colour
// teal      = Teal   #207898  ← supporting UI (ovulation, badges)
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  // Primary — Purple #804898
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryText: string;
  // Secondary — Teal #207898
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryText: string;
  // Teal — #207898
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

  // Primary = Purple
  primary:      palette.purple500,
  primaryLight: palette.purple100,
  primaryDark:  palette.purple700,
  primaryText:  palette.white,

  // Secondary = Teal
  secondary:      palette.teal500,
  secondaryLight: palette.teal100,
  secondaryDark:  palette.teal700,
  secondaryText:  palette.white,

  // Teal
  teal:      palette.teal500,
  tealLight: palette.teal100,
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

  // Primary = Purple (lighter on dark)
  primary:      palette.purple400,
  primaryLight: "#2a1d30",
  primaryDark:  palette.purple200,
  primaryText:  palette.white,

  // Secondary = Teal
  secondary:      palette.teal400,
  secondaryLight: "#16303a",
  secondaryDark:  palette.teal200,
  secondaryText:  palette.white,

  // Teal
  teal:      palette.teal400,
  tealLight: "#16303a",
  tealText:  palette.teal950,

  danger:  palette.red500,
  success: palette.green500,
  warning: palette.amber500,
};
