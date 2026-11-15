import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editionSchema } from "../lib/daily/schema.ts";
import { loadDailyEdition, readEdition } from "../lib/daily/loader.ts";
const original = readEdition(join(process.cwd(), "content", "archive", "2026-11-15"));

test("three different orders and sizes validate without changing content", () => {
  for (const size of ["small", "medium", "large"] as const) {
    const value = structuredClone(original);
    value.layout.sections.reverse().forEach((section) => { section.size = size; });
    assert.ok(editionSchema.safeParse(value).success);
  }
});

test("rejects broken references, duplicate IDs, unknown types, HTML and unsafe URLs", () => {
  const mutations = [
    (v: typeof original) => { v.layout.sections[0].contentId = "missing"; },
    (v: typeof original) => { v.layout.sections[1].id = v.layout.sections[0].id; },
    (v: typeof original) => { v.news[1].id = v.news[0].id; },
    (v: typeof original) => { v.news[0].url = "javascript:alert(1)"; },
    (v: typeof original) => { v.news[0].url = "https://user:pass@example.org/"; },
    (v: typeof original) => { v.news[0].title = "<script>alert(1)</script>"; },
    (v: typeof original) => { v.news[0].publishedAt = "2099-01-01T00:00:00Z"; },
    (v: typeof original) => { v.layout.date = "2026-02-30"; },
    (v: typeof original) => { v.layout.date = "2020-01-01"; },
  ];
  for (const mutate of mutations) { const v = structuredClone(original); mutate(v); assert.equal(editionSchema.safeParse(v).success, false); }
  assert.equal(editionSchema.safeParse({ ...original, layout: { ...original.layout, sections: [{ id: "bad", type: "script", size: "full", contentId: "bad" }] } }).success, false);
});

test("optional news and stories can be omitted with their sections", () => {
  const value = structuredClone(original);
  value.news = []; value.stories = [];
  value.layout.sections = value.layout.sections.filter((s) => s.type !== "news" && s.type !== "story");
  assert.ok(editionSchema.safeParse(value).success);
});

test("malformed current data falls back to a complete archive; empty directory is safe", () => {
  const root = mkdtempSync(join(tmpdir(), "feifei-daily-"));
  try {
    assert.equal(loadDailyEdition(root), null);
    mkdirSync(join(root, "archive"));
    cpSync(join(process.cwd(), "content", "archive", "2026-11-15"), join(root, "archive", original.layout.date), { recursive: true });
    writeFileSync(join(root, "layout.json"), "{broken");
    assert.deepEqual(loadDailyEdition(root), original);
    writeFileSync(join(root, "archive", original.layout.date, "news.json"), "[]");
    assert.equal(loadDailyEdition(root), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
