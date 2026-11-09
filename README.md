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

## MVP
Google 搜尋（開啟 Google 結果）、網站捷徑、拖曳調整的 Widgets、主題設定、免登入本機保存、YouTube/Twitch/Spotify 合法嵌入，以及具備合法資料來源時的 PTT 內容卡片。

## 建議技術
Next.js + React + TypeScript；響應式 Grid Layout；localStorage 儲存個人設定。需要第三方 API 時使用 Next.js server routes，並依 API 條款快取、限流。帳號同步與資料庫留待後續版本。

> 狀態：規劃中。本文不是已實作功能的宣告。
