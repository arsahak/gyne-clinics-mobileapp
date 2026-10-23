import type { Article, ArticleCategory } from "@/lib/types";

// Learn categories and the cover each one gets when an article has no image.

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "Periods",
  "Fertility",
  "Pregnancy",
  "Menopause",
  "Pelvic Health",
  "Wellness",
  "Stories",
];

const COVERS: Record<ArticleCategory, Article["cover"][]> = {
  Periods: [
    { from: "#804898", to: "#207898", icon: "CalendarHeart" },
    { from: "#804898", to: "#a67fb7", icon: "Flower2" },
  ],
  Fertility: [{ from: "#207898", to: "#34a3a8", icon: "Sparkles" }],
  Pregnancy: [{ from: "#b08d48", to: "#804898", icon: "Baby" }],
  Menopause: [{ from: "#207898", to: "#0a2342", icon: "Moon" }],
  "Pelvic Health": [{ from: "#207898", to: "#0a2342", icon: "HeartPulse" }],
  Wellness: [{ from: "#b08d48", to: "#207898", icon: "Leaf" }],
  Stories: [
    { from: "#207898", to: "#804898", icon: "MessageCircleHeart" },
    { from: "#207898", to: "#207898", icon: "MessageCircleHeart" },
  ],
};

/** The category's cover; categories with more than one pick by slug, so it stays the same. */
export function coverFor(category: ArticleCategory, slug: string): Article["cover"] {
  const options = COVERS[category] ?? COVERS.Wellness;
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length]!;
}

export const isArticleCategory = (value: string): value is ArticleCategory =>
  (ARTICLE_CATEGORIES as string[]).includes(value);
