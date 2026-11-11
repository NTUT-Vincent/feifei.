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
- 選擇播放後才載入官方 iframe。播放器內可開啟原始平台。Twitch 播放器需要至少 400 × 300 px，較窄的畫面會提供原站連結。
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
