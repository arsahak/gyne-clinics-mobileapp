import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { NavIcon, NavIconName } from "./NavIcon";

// ── Config ────────────────────────────────────────────────────────────────────
const BAR_HEIGHT  = 60;
const TAB_COUNT   = 5;
const LINE_WIDTH  = 28;
const LINE_HEIGHT = 3;

const TAB_META: Record<string, { icon: NavIconName; label: string }> = {
  index:    { icon: "home",     label: "Home"     },
  learn:    { icon: "learn",    label: "Learn"    },
  help:     { icon: "help",     label: "Help"     },
  chat:     { icon: "chat",     label: "Chat"     },
  settings: { icon: "settings", label: "Settings" },
};

// ── Single tab item ───────────────────────────────────────────────────────────
interface TabItemProps {
  icon:          NavIconName;
  label:         string;
  isActive:      boolean;
  activeColor:   string;
  inactiveColor: string;
  onPress:       () => void;
}

function TabItem({ icon, label, isActive, activeColor, inactiveColor, onPress }: TabItemProps) {
  const iconScale    = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0.55)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.spring(iconScale, { toValue: 1.22, friction: 4, tension: 140, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1,    friction: 5, tension: 80,  useNativeDriver: true }),
      ]).start();
    }
    Animated.timing(labelOpacity, {
      toValue: isActive ? 1 : 0.45,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const color = isActive ? activeColor : inactiveColor;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <NavIcon name={icon} color={color} size={24} filled={isActive} />
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color,
            fontWeight: isActive ? "700" : "500",
            opacity: labelOpacity,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────
export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets      = useSafeAreaInsets();
  const ACTIVE_COLOR = colors.primary; // brand teal, adapts light/dark

  // Sliding indicator — moves to the active tab
  const screenWidth = Dimensions.get("window").width;
  const tabWidth    = screenWidth / TAB_COUNT;
  const slideX      = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: state.index * tabWidth,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth]);

  // Indicator X: center it within the tab
  const indicatorOffset = (tabWidth - LINE_WIDTH) / 2;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* ── Sliding top line ── */}
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: ACTIVE_COLOR,
            transform: [
              {
                translateX: Animated.add(
                  slideX,
                  new Animated.Value(indicatorOffset)
                ),
              },
            ],
          },
        ]}
      />

      {/* ── Tab items ── */}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const meta     = TAB_META[route.name] ?? { icon: "home" as NavIconName, label: route.name };
          const isActive = state.index === index;

          return (
            <TabItem
              key={route.key}
              icon={meta.icon}
              label={meta.label}
              isActive={isActive}
              activeColor={ACTIVE_COLOR}
              inactiveColor={colors.textMuted}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position:    "absolute",
    bottom:       0,
    left:         0,
    right:        0,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor:  "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation:    12,
  },
  indicator: {
    position:     "absolute",
    top:           0,
    left:          0,
    width:         LINE_WIDTH,
    height:        LINE_HEIGHT,
    borderRadius:  LINE_HEIGHT / 2,
  },
  row: {
    flexDirection:  "row",
    height:          BAR_HEIGHT,
  },
  item: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:             3,
  },
  label: {
    fontSize:      10,
    letterSpacing: 0.1,
  },
});
