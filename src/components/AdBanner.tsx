import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

type Placement = "patient_home" | "learn_feed" | "doctor_home" | "help_screen";

type Ad = {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  advertiserName?: string;
  priority?: number;
};

const CAROUSEL_INTERVAL_MS = 5000;

// Fetches active ads for a placement. Carousel mode is opt-in, so existing
// placements continue to render only the top-priority advertisement.
// Renders nothing when there's no active ad, so it never disrupts the layout (F3).
export function AdBanner({
  placement,
  carousel = false,
}: {
  placement: Placement;
  carousel?: boolean;
}) {
  const { token } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackedImpressions = useRef(new Set<string>());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const result = await api<{ success: boolean; data: Ad[] }>(
          `/api/advertisements/active?placement=${placement}`,
          { token: token ?? undefined }
        );
        if (!active) return;
        setAds(result.ok ? result.data.data : []);
        setActiveIndex(0);
      })();
      return () => {
        active = false;
      };
    }, [placement, token])
  );

  const visibleAds = carousel ? ads : ads.slice(0, 1);
  const safeIndex = visibleAds.length > 0 ? activeIndex % visibleAds.length : 0;
  const ad = visibleAds[safeIndex] ?? null;

  useEffect(() => {
    if (!carousel || visibleAds.length < 2) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleAds.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [carousel, visibleAds.length]);

  useEffect(() => {
    if (!ad || trackedImpressions.current.has(ad._id)) return;

    trackedImpressions.current.add(ad._id);
    void api(`/api/advertisements/${ad._id}/impression`, {
      method: "POST",
      token: token ?? undefined,
    });
  }, [ad, token]);

  useEffect(() => {
    if (!ad) return;

    fadeAnim.setValue(0.35);
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [ad, fadeAnim]);

  if (!ad) return null;

  const handlePress = () => {
    void api(`/api/advertisements/${ad._id}/click`, { method: "POST", token: token ?? undefined });
    if (ad.linkUrl) Linking.openURL(ad.linkUrl).catch(() => {});
  };

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={s.wrap}>
          <Pressable
            accessibilityLabel={`${ad.title}, advertisement${visibleAds.length > 1 ? ` ${safeIndex + 1} of ${visibleAds.length}` : ""}`}
            accessibilityRole="button"
            onPress={handlePress}
            disabled={!ad.linkUrl}
          >
            <Image source={{ uri: ad.imageUrl }} style={s.image} resizeMode="cover" />
            <View style={s.badge}>
              <Text style={s.badgeText}>{ad.advertiserName ? `Ad · ${ad.advertiserName}` : "Ad"}</Text>
            </View>
          </Pressable>
          {carousel && visibleAds.length > 1 ? (
            <View style={s.pagination}>
              {visibleAds.map((item, index) => (
                <Pressable
                  key={item._id}
                  accessibilityLabel={`Show advertisement ${index + 1}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setActiveIndex(index)}
                  style={[s.dot, index === safeIndex && s.activeDot]}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 20 },
  wrap: { borderRadius: 16, overflow: "hidden", position: "relative" },
  image: { width: "100%", height: 110, backgroundColor: "#eee" },
  badge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  pagination: { position: "absolute", right: 10, bottom: 11, flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.55)" },
  activeDot: { width: 16, backgroundColor: "#FFFFFF" },
});
