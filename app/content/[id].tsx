import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type Content = {
  _id: string;
  title: string;
  body: string;
  format: "text" | "image" | "blog";
  imageUrl?: string;
  category: string;
  readTimeMinutes?: number;
  createdAt: string;
};

const FORMAT_EMOJI: Record<Content["format"], string> = { text: "📄", image: "🖼️", blog: "📝" };

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function BookmarkIcon({ color, filled = false }: { color: string; filled?: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function ContentDetailsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const accent = colors.primary;

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Content | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const [contentRes, bookmarksRes] = await Promise.all([
          api<{ success: boolean; data: Content }>(`/api/content/${id}`, { token: token ?? undefined }),
          api<{ success: boolean; data: { item: { _id: string } }[] }>("/api/patients/bookmarks", { token: token ?? undefined }),
        ]);
        if (!active) return;
        if (contentRes.ok) {
          setContent(contentRes.data.data);
          setHeroImageFailed(false);
        } else {
          setNotFound(true);
        }
        if (bookmarksRes.ok) {
          setBookmarked(bookmarksRes.data.data.some((b) => b.item._id === id));
        }
        setLoading(false);
      })();
      return () => { active = false; };
    }, [id, token])
  );

  const toggleBookmark = async () => {
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    const result = wasBookmarked
      ? await api("/api/patients/bookmarks", { method: "DELETE", token: token ?? undefined, body: { targetType: "content", targetId: id } })
      : await api("/api/patients/bookmarks", { method: "POST", token: token ?? undefined, body: { targetType: "content", targetId: id } });
    if (!result.ok) setBookmarked(wasBookmarked);
  };

  const hasHeroImage = !!content?.imageUrl && !heroImageFailed;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header — always in normal flow, same safe-top treatment as the Learn page's topBar */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <BackIcon color={colors.text} />
        </Pressable>
        {content && (
          <Pressable onPress={toggleBookmark} style={s.headerBtn}>
            <BookmarkIcon color={bookmarked ? accent : colors.text} filled={bookmarked} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : notFound || !content ? (
        <View style={s.center}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>This content couldn't be found.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={hasHeroImage ? undefined : s.scroll}>
          {hasHeroImage && (
            <Image
              source={{ uri: content.imageUrl }}
              style={s.hero}
              resizeMode="cover"
              onError={() => setHeroImageFailed(true)}
            />
          )}
          <View style={hasHeroImage ? [s.scroll, { paddingTop: 20 }] : undefined}>
            <View style={[s.categoryPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 14 }}>{FORMAT_EMOJI[content.format]}</Text>
              <Text style={[s.categoryText, { color: accent }]}>{content.category.toUpperCase()}</Text>
            </View>

            <Text style={[s.title, { color: colors.text }]}>{content.title}</Text>

            <Text style={[s.meta, { color: colors.textMuted }]}>
              {content.readTimeMinutes ? `${content.readTimeMinutes} min read · ` : ""}
              {formatDate(content.createdAt)}
            </Text>

            <RenderHtml
              contentWidth={width - 48}
              source={{ html: content.body }}
              baseStyle={{ color: colors.text, fontSize: 16, lineHeight: 26 }}
              enableExperimentalMarginCollapsing
              tagsStyles={{
                p: { marginTop: 0, marginBottom: 14 },
                h1: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 22, marginBottom: 12, lineHeight: 34 },
                h2: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 20, marginBottom: 10, lineHeight: 30 },
                h3: { color: colors.text, fontSize: 19, fontWeight: "700", marginTop: 18, marginBottom: 8, lineHeight: 26 },
                h4: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 16, marginBottom: 8 },
                h5: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 14, marginBottom: 6 },
                h6: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 14, marginBottom: 6 },
                strong: { fontWeight: "700" },
                b: { fontWeight: "700" },
                em: { fontStyle: "italic" },
                i: { fontStyle: "italic" },
                u: { textDecorationLine: "underline" },
                a: { color: accent, textDecorationLine: "underline" },
                ul: { marginTop: 0, marginBottom: 14 },
                ol: { marginTop: 0, marginBottom: 14 },
                li: { marginBottom: 6 },
                blockquote: {
                  marginLeft: 0,
                  marginVertical: 14,
                  paddingLeft: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: accent,
                  fontStyle: "italic",
                  color: colors.textMuted,
                },
                img: { borderRadius: 12, marginVertical: 10 },
                code: { backgroundColor: colors.primaryLight, paddingHorizontal: 4, borderRadius: 4 },
              }}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  hero: { width: "100%", height: 260, backgroundColor: "#eee" },
  scroll: { paddingHorizontal: 24, paddingBottom: 100 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  categoryText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 32, marginBottom: 10 },
  meta: { fontSize: 13, marginBottom: 20 },
});
