"use client";

import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { pttCategories, type PttResponse } from "../lib/ptt-shared";

const dateFormat = new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" });

export function PttHot() {
  const [data, setData] = useState<PttResponse | null>(null);
  const [category, setCategory] = useState<keyof typeof pttCategories>("all");
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<"hot" | "latest">("hot");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let active = true;
    fetch(`/api/ptt?mode=${mode}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("PTT is unavailable");
        const result: PttResponse = await response.json();
        if (active) setData(result);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt, mode]);

  const items = (data?.items ?? []).filter((item) => category === "all" || item.category === category);
  const visible = items.slice(page * 9, (page + 1) * 9);

  return (
    <section className="news-wall ptt-hot-wall" aria-labelledby="ptt-heading" aria-busy={loading}>
      <header className="section-header">
        <h2 id="ptt-heading">PTT 討論</h2>
        <button type="button" className="plain-button" disabled={items.length <= 9 || loading} onClick={() => setPage((current) => (current + 1) % Math.ceil(items.length / 9))}>
          <RefreshCw size={15} />換一批
        </button>
      </header>
      <div className="news-filters" role="group" aria-label="PTT 排序">
        {(["hot", "latest"] as const).map((value) => (
          <button type="button" className="outline-button" key={value} aria-pressed={mode === value}
            onClick={() => { setMode(value); setPage(0); setLoading(true); setError(false); }}>{value === "hot" ? "熱門" : "最新"}</button>
        ))}
      </div>
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
                  <ArrowUpRight size={16} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <div className="news-meta">
                  <span>{mode === "hot" ? `推文 ${item.heat === 100 ? "爆" : item.heat ?? "—"}` : "PTT"}</span>
                  {mode === "latest" ? <time dateTime={item.publishedAt}>{dateFormat.format(new Date(item.publishedAt))}</time> : null}

                </div>
              </a>
            </li>
          ))}
        </ul> : category === "tech" ? <div className="news-state" role="status">
          <p>科技看板暫時無法讀取</p>
          <a className="outline-button" href="https://www.ptt.cc/bbs/PC_Shopping/index.html" target="_blank" rel="noopener noreferrer">前往 PC_Shopping</a>
        </div> : <p className="news-state" role="status">這個分類最近沒有新討論</p>}
      </>}
    </section>
  );
}
