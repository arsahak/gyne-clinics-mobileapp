import { api, apiForm, type ApiResult, filePart } from "@/lib/api";
import { ARTICLE_CATEGORIES, coverFor, isArticleCategory } from "@/lib/learn";
import { storyIdFromSlug, storyToArticle } from "@/lib/stories";
import type { Article, ArticleCategory, SubmittedStory } from "@/lib/types";

// Learn: published articles from the admin dashboard (GET /content/feed) and
// approved community stories (GET /stories/feed). Same as the webapp
// (lib/services/content.ts, lib/services/stories.ts, storyAction.ts).

interface BackendArticle {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  body?: string;
  format: "guide" | "blog" | "story" | "image";
  imageUrl?: string;
  category: string;
  readTimeMinutes?: number;
  sponsored?: boolean;
  sponsorName?: string;
  publishedAt?: string;
  authorName?: string;
  authorRole?: string;
}

function toArticle(item: BackendArticle): Article {
  const category: ArticleCategory = isArticleCategory(item.category) ? item.category : "Wellness";
  return {
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt ?? "",
    category,
    format: item.format,
    readMinutes: item.readTimeMinutes ?? 1,
    author: item.authorName || "GyneClinics Editorial Team",
    authorRole: item.authorRole ?? "",
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    cover: coverFor(category, item.slug),
    image: item.imageUrl || undefined,
    sponsor: item.sponsored ? item.sponsorName || "a partner" : undefined,
    sections: [],
    html: item.body,
  };
}

/** Published content. The feed comes 100 at a time, so this reads every page. */
export async function getContentArticles(): Promise<ApiResult<Article[]>> {
  const items: BackendArticle[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = await api<{ contents: BackendArticle[]; pagination: { pages: number } }>(`/content/feed?limit=100&page=${page}`);
    if (!result.ok) {
      if (page === 1) return result;
      break;
    }
    items.push(...result.data.contents);
    if (page >= result.data.pagination.pages) break;
  }
  // Items without a slug can't be opened; skip them.
  return { ok: true, status: 200, message: "OK", data: items.filter((item) => item.slug).map(toArticle) };
}

/** Approved stories as posts, newest first. */
export async function getStoryFeed(): Promise<SubmittedStory[]> {
  const result = await api<{ stories: SubmittedStory[] }>("/stories/feed?limit=100");
  return result.ok ? result.data.stories : [];
}

/** Published articles and approved community stories, newest first. */
export async function getArticles(): Promise<ApiResult<Article[]>> {
  const [articles, stories] = await Promise.all([getContentArticles(), getStoryFeed()]);
  if (!articles.ok) return articles;
  const all = [...articles.data, ...stories.map(storyToArticle)].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { ...articles, data: all };
}

/** One article (or approved story, "community-<id>") with its full text. */
export async function getArticle(slug: string): Promise<ApiResult<Article>> {
  if (!/^[a-z0-9-]{1,100}$/i.test(slug)) return { ok: false, status: 404, message: "Article not found" };
  const id = storyIdFromSlug(slug);
  if (id) {
    const result = await api<SubmittedStory>(`/stories/feed/${id}`);
    return result.ok ? { ...result, data: storyToArticle(result.data) } : result;
  }
  const result = await api<BackendArticle>(`/content/feed/${slug}`);
  return result.ok ? { ...result, data: toArticle(result.data) } : result;
}

export const CATEGORIES: ArticleCategory[] = ARTICLE_CATEGORIES;

/** Your stories, with their review status. */
export async function getMyStories(): Promise<SubmittedStory[]> {
  const result = await api<SubmittedStory[]>("/stories/mine");
  return result.ok ? result.data : [];
}

/** Sends a community story for review, with an optional photo. */
export function submitStory(input: { title: string; body: string; topic: string; anonymous: boolean; imageUri?: string | null }) {
  const form = new FormData();
  form.append("title", input.title.trim());
  form.append("body", input.body.trim());
  form.append("topic", input.topic);
  form.append("anonymous", String(input.anonymous));
  if (input.imageUri) form.append("image", filePart(input.imageUri, "story.jpg"));
  return apiForm("/stories", form);
}
