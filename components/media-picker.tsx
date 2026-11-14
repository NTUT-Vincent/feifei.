'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MediaLibrary } from './media-library';
import { Play, Plus, Trash2 } from 'lucide-react';
import type { Widget } from '../lib/settings';
import { validMedia, type MediaItem } from '../lib/media';
export function MediaPicker({ widget, onChange, onPlay }: { widget: Widget; onChange: (patch: Partial<Widget>) => void; onPlay: () => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<(MediaItem & { detail?: string })[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function choose(item: MediaItem, add: boolean) {
    if (widget.type === 'ptt' || !validMedia(widget.type, item.url)) { setError('請貼上這個平台的有效網址。'); return; }
    const queue = widget.queue ?? [];
    if (add && queue.length >= 30) { setError('待播清單最多 30 個項目。'); return; }
    if (add) onChange({ queue: queue.some((entry) => entry.url === item.url) ? queue : [...queue, item] });
    else { onChange({ url: item.url, title: item.title.slice(0, 40) }); onPlay(); }
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setItems([]); setError(''); setBusy(false);
    const value = query.trim();
    if (widget.type !== 'ptt' && validMedia(widget.type, value)) { setItems([{ url: value, title: '我的內容' }]); return; }
    if (/^https?:/i.test(value) || widget.type === 'spotify') { setError('請貼上這個平台支援的影片、頻道或播放清單網址。'); return; }
    if (!value) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/media/search?${new URLSearchParams({ provider: widget.type, q: value })}`, { signal: request.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!request.signal.aborted) { setItems(data.items); if (!data.items.length) setError('找不到內容，換個關鍵字試試。'); }
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : '搜尋失敗'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  return <div className="media-picker">
    {widget.type !== 'ptt' && <MediaLibrary provider={widget.type} choose={choose} />}
    <form className="media-search" onSubmit={submit}>
      <input aria-label="搜尋或貼上網址" placeholder={widget.type === 'spotify' ? '貼上 Spotify 網址' : '搜尋或貼上網址'} value={query} maxLength={2048} onChange={(e) => setQuery(e.target.value)} />
      <button className="solid-button" disabled={busy || !query.trim()}>{busy ? '搜尋中' : '尋找'}</button>
    </form>
    {error && <p className="form-error" role="status">{error}</p>}
    <ul className="media-results">{items.map((item) => <li key={item.url}>
      <span className="media-result-title">{item.title}{item.detail && <small>{item.detail}</small>}</span>
      <button className="icon-button" aria-label={`播放 ${item.title}`} onClick={() => choose(item, false)}><Play size={16} /></button>
      <button className="icon-button" aria-label={`加入 ${item.title}`} onClick={() => choose(item, true)}><Plus size={16} /></button>
    </li>)}</ul>
    {(widget.queue?.length ?? 0) > 0 && <div className="queue-header">待播清單 <span>{widget.queue!.length}/30</span></div>}
    <ul className="media-results">{widget.queue?.map((item, index) => <li key={`${item.url}-${index}`}>
      <button className="queue-title" aria-current={widget.url === item.url ? 'true' : undefined} onClick={() => choose(item, false)}>{index + 1}. {item.title}</button>
      <button className="icon-button" aria-label={`移除待播 ${item.title}`} onClick={() => onChange({ queue: widget.queue!.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
    </li>)}</ul>
  </div>;
}
