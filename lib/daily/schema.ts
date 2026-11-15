import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/<\/?[a-z!][^>]*>/i.test(value), "HTML is not allowed");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const sourceUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS source URL without credentials");
export const layoutSchema = z.strictObject({
  version: z.literal(1), date, editedAt: timestamp,
  sections: z.array(z.strictObject({
    id, type: z.enum(["mood", "news", "joke", "story"]),
    size: z.enum(["small", "medium", "large", "full"]), contentId: id,
  })).min(1).max(16),
});
const newsSchema = z.strictObject({ id, title: text(100), summary: text(500), category: text(24), source: text(80), url: sourceUrl, publishedAt: timestamp });
const jokeSchema = z.strictObject({ id, title: text(60), setup: text(300), punchline: text(300), kind: z.literal("original") });
const storySchema = z.strictObject({ id, title: text(80), excerpt: text(200), body: text(2500).refine((s) => s.replace(/\s/g, "").length >= 300, "Story must contain at least 300 characters"), kind: z.literal("fiction") });
const moodSchema = z.strictObject({ id, text: text(100) });
const editionFilesSchema = z.strictObject({
  layout: layoutSchema, news: z.array(newsSchema).max(5), jokes: z.array(jokeSchema).max(3),
  stories: z.array(storySchema).max(2), mood: z.array(moodSchema).max(1),
});
export const editionSchema = editionFilesSchema.superRefine((edition, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: "custom", message });
  const all = [...edition.news, ...edition.jokes, ...edition.stories, ...edition.mood];
  if (new Set(all.map((item) => item.id)).size !== all.length) error("Content IDs must be globally unique");
  const sections = edition.layout.sections;
  if (new Set(sections.map((item) => item.id)).size !== sections.length) error("Section IDs must be unique");
  if (new Set(sections.map((item) => item.contentId)).size !== sections.length) error("Content cannot appear twice");
  const groups = { news: edition.news, joke: edition.jokes, story: edition.stories, mood: edition.mood };
  for (const section of sections) {
    if (!groups[section.type].some((item) => item.id === section.contentId)) error(`Missing ${section.type}: ${section.contentId}`);
  }
  const edited = Date.parse(edition.layout.editedAt);
  const taipeiDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(edited));
  if (taipeiDate !== edition.layout.date) error("Edition date must match editedAt in Asia/Taipei");
  for (const item of edition.news) if (Date.parse(item.publishedAt) > edited) error(`News published after edition: ${item.id}`);
});
export type DailyEdition = z.infer<typeof editionSchema>;
