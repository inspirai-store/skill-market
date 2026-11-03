import { readFile, writeFile, rename, chmod, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { BlogClient, ClientError, blogOrigin } from './client.mjs';
import { runMedia } from './media-client.mjs';
import { credentials, configPath, readConfig, saveConfig, removeConfig, tokenInfo, inputToken } from './cli-config.mjs';

export const HELP = `blog — 灵感小窝管理 CLI

环境：BLOG_URL、BLOG_TOKEN。HTTP 仅允许回环地址；默认 http://127.0.0.1:4318。
未提供 BLOG_TOKEN 时自动读取用户目录 .blog-publish/config.json；BLOG_CONFIG 或 --config 可指定独立文件。

blog auth login --url https://blog.inspirai.store [--token-stdin]
blog auth status
blog auth logout

blog draft push article.json [--external-id ID] [--out draft.json]
blog draft push article.md --title TITLE --slug SLUG --lang zh [--tag TAG]
blog draft push article.json --id ID --if-match '"ETAG"'
blog draft restore ID --revision REV --if-match '"ETAG"'
blog article list [--status all|pending|published|hidden|withdrawn|trashed] [--lang zh]
blog article show ID
blog article history ID
blog article revision ID --revision REV
blog article audit
blog review ID --revision REV --out review.json
blog review ID --receipt review.json --approve
blog publish ID --receipt review.json
blog media upload file.png [--name NAME] [--ref REF] [--alt TEXT] [--caption TEXT] [--out media.json]
blog media upload file.wav --resume TASK_ID --if-match '"ETAG"'
blog media reference URL --kind image|video|audio|bilibili --name NAME [--width N --height N] [--attribution TEXT]
blog media import URL --kind image|video|audio --name NAME --authorization TEXT [--filename NAME] [--wait]
blog media status ASSET_ID_OR_TASK_ID
blog media cancel|retry TASK_ID --if-match '"ETAG"'
blog hide|unhide|withdraw|trash|restore ID --receipt review.json
blog hide|unhide|withdraw|trash|restore ID --if-match '"ETAG"'

Token 管理仅兼容未启用 MFA 的本地环境；正式 Token 在浏览器管理：
blog token list
blog token create --name NAME --source SOURCE [--preset ingest|cli] [--days 30]
blog token revoke ID --if-match '"ETAG"'

--out 只保存非凭据结果或审核回执，权限 0600。Token 明文仅输出到终端一次。
--idempotency-key 可指定同一操作的重试键；默认由固定请求计算。
审核预览不等于通过。--approve 明确批准冻结回执；发布仍需独立命令。
JSON 输入：title、slug、locale、excerpt、tags、markdown。Markdown 也可使用 JSON frontmatter。`;
function parse(args) {
  const positionals = [], flags = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { positionals.push(args[i]); continue; }
    const key = args[i].slice(2);
    if (['approve', 'help', 'json', 'wait', 'no-wait', 'token-stdin'].includes(key)) { flags[key] = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new ClientError('参数缺少值：--' + key);
    const value = args[++i];
    if (key === 'tag' || key === 'scope') (flags[key] ||= []).push(value); else flags[key] = value;
  }
  const allowed = ['approve', 'help', 'json', 'out', 'receipt', 'revision', 'if-match', 'external-id', 'id', 'lang', 'title', 'slug', 'excerpt', 'tag', 'status', 'source', 'name', 'preset', 'days', 'idempotency-key', 'offset', 'limit', 'q', 'wait', 'no-wait', 'scope', 'media', 'resume', 'kind', 'ref', 'alt', 'caption', 'url', 'filename', 'attribution', 'authorization', 'width', 'height', 'config', 'token-stdin'];
  for (const key of Object.keys(flags)) if (!allowed.includes(key)) throw new ClientError('未知参数：--' + key);
  return { positionals, flags };
}
const segment = v => { if (!v || typeof v !== 'string') throw new ClientError('缺少目标 ID'); return encodeURIComponent(v); };
async function save(filename, value) {
  const target = resolve(filename), temporary = target + '.' + randomUUID() + '.tmp';
  try { await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await rename(temporary, target); await chmod(target, 0o600); }
  finally { await rm(temporary, { force: true }); }
}
async function receipt(filename, origin, id) {
  if (!filename) throw new ClientError('需要 --receipt 冻结审核回执');
  const r = JSON.parse(await readFile(filename, 'utf8'));
  if (r.schema_version !== 1 || r.kind !== 'blog-review-receipt' || r.origin !== origin || r.article_id !== id || !r.revision_id || !r.etag || !/^[a-f0-9]{64}$/.test(r.content_sha256)) throw new ClientError('回执不匹配目标站点、文章或版本');
  if (!r.article || r.article.locale !== r.locale || createHash('sha256').update(canonical(r.article)).digest('hex') !== r.content_sha256) throw new ClientError('冻结回执内容摘要不匹配，请保留原稿并重新准备预览');
  return r;
}
async function draftFile(filename, flags) {
  if (!filename) throw new ClientError('需要文章文件');
  const data = await readFile(filename, 'utf8');
  const media = flags.media ? JSON.parse(await readFile(flags.media,'utf8')) : undefined;
  const manifest = media ? (Array.isArray(media) ? media : media.media) : undefined;
  if (filename.endsWith('.json')) return {...JSON.parse(data), ...(manifest ? {media:manifest} : {})};
  let markdown = data, meta = {};
  const fm = data.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (fm) { try { meta = JSON.parse(fm[1]); } catch { throw new ClientError('frontmatter 使用 JSON 对象；或用 CLI 参数提供元数据'); } markdown = data.slice(fm[0].length); }
  const title = flags.title || meta.title || /^#\s+(.+)$/m.exec(markdown)?.[1];
  const slug = flags.slug || meta.slug || basename(filename).replace(/\.md$/i, '');
  return { title, slug, locale: flags.lang || meta.locale || 'zh', excerpt: flags.excerpt ?? meta.excerpt ?? '', tags: flags.tag || meta.tags || [], markdown, ...((manifest || meta.media) ? {media:manifest || meta.media} : {}) };
}
export async function runCli(args = process.argv.slice(2), env = process.env, io = { out: s => process.stdout.write(s), err: s => process.stderr.write(s) }) {
  const { positionals: p, flags: f } = parse(args);
  if (!p.length || f.help || p[0] === 'help') { io.out(HELP + '\n'); return; }
  if (p[0] === 'auth') {
    const filename = configPath(env, f.config); let result;
    if (p[1] === 'logout') { await removeConfig(filename); result = { configured: false, config_path: filename, server_token_revoked: false }; }
    else if (p[1] === 'login') {
      const target = f.url || env.BLOG_URL || (await readConfig(filename))?.url;
      if (!target) throw new ClientError('首次登录需要 --url 指定博客地址', 0, 'TARGET_REQUIRED');
      const url = blogOrigin(target);
      const token = !f['token-stdin'] && env.BLOG_TOKEN || await (io.promptToken ? io.promptToken() : inputToken({ pipe: f['token-stdin'] }));
      if (!/^bgt_[A-Za-z0-9_-]{43}$/.test(token)) throw new ClientError('Token 格式不正确', 0, 'TOKEN_FORMAT_INVALID');
      const client = new BlogClient({ url, token }); const info = tokenInfo(await client.request('/integrations/me'));
      await saveConfig(filename, { url, token }); result = { configured: true, connected: true, url, config_path: filename, token: info };
    } else if (p[1] === 'status') {
      const c = await credentials(env, f);
      result = c.token ? { configured: c.from === 'file', connected: true, url: c.url, credential_source: c.from, token: tokenInfo(await new BlogClient(c).request('/integrations/me')) } : { configured: false, connected: false, config_path: filename };
    } else throw new ClientError('未知 auth 操作，使用 --help 查看用法');
    if (f.out) await save(f.out, result); io.out(JSON.stringify(result, null, 2) + '\n'); return result;
  }
  const c = p[0] === 'token' ? { url: env.BLOG_URL } : await credentials(env, f);
  const client = new BlogClient({ ...c, username: env.BLOG_ADMIN_USER, password: env.BLOG_ADMIN_PASSWORD });
  const key = f['idempotency-key']; let result;
  const articleRoute = id => '/admin/articles/' + segment(id);
  try {
    if (p[0] === 'media') result = await runMedia(client,p.slice(1),f,{checkpoint:f.out ? value=>save(f.out,value) : undefined});
    else if (p[0] === 'draft' && p[1] === 'push') {
      const article = await draftFile(p[2], f), externalId = f['external-id'] || article.slug + '-' + article.locale;
      if (f.id || f['if-match']) {
        if (!f['if-match']) throw new ClientError('更新草稿需要 --if-match，不能自动覆盖最新稿');
        result = await client.request(f.id ? articleRoute(f.id) : '/integrations/articles/' + segment(externalId) + '/draft', { method: f.id ? 'PATCH' : 'PUT', body: article, etag: f['if-match'], key });
      } else result = await client.request('/integrations/articles', { method: 'POST', body: { external_id: externalId, article }, key });
    } else if (p[0] === 'draft' && p[1] === 'restore') {
      if (!f['if-match'] || !f.revision) throw new ClientError('恢复旧版本需要 --revision 和 --if-match');
      result = await client.request(articleRoute(p[2]) + '/restore', { method: 'POST', body: { revision_id: f.revision }, etag: f['if-match'], key });
    } else if (p[0] === 'article') {
      if (p[1] === 'list') {
        const qs = new URLSearchParams(); for (const [k, v] of [['status', f.status], ['locale', f.lang], ['source', f.source], ['q', f.q], ['offset', f.offset], ['limit', f.limit]]) if (v) qs.set(k, v);
        result = await client.request('/admin/articles?' + qs);
      } else if (p[1] === 'show') result = await client.request(articleRoute(p[2]));
      else if (p[1] === 'history') result = await client.request(articleRoute(p[2]) + '/revisions');
      else if (p[1] === 'revision') result = await client.request(articleRoute(p[2]) + '/revisions/' + segment(f.revision));
      else if (p[1] === 'audit') result = await client.request('/admin/audit');
      else throw new ClientError('未知 article 操作');
    } else if (p[0] === 'review') {
      const id = p[1];
      if (f.approve) {
        const r = await receipt(f.receipt, client.origin, id);
        if (f.revision && f.revision !== r.revision_id) throw new ClientError('--revision 与冻结回执不一致');
        if (r.approval_id) throw new ClientError('回执已经审核；不能把它自动改为新版本');
        const approved = await client.request(articleRoute(id) + '/reviews', { method: 'POST', body: { revision_id: r.revision_id, content_sha256: r.content_sha256, decision: 'approved' }, etag: r.etag, key });
        result = { ...r, approval_id: approved.approval_id, etag: approved.etag, reviewed_at: new Date().toISOString() };
        await save(f.receipt, result);
      } else {
        if (!f.revision) throw new ClientError('审核预览需要明确 --revision');
        const { article: a, etag } = await client.request(articleRoute(id));
        if (a.draft.id !== f.revision) throw new ClientError('只能为当前草稿准备审核；请先检查版本历史');
        const hash = createHash('sha256').update(canonical(a.draft.body)).digest('hex');
        if (hash !== a.draft.content_sha256) throw new ClientError('服务端内容摘要校验失败');
        result = { schema_version: 1, kind: 'blog-review-receipt', origin: client.origin, article_id: id, source: a.source, locale: a.locale, revision_id: a.draft.id, content_sha256: hash, etag, approval_id: null, article: a.draft.body, published: a.published?.body || null, prepared_at: new Date().toISOString() };
      }
    } else if (p[0] === 'publish') {
      const r = await receipt(f.receipt, client.origin, p[1]);
      if (!r.approval_id) throw new ClientError('回执尚未审核通过，请先明确执行 review --approve');
      if (f.revision && f.revision !== r.revision_id) throw new ClientError('--revision 与审核回执不一致');
      result = await client.request(articleRoute(p[1]) + '/publish', { method: 'POST', body: { revision_id: r.revision_id, content_sha256: r.content_sha256, approval_id: r.approval_id }, etag: r.etag, key });
      await save(f.receipt, { ...r, etag: result.etag, published_at: result.article.published_at });
    } else if (['hide', 'unhide', 'withdraw', 'trash', 'restore'].includes(p[0])) {
      const id = p[1], r = f.receipt ? await receipt(f.receipt, client.origin, id) : null;
      const etag = f['if-match'] || r?.etag;
      if (!etag) throw new ClientError('此操作需要 --if-match 或对应 --receipt；先读取并确认目标版本');
      const action = { hide: 'visibility', unhide: 'visibility', withdraw: 'withdraw', trash: '', restore: 'restore-trash' }[p[0]];
      result = await client.request(articleRoute(id) + (action ? '/' + action : ''), { method: p[0] === 'trash' ? 'DELETE' : action === 'visibility' ? 'PATCH' : 'POST', body: action === 'visibility' ? { visibility: p[0] === 'hide' ? 'hidden' : 'visible' } : {}, etag, key });
      if (r) await save(f.receipt, { ...r, etag: result.etag, approval_id: null, lifecycle_state: p[0] });
    } else if (p[0] === 'token') {
      if (p[1] === 'list') result = await client.request('/admin/tokens', { admin: true });
      else if (p[1] === 'create') {
        if (f.out) throw new ClientError('Token 明文不通过 --out 保存；仅在终端显示一次');
        const preset = f.preset || 'ingest';
        if (!['ingest', 'cli'].includes(preset)) throw new ClientError('--preset 必须为 ingest 或 cli');
        const scopes = preset === 'cli' ? ['blog:read-draft', 'blog:write', 'blog:review', 'blog:publish', 'blog:withdraw', 'blog:visibility', 'blog:trash', 'blog:ingest', 'blog:ingest:read'] : ['blog:ingest'];
        if (f.scope?.some(s=>!['blog:media:read','blog:media:write','blog:media:import'].includes(s))) throw new ClientError('--scope 仅接受显式新增的媒体权限');
        scopes.push(...(f.scope || []));
        result = await client.request('/admin/tokens', { method: 'POST', body: { name: f.name, source: f.source, scopes, expires_in_days: Number(f.days || 30) }, admin: true, key });
      } else if (p[1] === 'revoke') {
        if (!f['if-match']) throw new ClientError('撤销 Token 需要 --if-match');
        result = await client.request('/admin/tokens/' + segment(p[2]) + '/revoke', { method: 'POST', body: {}, etag: f['if-match'], admin: true, key });
      } else throw new ClientError('未知 token 操作');
    } else throw new ClientError('未知命令，使用 --help 查看用法');
    if (f.out) await save(f.out, result);
    io.out(JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally { if (client.cookie) await client.logout().catch(() => {}); }
}
function canonical(value) { if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'; if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'; return JSON.stringify(value); }
if (process.argv[1] === fileURLToPath(import.meta.url)) runCli().catch(error => { process.stderr.write(JSON.stringify({ error: { code: error.code || 'CLIENT_ERROR', message: error.message, status: error.status || 0, details: error.details } }) + '\n'); process.exitCode = 1; });
