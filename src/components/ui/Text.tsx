import { memo } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from "react-native";
import { useTheme } from "@/theme";
import type { TypographyVariant } from "@/theme/typography";

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: "text" | "textMuted" | "primary" | "primaryText" | "danger" | "success";
  align?: TextStyle["textAlign"];
};

function TextComponent({
  variant = "body",
  color = "text",
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        theme.typography[variant],
        { color: theme.colors[color] },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

export const Text = memo(TextComponent);
