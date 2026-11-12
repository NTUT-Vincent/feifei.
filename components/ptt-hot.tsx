"use client";

import { ArrowUpRight, Flame, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { pttCategories, type PttHotResponse } from "../lib/ptt";

const dateFormat = new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" });

export function PttHot() {
  const [data, setData] = useState<PttHotResponse | null>(null);
  const [category, setCategory] = useState<keyof typeof pttCategories>("all");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let active = true;
    fetch("/api/ptt", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("PTT is unavailable");
        const result: PttHotResponse = await response.json();
        if (active) setData(result);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const items = (data?.items ?? []).filter((item) => category === "all" || item.category === category);
  const visible = items.slice(page * 9, (page + 1) * 9);

  return (
    <section className="news-wall ptt-hot-wall" aria-labelledby="ptt-heading" aria-busy={loading}>
      <header className="section-header">
        <h2 id="ptt-heading">PTT 熱門</h2>
        <button type="button" className="plain-button" disabled={items.length <= 9 || loading} onClick={() => setPage((current) => (current + 1) % Math.ceil(items.length / 9))}>
          <RefreshCw size={15} />換一批
        </button>
      </header>
      <div className="news-filters" role="group" aria-label="PTT 話題分類">
        {Object.entries(pttCategories).map(([key, label]) => (
          <button type="button" className="outline-button" key={key} aria-pressed={category === key}
            onClick={() => { setCategory(key as keyof typeof pttCategories); setPage(0); }}>{label}</button>
        ))}
      </div>
      {loading ? <p className="news-state" role="status">正在逛 PTT…</p> : error ? (
        <div className="news-state" role="status">
          <p>PTT 暫時無法讀取</p>
          <button type="button" className="outline-button" onClick={() => { setError(false); setLoading(true); setAttempt((value) => value + 1); }}>再試一次</button>
        </div>
      ) : <>
        {data?.unavailableBoards.length ? <p className="news-notice" role="status">部分看板暫時無法讀取</p> : null}
        {visible.length ? <ul className="news-grid">
          {visible.map((item) => (
            <li key={item.id}>
              <a className="news-card ptt-hot-card" href={item.url} target="_blank" rel="noopener noreferrer">
                <div className="news-card-top">
                  <span className="news-category">{item.board}</span>
                  <span className="ptt-hot-score"><Flame size={14} aria-hidden="true" />{item.pushScore >= 100 ? "爆" : item.pushScore}</span>
                </div>
                <h3>{item.title}</h3>
                <div className="news-meta">
                  <span>PTT</span>
                  <time dateTime={item.publishedAt}>{dateFormat.format(new Date(item.publishedAt))}</time>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </div>
              </a>
            </li>
          ))}
        </ul> : <p className="news-state" role="status">這個分類最近沒有熱門文章</p>}
      </>}
    </section>
  );
}
