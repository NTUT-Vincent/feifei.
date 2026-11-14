# feifei. 產品企畫書

版本：0.1（2026-11-09）｜狀態：提案

## 1. 品牌與願景
**名稱**：feifei.（廢廢）  
**定位**：一個沒什麼用，卻想每天打開的首頁。  
**英文標語（暫定）**：A little place to do nothing.

讓網路從分散的網站與分頁，變成一個屬於自己的、輕鬆且有趣的角落。名字的「廢」是自嘲式幽默，不是貶低使用者。

### 品牌個性
可愛、慵懶、輕微荒謬、低壓力。視覺以柔和配色、留白與可選擇的吉祥物為方向；避免強制動態效果。

## 2. 使用者問題
- 想休息卻不知道要看什麼，反覆切換不同網站。
- 一般瀏覽器首頁缺乏個性，客製化 Dashboard 又太偏生產力。
- 常用的影音、社群與論壇分散在不同分頁。
- 自訂首頁往往需要過多設定，第一次使用體驗不佳。

## 3. 目標使用者
**初期**：台灣習慣使用 YouTube、Twitch、Spotify、PTT、動漫／遊戲社群的學生、上班族與網路重度使用者。  
**後續**：支援英文、Reddit、RSS 與其他地區內容來源的全球使用者。  
**平台**：桌面瀏覽器優先，手機版提供適合觸控的響應式配置；純網站，不依賴 Chrome Extension。

## 4. 核心價值
1. **快速開始**：搜尋、捷徑與預設內容開箱即用。
2. **我的空間**：佈景、排版、Widget 自由調整。
3. **每天有新東西**：內容探索與追蹤更新（逐步導入）。
4. **不用工作**：不以效率、任務管理、KPI 為主要訴求。

## 5. 產品體驗
開啟 feifei. → 直接使用搜尋列或常用捷徑 → 在 Widget 閱讀／播放支援內容 → 必要時開啟外部網站 → 回到保留原配置的 feifei.。

### 搜尋定位
搜尋框可送出 Google 查詢；**Google 搜尋結果預設開新分頁**，保留 feifei.。若未來需要站內搜尋結果，應另評估合規搜尋 API、成本與結果品質。純網站無法在 iframe 中通用瀏覽所有網站。

## 6. 差異化
不是「所有網站都能內嵌」，而是**低摩擦的個人娛樂入口**。以可愛品牌、漂亮預設版型、台灣內容選擇與逐步擴充的探索能力建立特色。使用者應可不登入就得到完整基本體驗。

## 7. 推出策略
**Phase 0 — 驗證（1–2 週）**：訪談／展示互動原型，測試品牌與首頁價值。  
**Phase 1 — MVP**：搜尋、捷徑、版型、主題、本機保存、少量可用 Widget。  
**Phase 2 — 內容**：合法來源的 PTT／Reddit／RSS 卡片、隨機探索、收藏。  
**Phase 3 — 個人化**：多空間、追蹤更新、跨裝置同步、分享模板。  
**Phase 4 — 國際化**：英文版與地區化預設內容。

以上為相對階段，非承諾交付日期。

## 8. 驗證方式
初期實驗目標（不是預測）：
- 100 位真實試用者。
- 至少 20 位在一週內回訪兩次以上。
- 觀察首次成功搜尋、首次自訂、Widget 使用、7 日回訪。
- 透過自願回饋確認「願不願意設成瀏覽器首頁」。

資料分析應尊重隱私、提供透明告知；不要預設追蹤使用者的搜尋內容。

## 9. 風險與對策
| 風險 | 對策 |
| --- | --- |
| iframe／CSP 阻擋第三方網站 | 優先官方嵌入；不支援時改外連 |
| 第三方登入與 Cookie 失效 | 不依賴跨站登入；有需要才走 OAuth |
| API 變動、配額、商業條款 | Adapter 分層、快取、功能降級 |
| PTT 等資料來源合法性／穩定性 | 上線前確認站方條款與著作權，提供來源連結 |
| 空白首頁、設定成本過高 | 提供好用的預設模板 |
| 動態背景造成效能問題 | 預設輕量、尊重 reduced-motion |
| 品牌撞名 | 上線前完成商標、網域、社群帳號檢索 |

## 10. 不做的事情
- 不把 feifei. 做成工作管理 Dashboard。
- 不宣稱可以內嵌所有網站或讀取所有平台的個人推薦 Feed。
- 不繞過 DRM、廣告、登入、反爬或網站嵌入限制。
- 不要求 MVP 使用者先註冊才能使用。

## 11. 待決策
- 品牌字體、吉祥物與主題色。
- MVP 最終 Widget 清單與可用的正式資料來源。
- 搜尋在同分頁或新分頁的使用者預設偏好。
- 是否要在 MVP 支援手機編輯佈局。
- 商標、域名與第三方 API 使用條款。

## Connected accounts implementation — 2026-11-14

Implemented Drizzle/PostgreSQL guest sessions, encrypted account storage, one-time OAuth states, shared database rate limits, Google/Spotify PKCE, Twitch authorization-code flow, refresh rotation and disconnect. Added library pagination, YouTube channel uploads, Twitch live status, Spotify development-user gate, in-card selection, account settings and privacy/deletion page. Build-time migrations are additive and serialized. Automated checks include a disposable real PostgreSQL integration suite and browser regression tests. Live platform consent and playback require account-owner verification after production release; automated fixtures are not an equivalent acceptance check.
