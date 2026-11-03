import { createHash } from 'node:crypto';

export class ClientError extends Error {
  constructor(message, status = 0, code = 'CLIENT_ERROR', details) { super(String(message).replace(/bgt_[A-Za-z0-9_-]{43}/g, '[redacted]')); Object.assign(this, { status, code, details: details === undefined ? undefined : JSON.parse(JSON.stringify(details).replace(/bgt_[A-Za-z0-9_-]{43}/g, '[redacted]')) }); }
}
export function blogOrigin(value = 'http://127.0.0.1:4318') {
  let u; try { u = new URL(value); } catch { throw new ClientError('BLOG_URL 必须是合法 origin'); }
  if (u.username || u.password || u.pathname !== '/' || u.search || u.hash || !['https:', 'http:'].includes(u.protocol)) throw new ClientError('BLOG_URL 不能包含路径、凭据、查询或片段');
  if (u.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) throw new ClientError('HTTP 只允许本地回环验收地址');
  return u.origin;
}
export class BlogClient {
  constructor({ url, token, username, password } = {}) { this.origin = blogOrigin(url); Object.assign(this, { token, username, password }); }
  async login() {
    if (!this.username || !this.password) throw new ClientError('Token 管理需要 BLOG_ADMIN_USER 和 BLOG_ADMIN_PASSWORD（仅当前进程）');
    const response = await fetch(this.origin + '/api/blog/v1/admin/session', { method: 'POST', headers: { Origin: this.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: this.username, password: this.password }), redirect: 'error', signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok) throw new ClientError(result.error?.message || '登录失败', response.status, result.error?.code);
    if (result.mfa_required) throw new ClientError('管理员已启用双重验证，请在浏览器管理 Token；文章 CLI 继续使用来源绑定 Token', 401, 'MFA_REQUIRED');
    this.cookie = response.headers.getSetCookie()[0]?.split(';')[0]; this.csrf = result.csrf;
    if (!this.cookie || !this.csrf) throw new ClientError('管理员会话响应不完整');
  }
  async request(route, { method = 'GET', body, etag, key, admin = false } = {}) {
    if (!/^\/(?:admin|integrations|public)\//.test(route) || route.includes('..') || /[\r\n]/.test(route)) throw new ClientError('API 路径不正确');
    const headers = { Accept: 'application/json' };
    if (admin) { if (!this.cookie) await this.login(); headers.Cookie = this.cookie; headers.Origin = this.origin; headers['X-CSRF-Token'] = this.csrf; }
    else { if (!this.token) throw new ClientError('请通过当前进程 BLOG_TOKEN 提供接入 Token'); headers.Authorization = 'Bearer ' + this.token; }
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['Idempotency-Key'] = key || createHash('sha256').update(JSON.stringify({ method, route, body, etag })).digest('hex');
      if (etag) headers['If-Match'] = etag;
    }
    let response;
    try { response = await fetch(this.origin + '/api/blog/v1' + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new ClientError('请求未得到确定响应；用相同输入、If-Match 和幂等键重试，不要取最新 ETag 自动覆盖', 0, 'NETWORK_ERROR'); }
    let data; try { data = await response.json(); } catch { throw new ClientError('API 返回格式不正确', response.status, 'INVALID_RESPONSE'); }
    if (!response.ok) throw new ClientError(data.error?.message || '请求失败', response.status, data.error?.code, data.error?.details);
    return { ...data, etag: response.headers.get('etag'), replayed: response.headers.get('idempotency-replayed') === 'true' };
  }
  async logout() {
    if (!this.cookie) return;
    try { await this.request('/admin/session', { method: 'DELETE', body: {}, admin: true }); } finally { this.cookie = undefined; this.csrf = undefined; this.password = undefined; }
  }
}
