"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { widgetCatalog } from "../lib/catalog";
import { resolveEmbed, type Embed } from "../lib/embeds";
import type { Widget } from "../lib/settings";
import { Dialog } from "./dialog";

export function MediaPlayer({ widget, onClose }: { widget: Widget; onClose: () => void }) {
  return (
    <Dialog title={widget.title} onClose={onClose} wide>
      {widget.type !== "ptt" && <EmbedPlayer provider={widget.type} url={widget.url} title={widget.title} />}
    </Dialog>
  );
}

function EmbedPlayer({ provider, url, title }: { provider: Exclude<Widget["type"], "ptt">; url: string; title: string }) {
  const [result, setResult] = useState<Embed | null | undefined>(undefined);
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "error">("loading");
  const [narrow, setNarrow] = useState<boolean | null>(null);
  const [retry, setRetry] = useState(0);
  const playerArea = useRef<HTMLDivElement>(null);
  const fallback = resolveEmbed(provider, url, "localhost")?.externalUrl ?? widgetCatalog[provider].home;
  const limited = provider === "twitch" && narrow === true;
  const canShow = result && (provider !== "twitch" || narrow === false);

  useEffect(() => {
    if (provider !== "twitch" || !playerArea.current) return;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 400));
    observer.observe(playerArea.current);
    return () => observer.disconnect();
  }, [provider]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
      setResult(null);
    }, 8000);

    const query = new URLSearchParams({ provider, url });
    fetch(`/api/embed?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Embed request failed");
        return await response.json() as Embed;
      })
      .then((embed) => { if (!controller.signal.aborted) setResult(embed); })
      .catch(() => { if (!controller.signal.aborted) setResult(null); })
      .finally(() => window.clearTimeout(timer));

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [provider, url, retry]);

  useEffect(() => {
    if (!canShow || frameStatus !== "loading") return;
    const timer = window.setTimeout(() => setFrameStatus("error"), 12000);
    return () => window.clearTimeout(timer);
  }, [canShow, frameStatus]);

  const failed = result === null || frameStatus === "error";
  const showFrame = canShow && frameStatus !== "error";

  return (
    <>
      <div ref={playerArea} className={`player-area player-${provider}`} aria-busy={!failed && !limited && frameStatus === "loading"}>
        {showFrame && (
          <iframe
            title={`${widgetCatalog[provider].name} · ${title}`}
            src={result.iframeUrl}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            allowFullScreen
            onLoad={() => setFrameStatus("ready")}
            onError={() => setFrameStatus("error")}
          />
        )}
        {(failed || limited || frameStatus === "loading") && (
          <div className="player-message" role="status">
            {limited ? "目前畫面太窄，請到 Twitch 播放。" : failed ? "播放器暫時無法載入。" : <><LoaderCircle className="spinner" size={20} />載入中</>}
          </div>
        )}
      </div>
      <div className="player-actions">
        {failed && !limited && <button type="button" className="plain-button" onClick={() => {
          setResult(undefined);
          setFrameStatus("loading");
          setRetry((value) => value + 1);
        }}>重試</button>}
        <a className="solid-button" href={result?.externalUrl ?? fallback} target="_blank" rel="noopener noreferrer">
          在 {widgetCatalog[provider].name} 開啟 <ArrowUpRight size={16} />
        </a>
      </div>
    </>
  );
}
