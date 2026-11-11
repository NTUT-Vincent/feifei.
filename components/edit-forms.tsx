"use client";

import { useState, type FormEvent } from "react";
import { widgetCatalog } from "../lib/catalog";
import { resolveEmbed } from "../lib/embeds";
import { shortcutIcons, type Shortcut, type Widget } from "../lib/settings";
import { parseWebUrl } from "../lib/urls";
import { SiteIcon } from "./icons";

const iconLabels: Record<Shortcut["icon"], string> = {
  link: "連結", youtube: "YouTube", twitch: "Twitch", spotify: "Spotify", ptt: "PTT",
  bahamut: "巴哈姆特", film: "影片", music: "音樂", game: "遊戲", heart: "愛心", star: "星星",
};

export function ShortcutForm({ shortcut, onSave }: { shortcut?: Shortcut; onSave: (item: Shortcut) => void }) {
  const [icon, setIcon] = useState<Shortcut["icon"]>(shortcut?.icon ?? "link");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    const url = parseWebUrl(String(fields.get("url")));
    if (!title || !url) {
      setError(title ? "請輸入有效的 http 或 https 網址。" : "請輸入捷徑名稱。");
      return;
    }
    onSave({ id: shortcut?.id ?? crypto.randomUUID(), title, url: url.href, icon });
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>名稱<input name="title" defaultValue={shortcut?.title} required maxLength={40} /></label>
      <label>網址<input name="url" type="text" inputMode="url" placeholder="https://…" defaultValue={shortcut?.url} required maxLength={2048} /></label>
      <fieldset>
        <legend>圖示</legend>
        <div className="icon-picker">
          {shortcutIcons.map((item) => (
            <button key={item} className={`icon-button shortcut-icon ${item}`} type="button" title={iconLabels[item]} aria-label={iconLabels[item]} aria-pressed={item === icon} onClick={() => setIcon(item)}>
              <SiteIcon icon={item} size={17} />
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="solid-button form-submit" type="submit">儲存</button>
    </form>
  );
}

export function WidgetForm({ widget, onSave }: { widget: Widget; onSave: (item: Widget) => void }) {
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    const url = widget.type === "ptt" ? widget.url : String(fields.get("url")).trim();
    const width = Number(fields.get("width")) as Widget["width"];
    if (!title || (widget.type !== "ptt" && !resolveEmbed(widget.type, url, "localhost"))) {
      setError(title ? `請輸入支援的 ${widgetCatalog[widget.type].name} 網址。` : "請輸入小工具名稱。");
      return;
    }
    onSave({ ...widget, title, url, width });
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>名稱<input name="title" defaultValue={widget.title} required maxLength={40} /></label>
      {widget.type !== "ptt" && <label>網址<input name="url" type="text" inputMode="url" defaultValue={widget.url} required maxLength={2048} /></label>}
      <label>桌面寬度
        <select name="width" defaultValue={widget.width}>
          <option value={1}>一欄</option><option value={2}>兩欄</option><option value={3}>整列</option>
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="solid-button form-submit" type="submit">儲存</button>
    </form>
  );
}
