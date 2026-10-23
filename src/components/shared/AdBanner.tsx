import type { AdSlot } from "@/lib/ads";
import { getServedAds, trackAd } from "@/lib/services/misc";
import type { AdCreative } from "@/lib/types";
import { useTheme } from "@/theme";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

// The live ad for a slot (set up in the admin dashboard; same slots as the
// webapp). Picture ads show the image; text ads show headline, body and
// button. Renders nothing when no ad is live, so it never disrupts the layout (F3).
export function AdBanner({
  placement,
}: {
  placement: AdSlot;
  /** Kept for older call sites; one ad is served per slot. */
  carousel?: boolean;
}) {
  const { colors } = useTheme();
  const [ad, setAd] = useState<AdCreative | null>(null);
  const tracked = useRef(new Set<string>());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const served = await getServedAds([placement]);
        if (active) setAd(served[placement] ?? null);
      })();
      return () => {
        active = false;
      };
    }, [placement]),
  );

  // Counted once per ad while this screen is open.
  useEffect(() => {
    if (!ad || tracked.current.has(ad._id)) return;
    tracked.current.add(ad._id);
    trackAd(ad._id, "impression");
  }, [ad]);

  useEffect(() => {
    if (!ad) return;
    fadeAnim.setValue(0.35);
    const animation = Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [ad, fadeAnim]);

  if (!ad) return null;

  const open = () => {
    trackAd(ad._id, "click");
    if (ad.linkUrl) Linking.openURL(ad.linkUrl).catch(() => {});
  };

  const toneColor = { primary: colors.teal, secondary: colors.secondary, accent: colors.primary, gold: "#b08d48" }[ad.tone] ?? colors.primary;

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Pressable
          accessibilityLabel={`${ad.headline}, advertisement by ${ad.advertiser}`}
          accessibilityRole="link"
          onPress={open}
          disabled={!ad.linkUrl}
          style={[s.wrap, !ad.imageUrl && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          {ad.imageUrl ? (
            <>
              <Image source={{ uri: ad.imageUrl }} style={s.image} resizeMode="cover" />
              <View style={s.badge}>
                <Text style={s.badgeText}>{`Ad · ${ad.advertiser}`}</Text>
              </View>
            </>
          ) : (
            <View style={s.textAd}>
              <Text style={[s.sponsor, { color: colors.textMuted }]}>{`SPONSORED · ${ad.advertiser.toUpperCase()}`}</Text>
              <Text style={[s.headline, { color: colors.text }]} numberOfLines={2}>
                {ad.headline}
              </Text>
              {!!ad.body && (
                <Text style={[s.body, { color: colors.textMuted }]} numberOfLines={2}>
                  {ad.body}
                </Text>
              )}
              {!!ad.cta && (
                <View style={[s.cta, { backgroundColor: toneColor }]}>
                  <Text style={s.ctaText}>{ad.cta}</Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
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
  textAd: { padding: 14 },
  sponsor: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6 },
  headline: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  body: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  cta: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 10 },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
