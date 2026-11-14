'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Plus } from 'lucide-react';
import { useConnections } from './connected-accounts';
import type { MediaItem } from '../lib/media';
import type { LibraryItem } from '../lib/media-library';
export function MediaLibrary({ provider, choose }: { provider: string; choose: (item: MediaItem, add: boolean) => void }) {
  const { connections, error: connectionError, busy: connecting, connect } = useConnections();
  const connection = connections.find((c) => c.provider === provider);
  const [source, setSource] = useState(provider === 'twitch' ? 'live' : 'playlists');
  const [collection, setCollection] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const clear = () => { controller.current?.abort(); setItems([]); setCursor(null); setCollection(''); setBusy(false); };
    window.addEventListener('feifei:connections', clear);
    return () => window.removeEventListener('feifei:connections', clear);
  }, []);
  async function load(nextSource: string, nextCollection = '', nextCursor = '', channel = '') {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setError('');
    if (!nextCursor) { setItems([]); setCursor(null); }
    setSource(nextSource); setCollection(nextCollection);
    try {
      const params = new URLSearchParams({ provider, source: nextSource, ...(nextCollection ? { collection: nextCollection } : {}), ...(nextCursor ? { cursor: nextCursor } : {}) });
      if (channel) {
        const response = await fetch(`/api/media/library?${new URLSearchParams({ provider, source: 'channel', channel })}`, { signal: request.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        nextCollection = data.collection; params.set('collection', nextCollection); setCollection(nextCollection);
      }
      const response = await fetch(`/api/media/library?${params}`, { signal: request.signal, cache: 'no-store' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (!request.signal.aborted) { setItems((previous) => nextCursor ? [...previous, ...data.items].filter((item, index, all) => all.findIndex((x) => x.id === item.id) === index) : data.items); setCursor(data.nextCursor); if (!data.items.length && !nextCursor) setError('目前沒有內容。'); }
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : '無法讀取內容'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  if (!connection?.connected) return <div className="library-connect"><button className="outline-button" disabled={!connection?.enabled || Boolean(connecting)} onClick={() => connect(provider)}>{connecting ? '連結中' : connection?.enabled ? '連結帳號' : '帳號連結尚未開放'}</button>{connectionError && <p className="form-error" role="status">{connectionError}</p>}</div>;
  const sources = provider === 'youtube' ? [['playlists', '我的清單'], ['subscriptions', '我的訂閱']] : provider === 'twitch' ? [['live', '正在直播'], ['following', '追隨中']] : [['playlists', '我的清單']];
  return <div className="media-library"><div className="library-tabs">{sources.map(([key, label]) => <button key={key} className="outline-button" aria-pressed={source === key} onClick={() => load(key)}>{label}</button>)}{collection && <button className="plain-button" onClick={() => load('playlists')}>返回清單</button>}</div>
    {(error || connectionError) && <p className="form-error" role="status">{error || connectionError}</p>}
    <ul className="media-results">{items.map((item) => <li key={item.id}><span className="media-result-title">{item.channel || item.collection ? <button className="queue-title" onClick={() => load('videos', item.collection, '', item.channel)}>{item.title}</button> : item.title}{item.detail && <small>{item.detail}</small>}</span>
      {item.url && <><button className="icon-button" aria-label={`播放 ${item.title}`} onClick={() => choose({ title: item.title, url: item.url! }, false)}><Play size={16} /></button><button className="icon-button" aria-label={`加入 ${item.title}`} onClick={() => choose({ title: item.title, url: item.url! }, true)}><Plus size={16} /></button></>}
    </li>)}</ul>
    {busy && <p role="status">載入中…</p>}{cursor && <button className="outline-button" disabled={busy} onClick={() => load(source, collection, cursor)}>載入更多</button>}
  </div>;
}
