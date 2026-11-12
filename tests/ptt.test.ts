import { test } from "node:test";
import assert from "node:assert/strict";
import { collectPttPosts, mixPttPosts, pttBoards, type PttItem } from "../lib/ptt.ts";

const date = "2026-11-12T12:00:00.000Z";
const post = (board: string, id: string, category: PttItem["category"]): PttItem => ({
  id, title: id, board, category, url: "https://www.ptt.cc/bbs/" + board + "/" + id + ".html", publishedAt: date,
});

test("recent PTT posts remain grouped by topic and de-duplicated", () => {
  const result = mixPttPosts([
    post("C_Chat", "a", "anime"),
    post("C_Chat", "b", "anime"),
    post("Lifeismoney", "c", "life"),
    post("Steam", "d", "games"),
    post("PC_Shopping", "e", "tech"),
    post("movie", "f", "movies"),
    post("movie", "f", "movies"),
  ]);
  assert.deepEqual(result.slice(0, 5).map((entry) => entry.category), ["life", "anime", "games", "tech", "movies"]);
  assert.equal(result.length, 6);
});

test("PTT board list spans leisure, games, and technology without gossip", () => {
  const names = pttBoards.map((entry) => entry.board);
  for (const board of ["Lifeismoney", "C_Chat", "Steam", "movie"]) {
    assert.ok(names.includes(board), board);
  }
  assert.deepEqual([...names].sort(), ["Lifeismoney", "C_Chat", "Steam", "movie"].sort());
  assert.equal(new Set(names).size, names.length);
  assert.ok(!names.includes("Gossiping"));
});

test("a failing PTT Atom feed does not prevent other public boards", async () => {
  const result = await collectPttPosts(async (board) => {
    if (board.board === "movie") throw Error("blocked");
    return [post(board.board, board.board, board.category)];
  });
  assert.equal(result.items.length, pttBoards.length - 1);
  assert.deepEqual(result.unavailableBoards, ["movie"]);
});

test("all PTT feeds failing returns no invented posts", async () => {
  const result = await collectPttPosts(async () => { throw Error("unavailable"); });
  assert.equal(result.items.length, 0);
  assert.equal(result.unavailableBoards.length, pttBoards.length);
});
