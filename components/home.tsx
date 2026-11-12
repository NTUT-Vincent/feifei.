"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Moon, Pencil, Plus, Search, Settings2, Sun, Trash2,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { themes, widgetCatalog, widgetTypes } from "../lib/catalog";
import {
  defaultSettings, defaultWidget, MAX_SHORTCUTS, MAX_WIDGETS, moveItem, readSettings,
  type Settings, type Shortcut, type Widget,
} from "../lib/settings";
import { readSavedSettings, serverSettings, subscribeSettings, updateSettings } from "../lib/settings-store";
import { googleSearch } from "../lib/urls";
import { Dialog } from "./dialog";
import { ShortcutForm, WidgetForm } from "./edit-forms";
import { SiteIcon } from "./icons";
import { WidgetCard } from "./widget-card";

type Overlay =
  | { type: "preferences" | "reset" | "add-widget" }
  | { type: "shortcut"; item?: Shortcut }
  | { type: "widget"; item: Widget };

export function Home() {
  const raw = useSyncExternalStore(subscribeSettings, readSavedSettings, serverSettings);
  const settings = useMemo(() => readSettings(raw), [raw]);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const close = () => setOverlay(null);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = googleSearch(String(new FormData(event.currentTarget).get("q") ?? ""));
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function saveShortcut(item: Shortcut) {
    updateSettings((current) => ({
      ...current,
      shortcuts: current.shortcuts.some(({ id }) => id === item.id)
        ? current.shortcuts.map((shortcut) => shortcut.id === item.id ? item : shortcut)
        : [...current.shortcuts, item].slice(0, MAX_SHORTCUTS),
    }));
    close();
  }

  function moveWidget(id: string, offset: number) {
    updateSettings((current) => {
      const from = current.widgets.findIndex((widget) => widget.id === id);
      return { ...current, widgets: moveItem(current.widgets, from, from + offset) };
    });
  }

  function finishDrag() {
    setDragging(null);
    setDropTarget(null);
  }

  function dropWidget(event: DragEvent<HTMLElement>, target: string) {
    event.preventDefault();
    if (dragging) {
      updateSettings((current) => {
        const from = current.widgets.findIndex(({ id }) => id === dragging);
        const to = current.widgets.findIndex(({ id }) => id === target);
        return { ...current, widgets: moveItem(current.widgets, from, to) };
      });
    }
    finishDrag();
  }

  return (
    <div className="site" data-theme={settings.theme} data-mode={settings.mode}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="feifei. 首頁"><span className="brand-mark" aria-hidden>✿</span>feifei<span>.</span></Link>
          <div className="topbar-actions">
            <button type="button" className="icon-button mode-toggle" title={settings.mode === "light" ? "切換深色" : "切換淺色"} aria-label={settings.mode === "light" ? "切換深色" : "切換淺色"} onClick={() =>
              updateSettings((current) => ({ ...current, mode: current.mode === "light" ? "dark" : "light" }))
            }>{settings.mode === "light" ? <Moon size={18} /> : <Sun size={19} />}</button>
            <button type="button" className="outline-button" onClick={() => setOverlay({ type: "preferences" })}><Settings2 size={17} />設定</button>
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="hero" aria-labelledby="brand-heading">
          <div className="hero-content">
            <h1 id="brand-heading">feifei<span>.</span></h1>
            <form className="search" role="search" onSubmit={search}>
              <Search size={20} aria-hidden />
              <input name="q" type="search" aria-label="Google 搜尋" placeholder="Google 搜尋" maxLength={500} autoComplete="off" />
              <button type="submit" className="search-submit" aria-label="搜尋"><ArrowRight size={21} /></button>
            </form>
          </div>
          <div className="hero-art">
            <Image src="/sleepy-cat.webp" alt="" fill priority sizes="(max-width: 700px) 100vw, 550px" />
          </div>
        </section>

        <section className="shortcuts" aria-labelledby="shortcuts-heading">
          <header className="section-header">
            <h2 id="shortcuts-heading">捷徑</h2>
            <button type="button" className="plain-button" disabled={settings.shortcuts.length >= MAX_SHORTCUTS} onClick={() => setOverlay({ type: "shortcut" })}><Plus size={17} />新增</button>
          </header>
          <ul className="shortcut-list">
            {settings.shortcuts.map((item, index) => (
              <li key={item.id} className="shortcut-item">
                <a className="shortcut" href={item.url} target="_blank" rel="noopener noreferrer" title={item.title}>
                  <span className={`shortcut-icon ${item.icon}`}><SiteIcon icon={item.icon} size={19} /></span>
                  <span className="shortcut-title">{item.title}</span>
                  <ArrowUpRight size={14} className="shortcut-arrow" />
                </a>
                {editing && <div className="shortcut-edit-actions">
                  <button type="button" className="icon-button" aria-label={`${item.title} 捷徑往前移`} disabled={index === 0} onClick={() => updateSettings((current) => ({ ...current, shortcuts: moveItem(current.shortcuts, index, index - 1) }))}><ArrowLeft size={15} /></button>
                  <button type="button" className="icon-button" aria-label={`${item.title} 捷徑往後移`} disabled={index === settings.shortcuts.length - 1} onClick={() => updateSettings((current) => ({ ...current, shortcuts: moveItem(current.shortcuts, index, index + 1) }))}><ArrowRight size={15} /></button>
                  <button type="button" className="icon-button" aria-label={`編輯捷徑 ${item.title}`} onClick={() => setOverlay({ type: "shortcut", item })}><Pencil size={14} /></button>
                  <button type="button" className="icon-button delete-button" aria-label={`刪除捷徑 ${item.title}`} onClick={() => updateSettings((current) => ({ ...current, shortcuts: current.shortcuts.filter(({ id }) => id !== item.id) }))}><Trash2 size={15} /></button>
                </div>}
              </li>
            ))}
          </ul>
        </section>

        <section className="widgets" aria-labelledby="widgets-heading">
          <header className="section-header">
            <h2 id="widgets-heading">小工具</h2>
            <div className="section-actions">
              {(editing || settings.widgets.length === 0) && <button type="button" className="plain-button" disabled={settings.widgets.length >= MAX_WIDGETS} onClick={() => setOverlay({ type: "add-widget" })}><Plus size={17} />新增小工具</button>}
              <button type="button" className={editing ? "solid-button" : "outline-button"} aria-pressed={editing} onClick={() => { setEditing(!editing); finishDrag(); }}>
                {!editing && <Pencil size={15} />}{editing ? "完成" : "編輯版面"}
              </button>
            </div>
          </header>
          <div className="widget-grid">
            {settings.widgets.map((widget, index) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                expanded={activePlayer === widget.id}
                onExpand={(open) => setActivePlayer(open ? widget.id : null)}
                onChange={(patch) => updateSettings((current) => ({ ...current, widgets: current.widgets.map((item) => item.id === widget.id ? { ...item, ...patch } : item) }))}
                editing={editing}
                canMoveLeft={index > 0}
                canMoveRight={index < settings.widgets.length - 1}
                dragging={dragging === widget.id}
                dropTarget={dropTarget === widget.id && dragging !== widget.id}
                onEdit={() => setOverlay({ type: "widget", item: widget })}
                onRemove={() => updateSettings((current) => ({ ...current, widgets: current.widgets.filter(({ id }) => id !== widget.id) }))}
                onMove={(offset) => moveWidget(widget.id, offset)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", widget.id);
                  setDragging(widget.id);
                }}
                onDragEnd={finishDrag}
                onDragOver={(event) => {
                  if (!dragging) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dropTarget !== widget.id) setDropTarget(widget.id);
                }}
                onDrop={(event) => dropWidget(event, widget.id)}
              />
            ))}
          </div>
        </section>
      </main>

      {overlay?.type === "preferences" && (
        <Dialog title="設定" onClose={close}>
          <Preferences settings={settings} onReset={() => setOverlay({ type: "reset" })} />
        </Dialog>
      )}
      {overlay?.type === "reset" && (
        <Dialog title="還原預設首頁？" onClose={close}>
          <div className="confirm-actions">
            <button type="button" className="outline-button" onClick={close}>取消</button>
            <button type="button" className="solid-button" onClick={() => { updateSettings(defaultSettings); setEditing(false); close(); }}>還原</button>
          </div>
        </Dialog>
      )}
      {overlay?.type === "shortcut" && (
        <Dialog title={overlay.item ? "編輯捷徑" : "新增捷徑"} onClose={close}>
          <ShortcutForm shortcut={overlay.item} onSave={saveShortcut} />
        </Dialog>
      )}
      {overlay?.type === "add-widget" && (
        <Dialog title="新增小工具" onClose={close}>
          <div className="widget-picker">
            {widgetTypes.map((type) => <button type="button" className="outline-button" key={type} onClick={() => {
              const item = defaultWidget(type, crypto.randomUUID());
              updateSettings((current) => ({ ...current, widgets: [...current.widgets, item].slice(0, MAX_WIDGETS) }));
              close();
            }}><span className={`service-icon ${type}`}><SiteIcon icon={type} size={16} /></span>{widgetCatalog[type].name}<Plus size={16} /></button>)}
          </div>
        </Dialog>
      )}
      {overlay?.type === "widget" && (
        <Dialog title="編輯小工具" onClose={close}>
          <WidgetForm widget={overlay.item} onSave={(item) => {
            updateSettings((current) => ({ ...current, widgets: current.widgets.map((widget) => widget.id === item.id ? item : widget) }));
            close();
          }} />
        </Dialog>
      )}
    </div>
  );
}

function Preferences({ settings, onReset }: { settings: Settings; onReset: () => void }) {
  return (
    <div className="preferences">
      <fieldset>
        <legend>模式</legend>
        <div className="preference-options">
          {(["light", "dark"] as const).map((mode) => <button type="button" className="outline-button" aria-pressed={mode === settings.mode} key={mode} onClick={() => updateSettings((current) => ({ ...current, mode }))}>
            {mode === "light" ? <Sun size={17} /> : <Moon size={17} />}{mode === "light" ? "淺色" : "深色"}
          </button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>主題</legend>
        <div className="preference-options">
          {themes.map((theme) => <button type="button" className="outline-button" aria-pressed={theme.id === settings.theme} key={theme.id} onClick={() => updateSettings((current) => ({ ...current, theme: theme.id }))}>
            <span className="swatch" style={{ backgroundColor: theme.swatch }} />{theme.title}
          </button>)}
        </div>
      </fieldset>
      <button type="button" className="plain-button reset-button" onClick={onReset}>還原預設首頁</button>
    </div>
  );
}
