import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { emitKeypressEvents } from 'node:readline';
import { blogOrigin, ClientError } from './client.mjs';

const execute = promisify(execFile);
const validToken = value => typeof value === 'string' && /^bgt_[A-Za-z0-9_-]{43}$/.test(value);
export function configPath(env = process.env, filename) { return path.resolve(filename || env.BLOG_CONFIG || path.join(homedir(), '.blog-publish', 'config.json')); }
export async function readConfig(filename) {
  try {
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error();
    const value = JSON.parse((await readFile(filename, 'utf8')).replace(/^\uFEFF/, ''));
    if (!value || typeof value.url !== 'string' || !validToken(value.token)) throw new Error();
    return { url: blogOrigin(value.url), token: value.token };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new ClientError('本机配置无法读取或格式不正确；请重新运行 auth login', 0, 'CONFIG_INVALID');
  }
}
export async function credentials(env = process.env, flags = {}) {
  const filename = configPath(env, flags.config);
  if (env.BLOG_TOKEN) return { url: blogOrigin(flags.url || env.BLOG_URL || undefined), token: env.BLOG_TOKEN, filename, from: 'environment' };
  const saved = await readConfig(filename), requested = flags.url || env.BLOG_URL;
  if (saved && requested && blogOrigin(requested) !== saved.url) throw new ClientError('目标地址与已保存配置不符；请为该地址提供独立 Token，或重新运行 auth login', 0, 'CONFIG_ORIGIN_MISMATCH');
  return { url: saved?.url || blogOrigin(requested || undefined), token: saved?.token, filename, from: saved ? 'file' : 'none' };
}
async function privateDirectory(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new ClientError('配置目录必须是当前用户的普通目录', 0, 'CONFIG_DIRECTORY_INVALID');
}
async function privateWindowsFile(filename) {
  // Use the current Windows SID, not a localized account name. No secret is a process argument.
  const { stdout } = await execute('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { windowsHide: true });
  const sid = stdout.match(/S-1-\d+(?:-\d+)+/)?.[0];
  if (!sid) throw new ClientError('无法确定 Windows 用户权限', 0, 'CONFIG_PERMISSIONS');
  await execute('icacls.exe', [filename, '/inheritance:r', '/grant:r', '*' + sid + ':F', '/q'], { windowsHide: true });
}
export async function saveConfig(filename, { url, token }) {
  if (!validToken(token)) throw new ClientError('Token 格式不正确', 0, 'TOKEN_FORMAT_INVALID');
  const directory = path.dirname(filename), temporary = path.join(directory, '.config-' + randomUUID() + '.tmp');
  try {
    await privateDirectory(directory);
    await writeFile(temporary, '', { flag: 'wx', mode: 0o600 });
    if (process.platform === 'win32') await privateWindowsFile(temporary);
    await writeFile(temporary, JSON.stringify({ url: blogOrigin(url), token }, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, filename);
  } catch (error) {
    if (error instanceof ClientError) throw error;
    throw new ClientError('保存本机配置失败；未输出凭据，请检查目录权限', 0, 'CONFIG_WRITE_FAILED');
  } finally { await rm(temporary, { force: true }).catch(() => {}); }
}
export async function removeConfig(filename) { await rm(filename, { force: true }); }
export function tokenInfo(result) {
  const t = result?.token;
  if (!t || typeof t.id !== 'string' || typeof t.source !== 'string' || !Array.isArray(t.scopes) || !t.expires_at || !Number.isFinite(Date.parse(t.expires_at))) throw new ClientError('Token 自身信息响应不完整', 0, 'INVALID_RESPONSE');
  return { id: t.id, name: t.name, source: t.source, scopes: t.scopes, expires_at: t.expires_at };
}
export async function inputToken({ stdin = process.stdin, stderr = process.stderr, pipe = false } = {}) {
  if (pipe) { let value = ''; for await (const chunk of stdin) { value += chunk; if (value.length > 1024) throw new ClientError('Token 输入过长'); } return value.trim(); }
  if (!stdin.isTTY || !stdin.setRawMode) throw new ClientError('请在交互终端输入，或通过 --token-stdin 从标准输入提供 Token', 0, 'TOKEN_INPUT_REQUIRED');
  stderr.write('Token（输入不回显）：');
  emitKeypressEvents(stdin); const wasRaw = !!stdin.isRaw; stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => { stdin.off('keypress', keypress); stdin.setRawMode(wasRaw); stdin.pause(); stderr.write('\n'); error ? reject(error) : resolve(value.trim()); };
    const keypress = (text, key = {}) => {
      if (key.ctrl && key.name === 'c' || key.name === 'escape') return finish(new ClientError('已取消 Token 输入', 0, 'INPUT_CANCELED'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = value.slice(0, -1); return; }
      if (text && !key.ctrl && !key.meta && /^[A-Za-z0-9_-]+$/.test(text)) value += text;
      if (value.length > 1024) finish(new ClientError('Token 输入过长'));
    };
    stdin.on('keypress', keypress);
  });
}
