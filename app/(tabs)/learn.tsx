import { AdBanner } from "@/components";
import { api, uploadImage } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// ── Types ─────────────────────────────────────────────────────────────────────
type Content = {
  _id: string;
  title: string;
  body: string;
  format: "text" | "image" | "blog";
  imageUrl?: string;
  category: string;
  readTimeMinutes?: number;
  createdAt: string;
  sponsored?: boolean;
  sponsorName?: string;
};
type Story = {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  author?: { _id: string; name?: string };
  status?: "pending" | "approved" | "rejected";
  createdAt: string;
};
type Bookmark = { bookmarkId: string; targetType: "content" | "story"; item: Content | Story };

const FORMAT_EMOJI: Record<Content["format"], string> = { text: "📄", image: "🖼️", blog: "📝" };

// ── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
function BookmarkIcon({ color, filled = false }: { color: string; filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}
function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ── Full-screen story viewer (Facebook/Instagram-style, auto-advances) ────────
const STORY_DURATION_MS = 3000;

function StoryViewer({
  visible,
  stories,
  startIndex,
  onClose,
  bookmarkedIds,
  onToggleBookmark,
}: {
  visible: boolean;
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  // The visual fill and the actual advance-timer are deliberately separate:
  // driving navigation off Animated's completion callback proved unreliable
  // (it can silently not fire), so a plain setTimeout owns the advance while
  // Animated.timing only drives the progress-bar fill.
  useEffect(() => {
    if (!visible || !stories.length) return;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      if (index >= stories.length - 1) onClose();
      else setIndex((i) => i + 1);
    }, STORY_DURATION_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, stories.length]);

  if (!visible || !stories.length) return null;
  const story = stories[index];
  if (!story) return null;

  const goNext = () => {
    if (index >= stories.length - 1) onClose();
    else setIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={sv.container}>
        {story.imageUrl ? (
          <Image source={{ uri: story.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#7b3f6e" }]} />
        )}
        <View style={sv.scrim} />

        {/* Tap zones for prev/next — rendered first so header/content/pagination sit above them */}
        <Pressable style={sv.tapPrev} onPress={goPrev} />
        <Pressable style={sv.tapNext} onPress={goNext} />

        {/* Bottom pagination */}
        <View style={sv.pagination} pointerEvents="none">
          {stories.map((st, i) => (
            <View key={st._id} style={sv.paginationTrack}>
              {i < index && <View style={sv.paginationFillFull} />}
              {i === index && (
                <Animated.View
                  style={[
                    sv.paginationFill,
                    { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Close — top-left, mirrors the bookmark button on the opposite corner.
            Uses the numeric inset directly (not SafeAreaView) since insets inside
            a RN Modal aren't always picked up reliably through the component. */}
        <View style={[sv.topBar, { paddingTop: insets.top + 14 }]} pointerEvents="box-none">
          <Pressable onPress={onClose} style={sv.closeBtn} hitSlop={10}>
            <CloseIcon color="#fff" />
          </Pressable>
          <Pressable onPress={() => onToggleBookmark(story._id)} style={sv.closeBtn} hitSlop={10}>
            <BookmarkIcon color="#fff" filled={bookmarkedIds.has(story._id)} />
          </Pressable>
        </View>

        {/* Content — same badge/title/meta layout as the Featured Story card, plus the full body */}
        <View style={sv.content} pointerEvents="box-none">
          <View style={[sv.badge, { backgroundColor: colors.primary }]}>
            <Text style={sv.badgeText}>STORY</Text>
          </View>
          <Text style={sv.storyTitle} numberOfLines={2}>{story.title}</Text>
          <Text style={sv.storyMeta}>
            By {story.author?.name || "A patient"} · {timeAgo(story.createdAt)}
          </Text>
          <Text style={sv.storyBody} numberOfLines={6}>{story.body}</Text>
        </View>
      </View>
    </Modal>
  );
}

function LearnSkeleton({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const fill = colors.border;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.skeletonScroll}
      >
        <Animated.View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading Learn content"
          style={{ opacity: pulse }}
        >
          <View style={s.skeletonTopBar}>
            <View style={[s.skeletonTitle, { backgroundColor: fill }]} />
            <View style={s.skeletonTopActions}>
              <View style={[s.skeletonCircle, { backgroundColor: fill }]} />
              <View style={[s.skeletonCircle, { backgroundColor: fill }]} />
            </View>
          </View>

          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.skeletonFilters}
          >
            {[76, 68, 92, 82, 74].map((width, index) => (
              <View
                key={index}
                style={[s.skeletonFilter, { width, backgroundColor: fill }]}
              />
            ))}
          </ScrollView>

          <View style={s.padH}>
            <View
              style={[
                s.skeletonFeatured,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={[s.skeletonFeatureBadge, { backgroundColor: fill }]} />
              <View style={[s.skeletonFeatureTitle, { backgroundColor: fill }]} />
              <View style={[s.skeletonFeatureTitleShort, { backgroundColor: fill }]} />
              <View style={[s.skeletonFeatureMeta, { backgroundColor: fill }]} />
            </View>

            <View style={s.skeletonSectionHeader}>
              <View style={[s.skeletonSectionTitle, { backgroundColor: fill }]} />
              <View style={s.skeletonSectionActions}>
                <View style={[s.skeletonActionText, { backgroundColor: fill }]} />
                <View style={[s.skeletonActionTextSmall, { backgroundColor: fill }]} />
              </View>
            </View>

            <View
              style={[
                s.skeletonAd,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />

            {[0, 1, 2, 3].map((item) => (
              <View
                key={item}
                style={[
                  s.skeletonArticle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[s.skeletonThumbnail, { backgroundColor: fill }]} />
                <View style={s.skeletonArticleBody}>
                  <View style={[s.skeletonCategory, { backgroundColor: fill }]} />
                  <View style={[s.skeletonArticleTitle, { backgroundColor: fill }]} />
                  <View style={[s.skeletonArticleTitleShort, { backgroundColor: fill }]} />
                  <View style={[s.skeletonMeta, { backgroundColor: fill }]} />
                </View>
                <View style={[s.skeletonBookmark, { backgroundColor: fill }]} />
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const accent = colors.primary;
  const accentBg = colors.primaryLight;

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All Topics");
  const [articles, setArticles] = useState<Content[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const [savedOpen, setSavedOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<Bookmark[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const [mineOpen, setMineOpen] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareBody, setShareBody] = useState("");
  const [shareImageLocalUri, setShareImageLocalUri] = useState<string | null>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [uploadingShareImage, setUploadingShareImage] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerList, setStoryViewerList] = useState<Story[]>([]);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);

  // The Featured Story card itself auto-cycles through all stories, like a
  // small inline carousel, before the user ever taps into the full slider.
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [stories]);

  useEffect(() => {
    if (stories.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % stories.length);
    }, STORY_DURATION_MS);
    return () => clearInterval(timer);
  }, [stories.length]);

  const loadData = useCallback(async () => {
    const [articlesRes, storiesRes, bookmarksRes] = await Promise.all([
      api<{ success: boolean; data: Content[] }>("/api/content", { token: token ?? undefined }),
      api<{ success: boolean; data: Story[] }>("/api/stories/published", { token: token ?? undefined }),
      api<{ success: boolean; data: Bookmark[] }>("/api/patients/bookmarks", { token: token ?? undefined }),
    ]);
    if (articlesRes.ok) {
      const nextArticles = articlesRes.data.data;
      setArticles(nextArticles);
      setActiveFilter((current) =>
        current === "All Topics" || nextArticles.some((article) => article.category?.trim() === current)
          ? current
          : "All Topics",
      );
    }
    if (storiesRes.ok) setStories(storiesRes.data.data);
    if (bookmarksRes.ok) {
      setBookmarkedIds(new Set(bookmarksRes.data.data.map((b) => b.item._id)));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadData();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [loadData])
  );

  const toggleBookmark = async (targetType: "content" | "story", id: string) => {
    const isSaved = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(id) : next.add(id);
      return next;
    });

    const result = isSaved
      ? await api("/api/patients/bookmarks", { method: "DELETE", token: token ?? undefined, body: { targetType, targetId: id } })
      : await api("/api/patients/bookmarks", { method: "POST", token: token ?? undefined, body: { targetType, targetId: id } });

    if (!result.ok) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        isSaved ? next.add(id) : next.delete(id);
        return next;
      });
      Alert.alert("Couldn't update bookmark", result.message);
    }
  };

  const openSaved = async () => {
    setSavedOpen(true);
    setSavedLoading(true);
    const result = await api<{ success: boolean; data: Bookmark[] }>("/api/patients/bookmarks", { token: token ?? undefined });
    setSavedLoading(false);
    if (result.ok) setSavedItems(result.data.data);
  };

  const openMyStories = async () => {
    setMineOpen(true);
    const result = await api<{ success: boolean; data: Story[] }>("/api/stories/mine", { token: token ?? undefined });
    if (result.ok) setMyStories(result.data.data);
  };

  const pickShareImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach an image to your story.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    // Show the picked photo right away so there's no dead time waiting on the network.
    setShareImageLocalUri(result.assets[0].uri);
    setShareImageUrl(null);
    setUploadingShareImage(true);

    const uploadResult = await uploadImage(result.assets[0].uri, token ?? undefined);
    setUploadingShareImage(false);

    if (!uploadResult.ok) {
      Alert.alert("Couldn't upload image", uploadResult.message);
      setShareImageLocalUri(null);
      return;
    }
    setShareImageUrl(uploadResult.data.url);
  };

  const removeShareImage = () => {
    setShareImageLocalUri(null);
    setShareImageUrl(null);
  };

  const handleSubmitStory = async () => {
    if (!shareTitle.trim() || !shareBody.trim() || sharing || uploadingShareImage) return;
    setSharing(true);
    const result = await api("/api/stories", {
      method: "POST",
      token: token ?? undefined,
      body: { title: shareTitle.trim(), body: shareBody.trim(), imageUrl: shareImageUrl || undefined },
    });
    setSharing(false);

    if (!result.ok) {
      Alert.alert("Couldn't submit story", result.message);
      return;
    }

    setShareTitle("");
    setShareBody("");
    setShareImageLocalUri(null);
    setShareImageUrl(null);
    setShareOpen(false);
    Alert.alert("Submitted!", "Your story is pending admin approval before it's published.");
  };

  const openStoryViewer = (list: Story[], startIndex: number) => {
    setStoryViewerList(list);
    setStoryViewerIndex(startIndex);
    setStoryViewerOpen(true);
  };

  const closeSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  if (loading) {
    return <LearnSkeleton colors={colors} />;
  }

  const featured = stories.length ? stories[featuredIndex % stories.length] : undefined;
  const topicFilters = [
    "All Topics",
    ...Array.from(
      new Set(
        articles
          .map((article) => article.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort((a, b) => a.localeCompare(b)),
  ];
  const categoryArticles =
    activeFilter === "All Topics"
      ? articles
      : articles.filter((article) => article.category?.trim() === activeFilter);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visibleArticles = normalizedSearch
    ? categoryArticles.filter((article) =>
        [article.title, article.category, article.body, article.sponsorName]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(normalizedSearch)),
      )
    : categoryArticles;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      {searchOpen ? (
        <View style={s.searchHeader}>
          <View
            style={[
              s.searchInputWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}
          >
            <SearchIcon color={colors.primary} />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search articles…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              selectionColor={colors.primary}
              style={[s.searchInput, { color: colors.text }]}
            />
            {!!searchQuery && (
              <Pressable
                accessibilityLabel="Clear article search"
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                style={[s.searchClear, { backgroundColor: colors.background }]}
              >
                <CloseIcon color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityLabel="Close article search"
            onPress={closeSearch}
            hitSlop={8}
            style={[s.searchClose, { backgroundColor: colors.surface }]}
          >
            <CloseIcon color={colors.text} />
          </Pressable>
        </View>
      ) : (
        <View style={s.topBar}>
          <Text style={[s.screenTitle, { color: colors.text }]}>Learn</Text>
          <View style={s.topIcons}>
            <Pressable
              accessibilityLabel="Search articles"
              style={[s.iconBtn, { backgroundColor: colors.surface }]}
              onPress={() => setSearchOpen(true)}
            >
              <SearchIcon color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Open saved items"
              style={[s.iconBtn, { backgroundColor: colors.surface }]}
              onPress={openSaved}
            >
              <BookmarkIcon color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* ── Filter pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
          {topicFilters.map((f) => {
            const active = f === activeFilter;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[s.filterPill, active ? { backgroundColor: accent, borderColor: accent } : { backgroundColor: "transparent", borderColor: colors.border }]}
              >
                <Text style={[s.filterText, { color: active ? "#fff" : colors.textMuted }]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Featured Story — auto-cycles through all stories like a mini slider ── */}
        {featured && (
          <View style={s.padH}>
            <Pressable
              style={[s.featuredCard, { backgroundColor: "#7b3f6e" }]}
              onPress={() => openStoryViewer(stories, featuredIndex % stories.length)}
            >
              {featured.imageUrl && !failedImageIds.has(featured._id) && (
                <Image
                  source={{ uri: featured.imageUrl }}
                  style={s.featuredImage}
                  resizeMode="cover"
                  onError={() => setFailedImageIds((prev) => new Set(prev).add(featured._id))}
                />
              )}
              <View style={s.featuredOverlay} />
              <Pressable style={s.featuredBookmark} onPress={() => toggleBookmark("story", featured._id)}>
                <BookmarkIcon color="#fff" filled={bookmarkedIds.has(featured._id)} />
              </Pressable>
              <View style={s.featuredContent}>
                <View style={[s.featuredBadge, { backgroundColor: accent }]}>
                  <Text style={s.featuredBadgeText}>FEATURED STORY</Text>
                </View>
                <Text style={s.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                <Text style={s.featuredMetaText}>
                  By {featured.author?.name || "A patient"} · {timeAgo(featured.createdAt)}
                </Text>
                {stories.length > 1 && (
                  <View style={s.featuredPagination} pointerEvents="none">
                    {stories.map((st, i) => (
                      <View
                        key={st._id}
                        style={[
                          s.featuredPaginationDot,
                          i === featuredIndex % stories.length && s.featuredPaginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        )}

        {/* ── Latest Articles ── */}
        <View style={[s.sectionHeader, s.padH]}>
          <View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Latest Articles</Text>
            {!!normalizedSearch && (
              <Text style={[s.searchResultCount, { color: colors.textMuted }]}>
                {visibleArticles.length} {visibleArticles.length === 1 ? "result" : "results"}
              </Text>
            )}
          </View>
          <View style={s.sectionActions}>
            <Pressable onPress={openMyStories}>
              <Text style={[s.secondaryAction, { color: colors.textMuted }]}>My Stories</Text>
            </Pressable>
            <Pressable onPress={() => setShareOpen(true)}>
              <Text style={[s.viewAll, { color: accent }]}>+ Share</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.padH}>
          <AdBanner placement="learn_feed" carousel />

          {!visibleArticles.length ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 20 }}>
              {normalizedSearch
                ? `No articles found for “${searchQuery.trim()}”.`
                : "No articles in this category yet."}
            </Text>
          ) : (
            visibleArticles.map((a) => {
              const metaText = a.sponsored && a.sponsorName
                ? `By ${a.sponsorName}`
                : a.readTimeMinutes ? `${a.readTimeMinutes} min read` : timeAgo(a.createdAt);

              const showImage = !!a.imageUrl && !failedImageIds.has(a._id);

              return (
                <Pressable key={a._id} style={[s.articleCard, { backgroundColor: colors.surface }]} onPress={() => router.push(`/content/${a._id}`)}>
                  <View style={[s.thumbnail, { backgroundColor: accentBg }]}>
                    {showImage ? (
                      <Image
                        source={{ uri: a.imageUrl }}
                        style={s.thumbnailImage}
                        resizeMode="cover"
                        onError={() => setFailedImageIds((prev) => new Set(prev).add(a._id))}
                      />
                    ) : (
                      <Text style={s.thumbnailEmoji}>{FORMAT_EMOJI[a.format]}</Text>
                    )}
                  </View>
                  <View style={s.articleBody}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[s.articleCategory, { color: accent }]}>{a.category.toUpperCase()}</Text>
                      {a.sponsored && (
                        <View style={[s.sponsoredBadge, { backgroundColor: accentBg }]}>
                          <Text style={[s.sponsoredBadgeText, { color: accent }]}>SPONSORED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.articleTitle, { color: colors.text }]} numberOfLines={2}>{a.title}</Text>
                    <Text style={[s.articleMeta, { color: colors.textMuted }]}>{metaText}</Text>
                  </View>
                  <Pressable onPress={() => toggleBookmark("content", a._id)} style={s.articleBookmark}>
                    <BookmarkIcon color={bookmarkedIds.has(a._id) ? accent : colors.textMuted} filled={bookmarkedIds.has(a._id)} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Saved items modal (C5) ── */}
      <Modal visible={savedOpen} animationType="slide" transparent onRequestClose={() => setSavedOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setSavedOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface, maxHeight: "75%" }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Saved</Text>
          {savedLoading ? (
            <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {!savedItems.length ? (
                <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 20 }}>Nothing saved yet.</Text>
              ) : (
                savedItems.map((b) => (
                  <Pressable
                    key={b.bookmarkId}
                    style={[m.row, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSavedOpen(false);
                      if (b.targetType === "content") router.push(`/content/${b.item._id}`);
                      else openStoryViewer([b.item as Story], 0);
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{b.targetType === "story" ? "💬" : "📄"}</Text>
                    <Text style={[m.rowText, { color: colors.text }]} numberOfLines={1}>{b.item.title}</Text>
                    <Pressable onPress={() => toggleBookmark(b.targetType, b.item._id).then(() => setSavedItems((prev) => prev.filter((x) => x.bookmarkId !== b.bookmarkId)))}>
                      <CloseIcon color={colors.textMuted} />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── My submitted stories modal (C3 status tracking) ── */}
      <Modal visible={mineOpen} animationType="slide" transparent onRequestClose={() => setMineOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setMineOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface, maxHeight: "75%" }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>My Submitted Stories</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!myStories.length ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 20 }}>
                You haven't submitted any stories yet.
              </Text>
            ) : (
              myStories.map((story) => (
                <View key={story._id} style={[m.row, { borderBottomColor: colors.border }]}>
                  <Text style={[m.rowText, { color: colors.text }]} numberOfLines={1}>{story.title}</Text>
                  <View style={[m.statusBadge, {
                    backgroundColor: story.status === "approved" ? "#dcfce7" : story.status === "rejected" ? "#fee2e2" : accentBg,
                  }]}>
                    <Text style={{
                      fontSize: 11, fontWeight: "700",
                      color: story.status === "approved" ? "#16a34a" : story.status === "rejected" ? "#dc2626" : accent,
                    }}>
                      {story.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Share a story modal (C3) ── */}
      <Modal visible={shareOpen} animationType="slide" transparent onRequestClose={() => setShareOpen(false)}>
        <Pressable style={m.backdrop} onPress={() => setShareOpen(false)} />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <Text style={[m.title, { color: colors.text }]}>Share Your Story</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginBottom: 16 }}>
            Your story will be reviewed by our team before it's published.
          </Text>
          <TextInput
            value={shareTitle}
            onChangeText={setShareTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />
          <TextInput
            value={shareBody}
            onChangeText={setShareBody}
            placeholder="Share your experience..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            style={[m.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, height: 140, textAlignVertical: "top" }]}
          />

          {shareImageLocalUri ? (
            <View style={m.sharePhotoPreviewWrap}>
              <Image source={{ uri: shareImageLocalUri }} style={m.sharePhotoPreview} resizeMode="cover" />
              {uploadingShareImage && (
                <View style={m.sharePhotoUploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <Pressable onPress={removeShareImage} style={m.sharePhotoRemove} hitSlop={8}>
                <CloseIcon color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickShareImage}
              style={[m.sharePhotoBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={[m.sharePhotoBtnText, { color: colors.textMuted }]}>Add Photo</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleSubmitStory}
            disabled={!shareTitle.trim() || !shareBody.trim() || sharing || uploadingShareImage}
            style={[m.saveBtn, { backgroundColor: accent, opacity: !shareTitle.trim() || !shareBody.trim() || sharing || uploadingShareImage ? 0.6 : 1 }]}
          >
            {sharing ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Submit for Review</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* ── Full-screen story viewer ── */}
      <StoryViewer
        visible={storyViewerOpen}
        stories={storyViewerList}
        startIndex={storyViewerIndex}
        onClose={() => setStoryViewerOpen(false)}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={(id) => toggleBookmark("story", id)}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  padH: { paddingHorizontal: 20 },
  skeletonScroll: { paddingBottom: 110 },
  skeletonTopBar: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  skeletonTitle: { width: 88, height: 26, borderRadius: 9 },
  skeletonTopActions: { flexDirection: "row", gap: 8 },
  skeletonCircle: { width: 38, height: 38, borderRadius: 19 },
  skeletonFilters: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  skeletonFilter: { height: 36, borderRadius: 18 },
  skeletonFeatured: { height: 220, borderRadius: 20, marginBottom: 24, padding: 17, justifyContent: "flex-end" },
  skeletonFeatureBadge: { width: 94, height: 18, borderRadius: 6, marginBottom: 10 },
  skeletonFeatureTitle: { width: "86%", height: 18, borderRadius: 7, marginBottom: 7 },
  skeletonFeatureTitleShort: { width: "58%", height: 18, borderRadius: 7, marginBottom: 11 },
  skeletonFeatureMeta: { width: 126, height: 10, borderRadius: 5 },
  skeletonSectionHeader: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  skeletonSectionTitle: { width: 126, height: 19, borderRadius: 7 },
  skeletonSectionActions: { flexDirection: "row", gap: 13 },
  skeletonActionText: { width: 62, height: 11, borderRadius: 5 },
  skeletonActionTextSmall: { width: 48, height: 11, borderRadius: 5 },
  skeletonAd: { height: 76, borderRadius: 15, borderWidth: 1, marginBottom: 16 },
  skeletonArticle: { minHeight: 96, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12 },
  skeletonThumbnail: { width: 72, height: 72, borderRadius: 12 },
  skeletonArticleBody: { flex: 1 },
  skeletonCategory: { width: 70, height: 9, borderRadius: 5, marginBottom: 8 },
  skeletonArticleTitle: { width: "94%", height: 13, borderRadius: 6, marginBottom: 6 },
  skeletonArticleTitleShort: { width: "68%", height: 13, borderRadius: 6, marginBottom: 9 },
  skeletonMeta: { width: 78, height: 9, borderRadius: 5 },
  skeletonBookmark: { width: 22, height: 28, borderRadius: 8 },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: "800" },
  topIcons: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  searchHeader: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  searchInputWrap: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 15, paddingLeft: 13, paddingRight: 7 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  searchClear: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", transform: [{ scale: 0.78 }] },
  searchClose: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },

  filtersRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterText: { fontSize: 13, fontWeight: "600" },

  featuredCard: { borderRadius: 20, height: 220, marginBottom: 24, position: "relative", overflow: "hidden" },
  featuredImage: { ...StyleSheet.absoluteFillObject },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 20 },
  featuredBookmark: { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  featuredContent: { position: "absolute", bottom: 16, left: 16, right: 16 },
  featuredBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  featuredBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  featuredTitle: { color: "#fff", fontSize: 17, fontWeight: "800", lineHeight: 23, marginBottom: 10 },
  featuredMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  featuredPagination: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
  featuredPaginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  featuredPaginationDotActive: { width: 18, backgroundColor: "#fff" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  searchResultCount: { fontSize: 11, marginTop: 3 },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  secondaryAction: { fontSize: 12, fontWeight: "700" },
  viewAll: { fontSize: 13, fontWeight: "700" },

  articleCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, marginBottom: 12, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  thumbnail: { width: 72, height: 72, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  thumbnailImage: { width: "100%", height: "100%" },
  thumbnailEmoji: { fontSize: 32 },
  articleBody: { flex: 1 },
  articleCategory: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 4 },
  sponsoredBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginBottom: 4 },
  sponsoredBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  articleTitle: { fontSize: 14, fontWeight: "700", lineHeight: 19, marginBottom: 5 },
  articleMeta: { fontSize: 12, fontWeight: "400" },
  articleBookmark: { padding: 4 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { borderRadius: 13, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, fontSize: 14 },
  sharePhotoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, borderWidth: 1.5, borderStyle: "dashed", paddingVertical: 14, marginBottom: 14 },
  sharePhotoBtnText: { fontSize: 13, fontWeight: "600" },
  sharePhotoPreviewWrap: { marginBottom: 14, borderRadius: 13, overflow: "hidden" },
  sharePhotoPreview: { width: "100%", height: 140, backgroundColor: "#eee" },
  sharePhotoRemove: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  sharePhotoUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, fontSize: 14, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
});

// ── Story viewer styles ─────────────────────────────────────────────────────
const sv = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  tapPrev: { position: "absolute", left: 0, top: 0, bottom: 0, width: "30%" },
  tapNext: { position: "absolute", right: 0, top: 0, bottom: 0, width: "70%" },

  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },

  content: { position: "absolute", left: 20, right: 20, bottom: 40 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  storyTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8, lineHeight: 26 },
  storyMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 10 },
  storyBody: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 21 },

  pagination: { position: "absolute", left: 16, right: 16, bottom: 14, flexDirection: "row", gap: 4 },
  paginationTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  paginationFillFull: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff" },
  paginationFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#fff" },
});
