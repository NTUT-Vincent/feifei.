"use client";

import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { newsCategories, type NewsResponse } from "../lib/news";

const dateFormat = new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" });

export function NewsWall() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [category, setCategory] = useState<keyof typeof newsCategories>("all");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let active = true;
    fetch("/api/news", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("News unavailable");
        const result: NewsResponse = await response.json();
        if (active) setData(result);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  const items = (data?.items ?? []).filter((item) => category === "all" || item.category === category);
  const visible = items.slice(page * 9, (page + 1) * 9);

  return (
    <section className="news-wall" aria-labelledby="news-heading" aria-busy={loading}>
      <header className="section-header">
        <h2 id="news-heading">新鮮事</h2>
        <button type="button" className="plain-button" disabled={items.length <= 9 || loading} onClick={() => setPage((current) => (current + 1) % Math.ceil(items.length / 9))}>
          <RefreshCw size={15} />換一批
        </button>
      </header>
      <div className="news-filters" role="group" aria-label="新聞分類">
        {Object.entries(newsCategories).map(([key, label]) => (
          <button key={key} type="button" className="outline-button" aria-pressed={category === key} onClick={() => { setCategory(key as keyof typeof newsCategories); setPage(0); }}>{label}</button>
        ))}
      </div>
      {loading ? <p className="news-state" role="status">正在找新鮮事…</p> : error ? (
        <div className="news-state" role="status">
          <p>暫時讀不到新鮮事</p>
          <button type="button" className="outline-button" onClick={() => { setError(false); setLoading(true); setAttempt((value) => value + 1); }}>再試一次</button>
        </div>
      ) : <>
        {data?.unavailableSources.length ? <p className="news-notice" role="status">部分來源暫時無法讀取</p> : null}
        {visible.length ? <ul className="news-grid">
          {visible.map((item) => <li key={item.id}>
            <a className="news-card" href={item.url} target="_blank" rel="noopener noreferrer">
              <div className="news-card-top"><span className="news-category">{newsCategories[item.category]}</span><ArrowUpRight size={16} aria-hidden /></div>
              <h3>{item.title}</h3>
              <div className="news-meta"><span>{item.source}</span><time dateTime={item.publishedAt}>{dateFormat.format(new Date(item.publishedAt))}</time></div>
            </a>
          </li>)}
        </ul> : <p className="news-state" role="status">這個分類暫時沒有新消息</p>}
      </>}
    </section>
  );
}
