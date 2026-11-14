import Link from 'next/link';
export default function Privacy() {
  return <main style={{ maxWidth: 720, margin: '40px auto', padding: 24, lineHeight: 1.8 }}><Link href="/">← feifei.</Link><h1>隱私與資料刪除</h1>
    <p>Feifei 可在不連結帳號的情況下使用。首頁設定及你選取的媒體網址保存在目前瀏覽器的 localStorage。</p>
    <p>當你選擇連結 YouTube、Twitch 或 Spotify 時，我們會儲存平台帳號識別碼、顯示名稱及加密的授權憑證，用來讀取你授權的訂閱、追隨頻道或播放清單。這些資料不會用於廣告或出售。資料由 Vercel 與 Neon 處理；媒體播放器由各平台提供，會適用各自的隱私政策。</p>
    <p>帳號連結以目前瀏覽器的必要 Cookie 識別，有效期 30 天，不提供跨裝置同步。過期後不再使用憑證，過期紀錄於後續部署清理；清除 Cookie 前請先解除連結。</p>
    <p>在「設定 → 連結帳號 → 解除連結」會立即刪除 Feifei 保存的該平台憑證、帳號識別碼及顯示名稱。我們也會嘗試撤銷 Google／Twitch 授權；如果平台未成功處理，請至平台設定撤銷。Spotify 需在 Spotify 帳號的應用程式頁面移除存取權。你已加入的本機待播清單仍可自行移除，或使用「還原預設首頁」清除。</p>
    <p><a href="https://myaccount.google.com/permissions">Google 授權管理</a> · <a href="https://www.twitch.tv/settings/connections">Twitch 連線管理</a> · <a href="https://www.spotify.com/account/apps/">Spotify 應用程式管理</a></p>
    <p><a href="https://policies.google.com/privacy">Google 隱私政策</a> · <a href="https://www.youtube.com/t/terms">YouTube 服務條款</a> · <a href="https://www.twitch.tv/p/en/legal/privacy-notice/">Twitch 隱私政策</a> · <a href="https://www.spotify.com/legal/privacy-policy/">Spotify 隱私政策</a></p>
    <p>若已失去原瀏覽器的存取權，請先在平台撤銷 Feifei 授權。資料刪除問題可透過 <a href="https://github.com/NTUT-Vincent/feifei./issues">專案聯絡入口</a>聯繫；請勿公開貼上 Token、密碼或其他私人資料。</p>
  </main>;
}
