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
    { from: "#d13a8b", to: "#834d8b", icon: "CalendarHeart" },
    { from: "#d13a8b", to: "#f27bc1", icon: "Flower2" },
  ],
  Fertility: [{ from: "#217580", to: "#34a3a8", icon: "Sparkles" }],
  Pregnancy: [{ from: "#b08d48", to: "#d13a8b", icon: "Baby" }],
  Menopause: [{ from: "#834d8b", to: "#0a2342", icon: "Moon" }],
  "Pelvic Health": [{ from: "#217580", to: "#0a2342", icon: "HeartPulse" }],
  Wellness: [{ from: "#b08d48", to: "#217580", icon: "Leaf" }],
  Stories: [
    { from: "#834d8b", to: "#d13a8b", icon: "MessageCircleHeart" },
    { from: "#217580", to: "#834d8b", icon: "MessageCircleHeart" },
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
