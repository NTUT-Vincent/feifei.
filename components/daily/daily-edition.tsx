import type { DailyEdition as Edition } from "../../lib/daily/schema";

const labels = { mood: "今天的廢話", news: "隨便看看", joke: "笑一下", story: "原創小故事" };
export function DailyEdition({ edition }: { edition: Edition | null }) {
  if (!edition) return null;
  return <section className="daily-edition" aria-labelledby="daily-heading">
    <header className="section-header"><h2 id="daily-heading">每日小報</h2><time dateTime={edition.layout.date}>{edition.layout.date.replaceAll("-", ".")}</time></header>
    <div className="daily-grid">
      {edition.layout.sections.map((section) => {
        const headingId = `daily-${section.id}`;
        let content;
        switch (section.type) {
          case "mood": {
            const item = edition.mood.find((item) => item.id === section.contentId)!;
            content = <h3 id={headingId} className="daily-mood-text">{item.text}</h3>;
            break;
          }
          case "news": {
            const item = edition.news.find((item) => item.id === section.contentId)!;
            content = <><h3 id={headingId}>{item.title}</h3><p>{item.summary}</p><a className="daily-source" href={item.url} target="_blank" rel="noopener noreferrer">{item.source} ↗ <time dateTime={item.publishedAt}>{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit" }).format(new Date(item.publishedAt))}</time></a></>;
            break;
          }
          case "joke": {
            const item = edition.jokes.find((item) => item.id === section.contentId)!;
            content = <><h3 id={headingId}>{item.title}</h3><p>{item.setup}</p><details><summary>揭曉</summary><p>{item.punchline}</p></details></>;
            break;
          }
          case "story": {
            const item = edition.stories.find((item) => item.id === section.contentId)!;
            content = <><h3 id={headingId}>{item.title}</h3><p>{item.excerpt}</p><details><summary>讀小故事</summary><div className="daily-story-body">{item.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div></details></>;
            break;
          }
        }
        return <article key={section.id} className={`daily-card daily-${section.type} daily-size-${section.size}`} aria-labelledby={headingId}><span className="daily-label">{labels[section.type]}</span>{content}</article>;
      })}
    </div>
  </section>;
}
