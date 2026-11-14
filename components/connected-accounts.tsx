'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
export type Connection = { provider: string; enabled: boolean; connected: boolean; displayName: string | null };
export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/connections', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) { setConnections(data.connections); setError(''); }
      } catch { if (active) setError('帳號狀態暫時無法讀取'); }
    }
    void load(); window.addEventListener('feifei:connections', load);
    return () => { active = false; window.removeEventListener('feifei:connections', load); };
  }, []);
  async function connect(provider: string, disconnect = false) {
    setBusy(provider); setError('');
    try {
      const response = await fetch(`/api/connections/${provider}${disconnect ? '' : '/authorize'}`, { method: disconnect ? 'DELETE' : 'POST', headers: { 'x-feifei-request': '1' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!disconnect) { window.location.assign(data.url); return; }
      window.dispatchEvent(new Event('feifei:connections'));
      if (!data.revoked) setError('已解除連結；也可至平台的應用程式設定撤銷授權。');
    } catch (e) { setError(e instanceof Error ? e.message : '連結失敗'); }
    finally { setBusy(''); }
  }
  return { connections, error, busy, connect };
}
export function ConnectedAccounts() {
  const { connections, error, busy, connect } = useConnections();
  return <fieldset><legend>連結帳號</legend><div className="connected-accounts">
    {connections.map((item) => <div className="connection-row" key={item.provider}><span>{({ youtube: 'YouTube', twitch: 'Twitch', spotify: 'Spotify' } as Record<string, string>)[item.provider]}{item.connected && <small>{item.displayName}</small>}</span>
      <button className="outline-button" disabled={Boolean(busy) || (!item.enabled && !item.connected)} onClick={() => connect(item.provider, item.connected)}>{busy === item.provider ? '處理中' : item.connected ? '解除連結' : item.enabled ? '連結' : '尚未開放'}</button>
    </div>)}
    {error && <p role="status" className="form-error">{error}</p>}
    <a href="/privacy" target="_blank" rel="noreferrer">隱私與資料刪除</a>
  </div></fieldset>;
}
const subscribeLocation = () => () => {};
export function ConnectionNotice() {
  const result = useSyncExternalStore(subscribeLocation, () => new URL(window.location.href).searchParams.get('connection'), () => null);
  const [dismissed, setDismissed] = useState(false);
  const notice = result === 'success' ? '帳號已連結，可在「換內容」選擇個人清單。' : result === 'cancelled' ? '已取消帳號授權。' : '連結失敗，請確認回呼網址、測試者資格與授權權限後重試。';
  return result && !dismissed ? <div className="connection-notice" role="status"><span>{notice}</span><button className="plain-button" onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('connection'); window.history.replaceState(null, '', url); setDismissed(true); }}>關閉</button></div> : null;
}
