import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, ThemeColors } from "./colors";
import { radius, spacing } from "./spacing";
import { typography } from "./typography";

type ThemeMode = "light" | "dark" | "system";

type Theme = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const handleSetMode = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const value = useMemo<Theme>(
    () => ({
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      setMode: handleSetMode,
    }),
    [mode, isDark, handleSetMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
