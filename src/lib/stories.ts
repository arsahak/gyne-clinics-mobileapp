import type { Article, SubmittedStory } from "@/lib/types";

// Community stories shown in Learn alongside articles (category "Stories").

const STORY_SLUG = /^community-([a-f\d]{24})$/i;

export const communityStorySlug = (story: Pick<SubmittedStory, "_id">) => `community-${story._id}`;

/** The story id in a "community-<id>" slug, or null. */
export const storyIdFromSlug = (slug: string) => STORY_SLUG.exec(slug)?.[1] ?? null;

/** An approved story in the same display shape as Learn articles. */
export function storyToArticle(story: SubmittedStory): Article {
  const body = story.body ?? "";
  const excerpt = body.length > 155 ? `${body.slice(0, 152).trimEnd()}…` : body;
  const words = body.trim().split(/\s+/).filter(Boolean).length;

  return {
    slug: communityStorySlug(story),
    title: story.title,
    excerpt,
    category: "Stories",
    format: "story",
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    author: story.anonymous ? "Anonymous" : story.authorName || "Community member",
    authorRole: `Community story · ${story.topic} · Approved by Gynex`,
    publishedAt: story.publishedAt ?? story.createdAt,
    cover: { from: "#6c3c80", to: "#a67fb7", icon: "MessageCircleHeart" },
    image: story.imageUrl || undefined,
    // Paragraphs are separated by blank lines.
    sections: body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ body: p })),
  };
}
