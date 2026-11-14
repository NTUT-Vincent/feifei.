# feifei. 產品功能規格（PRD）

版本：0.1（2026-11-09）｜優先級：P0 必要 / P1 下一階段 / P2 未來

## 1. 範圍
Next.js 純 Web App。桌面優先、手機可瀏覽。不以瀏覽器擴充套件或完整瀏覽器為前提。

## 2. 使用者故事與驗收條件

### FEAT-001 搜尋（P0）
**As a** 使用者，**I want** 在首頁直接搜尋，**so that** 不犧牲一般首頁的便利性。
- 顯示顯眼的搜尋輸入框，Enter 或點擊按鈕送出。
- 預設 Google；使用 `encodeURIComponent` 安全編碼關鍵字。
- 空字串不送出；預設在新分頁開啟搜尋結果，feifei. 保持原狀。
- 不宣稱可將 Google 原生結果 iframe 內嵌。
- P1 可增加搜尋引擎切換；站內結果需獨立 API 方案。

### FEAT-002 網站捷徑（P0）
- 預設顯示常用網站，使用者可新增、刪除、排序。
- 輸入 URL 時驗證 scheme，僅允許 http/https；避免 javascript: 等不安全 URL。
- 可自訂標題與圖示，外部連結以安全屬性開啟。

### FEAT-003 Widget 首頁（P0）
- 預設提供可用的首頁配置，不以空白畫布起步。
- 桌面可拖曳、調整大小、移除及還原 Widget。
- 編輯模式與一般瀏覽模式分開，避免誤觸。
- Widget 具唯一 ID、類型、設定與佈局資料。
- 手機採單欄或簡化佈局，確保不橫向溢出；手機拖曳編輯可延至 P1。

### FEAT-004 主題設定（P0）
- 支援亮色／暗色與至少 3 種預設主題。
- 自訂設定應即時預覽且可重設。
- 不依賴高耗能動畫；尊重 `prefers-reduced-motion`。

### FEAT-005 本機持久化（P0）
- 使用 localStorage 保存佈局、捷徑、主題、Widget 設定。
- 重新整理後設定保留；無需登入。
- 資料有 schema version，讀取失敗時安全回退預設。
- 提供重設功能；P1 提供 JSON 匯入／匯出。
- 不將 OAuth token、API secrets 存在可公開讀取的前端設定中。

### FEAT-006 娛樂 Widget（P0）
首批候選：
- **YouTube**：官方允許的影片／播放清單嵌入；非登入者的個人化首頁。
- **Twitch**：官方嵌入播放器，依其 parent domain 等要求配置。
- **Spotify**：官方 Embed，功能與登入能力依 Spotify 服務限制。
- **PTT**：先提供看板捷徑；公開文章卡片需確認合規資料取得、轉載與頻率限制後才開啟。
- 每個 Widget 都應具備載入中、錯誤、無內容、無法嵌入時的外連替代狀態。

### FEAT-007 內容探索（P1）
- 提供「隨便看看」入口與興趣標籤。
- 以可授權的公開內容 API／來源提供新內容；不是複製 YouTube For You、Instagram Explore、Threads For You。
- 支援重新整理推薦結果；可選擇不顯示特定來源。
- 顯示內容來源、原文連結及必要歸屬。

### FEAT-008 收藏箱（P1）
- 收藏 URL、標題、來源與建立時間。
- 能新增、刪除、開啟；自動擷取 metadata 僅在來源允許且安全時執行。
- 伺服器端擷取需防 SSRF、限制重導與私有網路位址。

### FEAT-009 多空間與模板（P2）
- 支援日常／音樂／遊戲等獨立配置。
- 可分享不含個資或秘密的模板；套用前預覽。

### FEAT-010 帳號同步（P2）
- 選擇性登入，跨裝置同步。
- 未登入使用者的核心功能不可被移除。
- 定義衝突解決、資料刪除及隱私政策。

## 3. 資料模型（草案）
```ts
type WidgetType = "shortcuts" | "youtube" | "twitch" | "spotify" | "ptt";
type WidgetInstance = {
  id: string;
  type: WidgetType;
  title?: string;
  settings: Record<string, unknown>;
};
type LayoutItem = {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number;
};
type Shortcut = { id: string; title: string; url: string; icon?: string };
type FeifeiSettings = {
  version: 1;
  theme: string;
  widgets: WidgetInstance[];
  desktopLayout: LayoutItem[];
  shortcuts: Shortcut[];
};
```
資料模型需透過 runtime schema（如 Zod）驗證與 migration。

## 4. 架構草案
```text
Next.js App Router
  ├─ Homepage / Search / Widget Grid
  ├─ Widget Registry (type → component + config schema)
  ├─ Theme & Layout State
  ├─ localStorage persistence
  └─ Server API adapters (only when necessary)
       ├─ Content providers
       ├─ Cache / rate limiting
       └─ API key protection
```
建議 React + TypeScript + CSS variables；Grid 採可維護的 responsive layout library。第三方平台以獨立 Adapter 隔離。

## 5. 技術與安全約束
- iframe 受 CSP、X-Frame-Options、Same-Origin Policy、第三方 Cookie 限制；不可保證任何網站能內嵌。
- 不嘗試跨來源讀取 iframe DOM／Cookie。
- 不規避串流保護、平台限制或授權。
- 不使用不明來源的影片串流代理。
- 公開 API 資料遵循配額、授權、著作權與標示要求。
- 使用者輸入 URL 應驗證，避免 XSS、open redirect 與 SSRF。
- 嵌入播放器採最小必要 permissions、合適的 iframe sandbox / allow 設定。

## 6. 非功能性要求
- 手機與桌面不產生水平溢出。
- 基本功能在第三方 API 不可用時仍可使用。
- 首頁避免一次載入所有重型 iframe；可使用 lazy loading。
- 鍵盤可操作搜尋與主要設定；對比與焦點可辨識。
- 內容與介面預留 i18n：zh-TW / en。
- 對瀏覽行為與搜尋字詞採資料最小化原則。

## 7. MVP Definition of Done
- 新訪客無需登入即可搜尋與開啟捷徑。
- 可以新增／移除／拖曳至少一種 Widget，重新整理後保持配置。
- 可切換主題並重設預設值。
- YouTube／Twitch／Spotify 至少各有一個依官方要求可正常使用的示範嵌入，失敗時有外連。
- 桌面與手機常見寬度不溢出。
- 第三方 API／嵌入失效不影響首頁其他功能。
- README 清楚列出支援、限制與設定方法。

## 8. 不包含於 MVP
完整網頁瀏覽器、Google 搜尋結果 iframe、各社群平台個人化 Feed 複製、動畫瘋串流播放、跨平台登入狀態擷取、跨裝置帳號同步、AI 推薦模型。

## 9. 建議開發順序
1. App Shell、主題、搜尋、捷徑。
2. Widget Registry、Grid、編輯模式。
3. localStorage schema 與還原。
4. 官方 Embed Widgets 與失敗處理。
5. 手機／無障礙／效能測試。
6. 小規模使用者驗證，決定 P1。

## Optional connected accounts

Users can connect YouTube, Twitch and approved Spotify development accounts without registering a Feifei account. Account identity belongs to a 30-day browser guest session. In-card media selection supports YouTube subscriptions/uploads and playlists/videos, Twitch following/live feeds, and Spotify playlists. Public search and URL playback remain independent. Media selections reuse existing playback and queues; no media-selection modal or explanatory subtitle is introduced. OAuth does not log the user into platform embeds. Cross-device sync, personalized home-feed scraping and Spotify Web Playback SDK are outside this release.
