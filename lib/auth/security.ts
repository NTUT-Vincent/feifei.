import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
export const providers = ['youtube', 'twitch', 'spotify'] as const;
export type Provider = typeof providers[number];
export function isProvider(value: string): value is Provider { return providers.includes(value as Provider); }
export function randomSecret() { return randomBytes(32).toString('base64url'); }
export function hash(value: string) { return createHash('sha256').update(value).digest('base64url'); }
export function sessionHash(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return createHmac('sha256', secret).update(value).digest('hex');
}
function encryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must encode 32 random bytes');
  return key;
}
export function seal(value: string, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal(value: string, context: string) {
  const data = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}
export function baseUrl() {
  const url = new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000');
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password || (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid APP_BASE_URL');
  if (process.env.VERCEL && url.protocol !== 'https:') throw new Error('HTTPS APP_BASE_URL required');
  return url.origin;
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === baseUrl() && request.headers.get('x-feifei-request') === '1';
}
