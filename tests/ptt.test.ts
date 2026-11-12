import { test } from "node:test";
import assert from "node:assert/strict";
import { collectPttHot, parsePttIndex, pttBoards, rankPttHot, type PttHotItem } from "../lib/ptt.ts";

const date = "2026-11-12T12:00:00.000Z";
const card = (board: string, id: string, pushScore: number, category: PttHotItem["category"]): PttHotItem => ({
  id, title: id, board, pushScore, category, url: "https://www.ptt.cc/bbs/" + board + "/" + id + ".html", publishedAt: date,
});

test("reads push count and '爆' markers from public PTT index HTML", () => {
  const html = [
    '<div class="r-ent"><div class="nrec"><span class="hl f3">34</span></div><div class="title"><a href="/bbs/C_Chat/M.1794489999.A.ABC.html">動畫</a></div></div>',
    '<div class="r-ent"><div class="nrec"><span class="hl f1">爆</span></div><div class="title"><a href="/bbs/C_Chat/M.1794489999.A.DEF.html">漫畫</a></div></div>',
    '<div class="r-ent"><div class="nrec"><span class="hl f1">X2</span></div><div class="title"><a href="/bbs/C_Chat/M.1794489999.A.GHI.html">噓</a></div></div>',
    '<div class="r-ent"><div class="nrec">20</div><div class="title"><a href="/bbs/Gossiping/M.1794489999.A.EVIL.html">其他看板</a></div></div>',
    '<div class="r-ent"><div class="nrec">99</div><div class="title"><a href="https://example.com/">站外連結</a></div></div>',
  ].join("");
  const scores = parsePttIndex(html, "C_Chat");
  assert.equal(scores.size, 3);
  assert.equal(scores.get("https://www.ptt.cc/bbs/C_Chat/M.1794489999.A.ABC.html"), 34);
  assert.equal(scores.get("https://www.ptt.cc/bbs/C_Chat/M.1794489999.A.DEF.html"), 100);
  assert.equal(scores.get("https://www.ptt.cc/bbs/C_Chat/M.1794489999.A.GHI.html"), 0);
  assert.ok(!scores.has("https://www.ptt.cc/bbs/Gossiping/M.1794489999.A.EVIL.html"));
});

test("hot discussions rank by push marker within categories, with diverse interleaving", () => {
  const result = rankPttHot([
    card("C_Chat", "a", 5, "anime"),
    card("C_Chat", "b", 20, "anime"),
    card("C_Chat", "c", 20, "anime"),
    card("WomenTalk", "d", 7, "life"),
    card("Steam", "e", 25, "games"),
    card("MobileComm", "f", 8, "tech"),
    card("movie", "g", 9, "movies"),
    card("movie", "g", 2, "movies"),
  ]);
  assert.deepEqual(result.slice(0, 5).map((entry) => entry.category), ["life", "anime", "games", "tech", "movies"]);
  assert.equal(result[1].pushScore, 20);
  assert.equal(result.length, 7);
});

test("PTT board list diversifies leisure, games and technology while excluding gossip", () => {
  const names = pttBoards.map((entry) => entry.board);
  for (const board of ["WomenTalk", "Lifeismoney", "C_Chat", "Steam", "PlayStation", "MobileComm", "PC_Shopping", "movie"]) {
    assert.ok(names.includes(board), board);
  }
  assert.equal(new Set(names).size, names.length);
  assert.ok(!names.includes("Gossiping"));
});

test("partial PTT failure preserves other boards and reports unavailable boards", async () => {
  const result = await collectPttHot(async (config) => {
    if (config.board === "movie") throw Error("blocked");
    return [card(config.board, config.board, 20, config.category)];
  });
  assert.equal(result.items.length, pttBoards.length - 1);
  assert.deepEqual(result.unavailableBoards, ["movie"]);
});
