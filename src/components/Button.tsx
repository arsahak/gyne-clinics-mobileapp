import { memo } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

function ButtonComponent({
  label,
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  leftIcon,
  rightIcon,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  const heights: Record<Size, number> = { sm: 36, md: 44, lg: 52 };
  const paddingsX: Record<Size, number> = { sm: 12, md: 16, lg: 20 };

  const bg: Record<Variant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surface,
    ghost: "transparent",
    danger: theme.colors.danger,
  };

  const fg: Record<Variant, "primaryText" | "text" | "primary"> = {
    primary: "primaryText",
    secondary: "text",
    ghost: "primary",
    danger: "primaryText",
  };

  const borderColor =
    variant === "secondary" ? theme.colors.border : "transparent";

  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: paddingsX[size],
          borderRadius: theme.radius.md,
          backgroundColor: bg[variant],
          borderColor,
          borderWidth: variant === "secondary" ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
      ]}
      android_ripple={
        variant === "primary"
          ? { color: "rgba(255,255,255,0.15)", borderless: false }
          : { color: theme.colors.border, borderless: false }
      }
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger"
              ? theme.colors.primaryText
              : theme.colors.primary
          }
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text variant="bodyBold" color={fg[variant]}>
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: { marginHorizontal: 0 },
});

export const Button = memo(ButtonComponent);
