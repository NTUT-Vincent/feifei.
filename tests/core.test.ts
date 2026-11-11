import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaProviders, widgetCatalog } from "../lib/catalog.ts";
import { resolveEmbed } from "../lib/embeds.ts";
import { defaultSettings, moveItem, readSettings } from "../lib/settings.ts";
import { googleSearch, parseWebUrl } from "../lib/urls.ts";

test("search trims and encodes Unicode, spaces and query delimiters", () => {
  assert.equal(googleSearch("  動畫 & 音樂 "), "https://www.google.com/search?q=%E5%8B%95%E7%95%AB%20%26%20%E9%9F%B3%E6%A8%82");
  assert.equal(googleSearch("   "), null);
  assert.doesNotThrow(() => googleSearch("\uD800"));
});

test("shortcuts allow web URLs and reject unsafe protocols or credentials", () => {
  assert.equal(parseWebUrl(" https://www.ptt.cc/ ")?.hostname, "www.ptt.cc");
  assert.equal(parseWebUrl("http://example.org")?.protocol, "http:");
  for (const invalid of ["javascript:alert(1)", "data:text/html,hello", "file:///etc/hosts", "https://a:b@example.org", "example.org", "https://exa\nmple.org"]) {
    assert.equal(parseWebUrl(invalid), null);
  }
});

test("each default player resolves to its official embed", () => {
  const hosts = ["www.youtube-nocookie.com", "clips.twitch.tv", "open.spotify.com"];
  for (const [index, provider] of mediaProviders.entries()) {
    const embed = resolveEmbed(provider, widgetCatalog[provider].url, "feifei.vercel.app");
    assert.ok(embed);
    assert.equal(new URL(embed.iframeUrl).hostname, hosts[index]);
  }
});

test("the resolver supports video, playlist, channel, VOD, clip and Spotify URL variants", () => {
  const parent = "example.org";
  assert.match(resolveEmbed("youtube", "https://youtu.be/jfKfPfyJRdk?t=60", parent)!.iframeUrl, /embed\/jfKfPfyJRdk$/);
  assert.match(resolveEmbed("youtube", "https://www.youtube.com/playlist?list=PL1234567890", parent)!.iframeUrl, /videoseries\?list=PL1234567890$/);
  for (const [url, key, value] of [
    ["https://www.twitch.tv/monstercat", "channel", "monstercat"],
    ["https://www.twitch.tv/videos/1234", "video", "v1234"],
    ["https://www.twitch.tv/monstercat/clip/Hello-World", "clip", "Hello-World"],
  ]) {
    const embed = resolveEmbed("twitch", url, parent);
    assert.ok(embed);
    const query = new URL(embed.iframeUrl).searchParams;
    assert.equal(query.get("parent"), parent);
    assert.equal(query.get("autoplay"), "false");
    assert.equal(query.get(key), value);
  }
  assert.match(resolveEmbed("spotify", "https://open.spotify.com/intl-zh/embed/track/4cOdK2wGLETKBW3PvgPWqT?si=token", parent)!.iframeUrl, /embed\/track\/4cOdK2wGLETKBW3PvgPWqT$/);
});

test("the resolver rejects lookalike domains, reserved pages and malformed IDs", () => {
  assert.equal(resolveEmbed("youtube", "https://youtube.com.example.org/watch?v=jfKfPfyJRdk", "localhost"), null);
  assert.equal(resolveEmbed("youtube", "https://youtu.be/too-short", "localhost"), null);
  assert.equal(resolveEmbed("twitch", "https://twitch.tv/directory", "localhost"), null);
  assert.equal(resolveEmbed("spotify", "https://open.spotify.com/track/abcd", "localhost"), null);
  assert.equal(resolveEmbed("spotify", "https://open.spotify.com:8888/track/4cOdK2wGLETKBW3PvgPWqT", "localhost"), null);
});

test("saved configuration round trips and invalid or future data recovers to defaults", () => {
  const defaults = defaultSettings();
  const settings = { ...defaults, theme: "lavender", mode: "dark", widgets: defaults.widgets.slice(1) };
  assert.deepEqual(readSettings(JSON.stringify(settings)), settings);
  for (const invalid of [null, "{", JSON.stringify({ ...defaults, version: 2 }), JSON.stringify({ ...defaults, widgets: [defaults.widgets[0], defaults.widgets[0]] })]) {
    assert.deepEqual(readSettings(invalid), defaults);
  }
});

test("updates the retired default YouTube stream and preserves the user's layout", () => {
  const defaults = defaultSettings();
  const retired = {
    ...defaults.widgets[0],
    title: "lofi hip hop radio",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    width: 2,
  };
  const saved = { ...defaults, widgets: [defaults.widgets[2], retired] };
  const restored = readSettings(JSON.stringify(saved));
  assert.deepEqual(restored.widgets, [defaults.widgets[2], { ...defaults.widgets[0], width: 2 }]);
  const custom = { ...retired, title: "自訂影片" };
  assert.deepEqual(readSettings(JSON.stringify({ ...saved, widgets: [custom] })).widgets, [custom]);
});

test("layout movement is immutable and handles invalid positions", () => {
  const items = ["one", "two", "three"];
  assert.deepEqual(moveItem(items, 0, 2), ["two", "three", "one"]);
  assert.deepEqual(items, ["one", "two", "three"]);
  assert.equal(moveItem(items, 0, -1), items);
});
