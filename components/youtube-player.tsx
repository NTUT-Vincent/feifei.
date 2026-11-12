'use client';
import { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react';
import { youtubeSource } from '../lib/media';

type Player = { destroy(): void; cueVideoById(value: { videoId: string; startSeconds: number }): void; loadVideoById(value: { videoId: string; startSeconds: number }): void; cuePlaylist(value: { list: string; listType: string }): void; loadPlaylist(value: { list: string; listType: string }): void; nextVideo(): void; previousVideo(): void; setShuffle(value: boolean): void; setLoop(value: boolean): void; playVideo(): void; getCurrentTime(): number };
type API = { Player: new (el: HTMLElement, options: object) => Player };
declare global { interface Window { YT?: API; onYouTubeIframeAPIReady?: () => void } }
let loading: Promise<API> | undefined;
function loadAPI(): Promise<API> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) loading = new Promise<API>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => { script.remove(); loading = undefined; reject(new Error('timeout')); }, 12000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(window.YT!); };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('load')); };
    document.head.appendChild(script);
  });
  return loading;
}
export function YouTubePlayer({ url, shuffle, loop, onShuffle, onLoop, onNext, onPrevious, hasQueue }: { url: string; shuffle: boolean; loop: boolean; onShuffle: () => void; onLoop: () => void; onNext: () => void; onPrevious: () => void; hasQueue: boolean }) {
  const host = useRef<HTMLDivElement>(null), player = useRef<Player | null>(null);
  const latest = useRef({ url, shuffle, loop, onNext, hasQueue });
  useEffect(() => { latest.current = { url, shuffle, loop, onNext, hasQueue }; });
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const previousUrl = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let configuredUrl = "";
    const element = document.createElement('div'); host.current!.appendChild(element);
    const timeout = setTimeout(() => { if (!cancelled) setError('播放器暫時無法載入。'); }, 18000);
    loadAPI().then((api) => {
      if (cancelled) return;
      player.current = new api.Player(element, { host: 'https://www.youtube-nocookie.com', playerVars: { origin: location.origin, playsinline: 1 }, events: {
        onReady: () => { clearTimeout(timeout); if (!cancelled) setReady(true); },
        onError: () => { clearTimeout(timeout); if (!cancelled) setError('這個內容無法嵌入播放，請換一個或到 YouTube 開啟。'); },
        onStateChange: (event: { data: number }) => {
          if (cancelled) return;
          if (event.data === 1) setError('');
          if (event.data === 1 && configuredUrl !== latest.current.url) { configuredUrl = latest.current.url; player.current?.setShuffle(latest.current.shuffle); player.current?.setLoop(latest.current.loop); }
          if (event.data === 0 && !youtubeSource(latest.current.url)?.list) {
            if (latest.current.hasQueue) latest.current.onNext(); else if (latest.current.loop) player.current?.playVideo();
          }
        },
      } });
    }).catch(() => { if (!cancelled) setError('播放器暫時無法載入。'); });
    return () => { cancelled = true; clearTimeout(timeout); player.current?.destroy(); player.current = null; element.remove(); };
  }, [retry]);
  useEffect(() => {
    if (!ready || !player.current) return;
    const source = youtubeSource(url); if (!source) return;
    const changed = previousUrl.current !== null && previousUrl.current !== url;
    previousUrl.current = url;
    if (source.list) player.current[changed ? 'loadPlaylist' : 'cuePlaylist']({ list: source.list, listType: 'playlist' });
    else player.current[changed ? 'loadVideoById' : 'cueVideoById']({ videoId: source.videoId, startSeconds: source.start });
  }, [url, ready]);
  useEffect(() => { if (ready) { player.current?.setShuffle(shuffle); player.current?.setLoop(loop); } }, [ready, shuffle, loop]);
  const playlist = Boolean(youtubeSource(url)?.list);
  return <>
    <div className="player-area player-youtube"><div className="youtube-host" ref={host} />{!ready && !error && <div className="player-message" role="status">載入中</div>}</div>
    {error && <div className="playback-error" role="status">{error}<button className="plain-button" onClick={() => { setError(''); setReady(false); previousUrl.current = null; setRetry((n) => n + 1); }}>重試</button></div>}
    <div className="playback-controls">
      <button className="icon-button" disabled={!ready || (!playlist && !hasQueue)} aria-label="上一個" onClick={() => playlist ? player.current?.previousVideo() : onPrevious()}><SkipBack size={17} /></button>
      <button className="icon-button" disabled={!ready || (!playlist && !hasQueue)} aria-label="下一個" onClick={() => playlist ? player.current?.nextVideo() : onNext()}><SkipForward size={17} /></button>
      <button className="icon-button" aria-label="隨機播放" aria-pressed={shuffle} onClick={onShuffle}><Shuffle size={17} /></button>
      <button className="icon-button" aria-label="循環播放" aria-pressed={loop} onClick={onLoop}><Repeat size={17} /></button>
      <a className="plain-button" href={url} target="_blank" rel="noopener noreferrer">在 YouTube 開啟 ↗</a>
    </div>
  </>;
}
