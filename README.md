# feifei. 廢廢

> A little place to do nothing.  
> 一個沒什麼用，卻想每天打開的首頁。

feifei. 是一個以放鬆、探索與個人化為核心的 **Web App**。使用者可以搜尋網路、建立常用網站捷徑、自由排列娛樂 Widgets，在自己喜歡的空間裡看影片、聽音樂、閱讀討論與發現新內容。

## 產品原則
- **娛樂優先**：不是待辦清單、KPI 或工作儀表板。
- **開箱即用**：無須登入即可使用漂亮的預設首頁。
- **自由但不複雜**：可調整排版、主題與內容，預設體驗仍完整。
- **尊重平台限制**：僅使用合法、允許的 API、嵌入與公開資料來源。
- **台灣先行，全球可用**：繁體中文優先，保留英文及國際內容擴充能力。

## 文件
- [產品企畫書](docs/PRODUCT_PLAN.md)
- [產品功能規格（PRD）](docs/PRODUCT_SPEC.md)

## 已支援

- Google 搜尋在新分頁開啟。常用捷徑可自訂名稱、網址、圖示與順序。
- 在「編輯版面」新增、移除、拖曳或調整小工具寬度。方向鍵按鈕也可調整順序。
- 三款主題均有淺色與深色模式。偏好保存在目前瀏覽器，可從設定還原預設首頁。
- YouTube 支援影片與播放清單。Twitch 支援頻道、VOD 與剪輯。Spotify 支援歌曲、播放清單、專輯、藝人、節目與單集。
- 點擊播放後，在小工具卡片內載入官方 iframe，可繼續操作首頁和其他卡片。收起卡片播放器會停止播放，也可開啟原始平台。Twitch 播放器需要至少 400 × 300 px，較窄的畫面會提供原站連結。
- PTT 提供看板連結。動畫瘋與巴哈姆特提供站外捷徑。

## 開發

使用 Node.js 24。首頁採 Next.js App Router，`GET /api/embed` 驗證來源連結並產生官方播放器 URL。此版本不需要帳號、資料庫或第三方 API 金鑰。

```sh
npm ci
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 驗證

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright 預設啟動本機 production build。設定 `FEIFEI_BASE_URL` 可對部署版本執行同一套測試。端對端測試使用實際 Route Handler，外部播放器 iframe 使用測試回應，避免平台波動干擾測試。

## 部署

在 Vercel 將 GitHub repository 連到 Next.js 專案，使用 Node.js 24。App Router 的 Route Handler 需要伺服器執行環境。

## 卡片內選內容

點卡片的「換內容」，輸入 YouTube/Twitch 關鍵字或貼上支援的網址。搜尋結果的播放鍵會套用至卡片；加號會加入待播清單（上限 30）。Spotify 可直接貼上內容網址。清單及隨機／循環偏好沿用 `feifei.settings` 儲存，舊版設定相容。

YouTube 使用官方 IFrame API，支援影片、原生 Playlist、網址起始秒數、自訂清單、上一個／下一個、隨機和循環。清單存在時循環整份自訂清單，沒有自訂清單時循環單一影片；原生 Playlist 交由官方播放器處理。首次開啟仍需點播放器播放，遵守瀏覽器政策。切換卡片會卸載先前播放器，確保只有一個嵌入可出聲。Twitch/Spotify 清單項目由使用者點選切換，沒有宣稱支援自動接續。

搜尋 Route Handler：`GET /api/media/search?provider=youtube|twitch&q=...`。Vercel Preview/Production 分別設定 `YOUTUBE_API_KEY`、`TWITCH_CLIENT_ID`、`TWITCH_CLIENT_SECRET`，皆為 server-only。Twitch App Token 自動更新，401 後重試一次。搜尋有 8 秒 timeout、5 分鐘快取及每個執行個體每小時 60 次的上游請求保護；這不是跨執行個體的全域限流，較大規模公開流量應搭配平台限流與供應商配額。未設定憑證或供應商錯誤時，仍可貼網址。

驗證：`npm test`、`npm run lint`、`npm run typecheck`、`npm run build`。`npm run test:e2e` 包含 SDK fixture 與卡片互動測試，fixture 不代表供應商實際影音播放驗證。嵌入限制、登入、地區和 Twitch 最小寬度仍受平台限制。最新頻道自動更新、跨平台 SDK 音訊暫停、續播時間記憶不包含在這版。

### 新鮮事

首頁小工具下方提供動漫、音樂、迷因、遊戲與網路話題新聞牆，可切換分類或「換一批」。透過 `GET /api/news` 讀取 RSS，不需要 API Key。來源為 4Gamers、Anime News Network、吹音樂，以及 Know Your Meme 的 entries / newsfeed。

- 每個來源獨立快取 15 分鐘；並行讀取、8 秒逾時，單一來源失效不影響其他來源。全部來源失效回傳 503，前端可重試。
- 保留最近 14 天有有效日期的新聞；依 URL / 標題去重，各分類交錯排列，每批 9 則。分類與排除八卦採關鍵字規則，並非 AI 語意審核。「話題」來自網路文化 RSS，並非即時熱度排行。
- 只顯示標題、來源、發布日期及原文連結，不轉載摘要、全文或圖片。英文來源保留英文標題。
- 上游來源與分類規則集中於 `lib/news-feeds.ts`。來源可能變更或封鎖 RSS；公開 RSS 不等於授權任意商業轉載，營利前需另外確認各站條款。
- `tests/news.test.ts` 涵蓋解析、分類、日期、URL 安全、內容過濾、混排去重與部分／全部來源失效。

### PTT 討論

首頁「PTT 討論」提供「全部／生活／動漫／遊戲／科技／電影」分類。已通過 Vercel 實測的 Atom 看板是 Lifeismoney、C_Chat、Steam、movie，可瀏覽最近 72 小時公開文章（每批 9 則），按分類交錯排列，避免只看到動漫或電影。「科技」因 PC_Shopping、MobileComm、iOS 等官方 Feed 在 Vercel 無法穩定取得，暫時提供原站看板連結，不假裝有科技新聞。無須登入或 API Key。每個看板獨立快取 15 分鐘，部分來源失效不影響其他來源。

**不是推文數熱門排行。** 曾嘗試讀取官方 `/bbs/{board}/index.html` 的推文標記，但 Vercel 伺服器實測收到 HTTP 403。因此目前誠實標示為「PTT 討論」，以新文章為主，沒有偽造熱門分數。未來需取得授權且可靠的熱門資料來源才能推出排名。公開看板與供稿狀態可能變動，不繞過看板存取限制。
