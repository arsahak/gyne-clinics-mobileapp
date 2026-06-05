import { TextStyle } from "react-native";

export const typography = {
  h1: { fontSize: 32, fontWeight: "700", lineHeight: 38 },
  h2: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  label: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
