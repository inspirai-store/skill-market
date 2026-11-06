import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { query, userProfilesPath, READ_TOOLS } from './query.mjs';

const SOURCE = fileURLToPath(new URL('../', import.meta.url));
const json = value => JSON.stringify(value, null, 2) + '\n';
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const parse = text => text ? JSON.parse(text.replace(/^\uFEFF/, '')) : {};
const fail = message => { throw new Error(message); };
export function options(argv) {
  const out = { command: argv[0] || 'help' };
  const flags = new Set(['apply', 'help']);
  const values = new Set(['profile', 'metrics-url', 'logs-url', 'metrics-bearer-env', 'logs-bearer-env', 'codex-home', 'profiles-file']);
  for (let i = 1; i < argv.length; i++) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (flags.has(key)) out[key] = true;
    else if (values.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
    else fail(`Unknown option or missing value: ${argv[i]}`);
  }
  return out;
}

// Locate table boundaries without treating headers inside multiline strings as TOML tables.
function lineState(line, state = '') {
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (!state && char === '#') break;
    if (state === '"' && char === '\\') { i++; continue; }
    if (state === '"""' && char === '\\') { i++; continue; }
    if (state.length === 3) {
      if (line.slice(i, i + 3) === state) { state = ''; i += 2; }
    } else if (state) { if (char === state) state = ''; }
    else if (char === '"' || char === "'") {
      state = line.slice(i, i + 3) === char.repeat(3) ? char.repeat(3) : char;
      if (state.length === 3) i += 2;
    }
  }
  if (state.length === 1) fail('Unclosed TOML string; review the client configuration before initializing');
  return state;
}
function sections(text) {
  let offset = 0, state = '';
  const entries = [];
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
    const header = !state && line.trimEnd().match(/^\s*(\[[^\r\n]*?\])\s*(?:#.*)?$/);
    if (header) entries.push({ start: offset, header: header[1], body: offset + line.length });
    state = lineState(line, state);
    offset += line.length;
  }
  if (state) fail('Unclosed multiline TOML string; no client configuration was changed');
  return entries.map((entry, i) => ({ ...entry, end: entries[i + 1]?.start ?? text.length }));
}
function compact(text) {
  let out = '', quote = '', comment = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (comment) { if (char === '\n') comment = false; continue; }
    if (quote) {
      out += char;
      if (char === '\\' && quote === '"') out += text[++i] || '';
      else if (char === quote) quote = '';
    } else if (char === '#') comment = true;
    else if (char === '"' || char === "'") { quote = char; out += char; }
    else if (!/\s/.test(char)) out += char;
  }
  return out;
}
export function mergeClientConfig(before, servers) {
  const text = before || '';
  const tables = sections(text);
  let after = text;
  const actions = [];
  for (const server of servers) {
    const headers = [`[mcp_servers.${server.name}]`, `[mcp_servers."${server.name}"]`, `[mcp_servers.'${server.name}']`];
    const found = tables.filter(x => headers.includes(x.header.replace(/\s+/g, '')));
    if (found.length > 1) fail(`Duplicate MCP table: ${server.name}`);
    if (found.length) {
      const body = text.slice(found[0].body, found[0].end);
      if (compact(body) !== compact(server.body)) fail(`Existing MCP configuration differs: ${server.name}. It was not overwritten; review it or choose a different profile name.`);
      actions.push({ name: server.name, action: 'unchanged' });
    } else {
      after += `${after && !after.endsWith('\n') ? '\n' : ''}\n[mcp_servers.${server.name}]\n${server.body}`;
      actions.push({ name: server.name, action: 'add' });
    }
  }
  return { after, actions };
}
function preflightConnections(text, profileName, profile) {
  const tables = sections(text || '');
  for (const kind of ['metrics', 'logs']) {
    const name = `${profileName}-victoria-${kind}`;
    const headers = [`[mcp_servers.${name}]`, `[mcp_servers."${name}"]`, `[mcp_servers.'${name}']`];
    for (const table of tables.filter(x => headers.includes(x.header.replace(/\s+/g, '')))) {
      const body = text.slice(table.body, table.end);
      if (/^\s*enabled\s*=\s*false\s*(?:#.*)?$/m.test(body)) fail(`MCP ${name} is explicitly disabled; it was not contacted or re-enabled`);
      const found = body.match(/^\s*url\s*=\s*("(?:\\.|[^"\\])*"|'[^']*')\s*(?:#.*)?$/m);
      if (!found) fail(`Cannot safely recognize the existing URL for ${name}; review it before initialization`);
      const url = found[1].startsWith('"') ? JSON.parse(found[1]) : found[1].slice(1, -1);
      if (endpoint(url) !== profile[kind].url) fail(`Existing MCP ${name} points to a different endpoint; no initialization changes were written`);
    }
  }
}
function files(root) {
  const result = new Map();
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) fail('Skill bundle contains a link; review the source before installing');
      const relative = path.join(prefix, entry.name), full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, relative);
      else result.set(relative, createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
    }
  }
  walk(root);
  return result;
}
function installState(source, target) {
  for (const file of ['SKILL.md', 'agents/openai.yaml', 'scripts/query.mjs', 'scripts/setup.mjs']) {
    if (!fs.existsSync(path.join(source, file))) fail(`Incomplete skill bundle: missing ${file}`);
  }
  if (fs.existsSync(target) && fs.realpathSync(source) === fs.realpathSync(target)) return 'already-installed';
  const sourceFiles = files(source);
  if (fs.existsSync(target)) {
    if (!isDeepStrictEqual(sourceFiles, files(target))) fail('A different skill already exists at the installation path; it was not overwritten');
    return 'already-installed';
  }
  return 'install';
}
function writeChange(file, before, after) {
  if (before === after) return { path: file, action: 'unchanged' };
  if (read(file) !== before) fail('Configuration changed during initialization; rerun without overwriting concurrent edits');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const backup = before === null ? null : `${file}.bak-${suffix}`;
  if (backup) fs.writeFileSync(backup, before, { flag: 'wx', mode: 0o600 });
  const temp = `${file}.tmp-${suffix}`;
  try {
    fs.writeFileSync(temp, after, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return { path: file, action: before === null ? 'created' : 'updated', ...(backup ? { backup } : {}) };
}
function endpoint(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) fail('Use an HTTP(S) MCP endpoint without embedded credentials, query or fragment; use a bearer environment variable for authentication');
  return url.href;
}
function resultText(response) { return (response.result?.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n').trim(); }

export async function setup(opts, { env = process.env, source = SOURCE, queryFn = query } = {}) {
  if (!['init', 'doctor'].includes(opts.command)) fail('Choose init or doctor; use --help for examples');
  if (Number(process.versions.node.split('.')[0]) < 18) fail('Node.js 18+ is required; Node.js was not installed automatically');
  const profileName = opts.profile;
  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(profileName || '')) fail('Supply an explicit lowercase --profile name (letters, numbers, hyphens or underscores)');
  const home = path.resolve(opts['codex-home'] || env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  const profileFile = path.resolve(opts['profiles-file'] || (opts['codex-home'] ? path.join(home, 'victoria-observability/environments.json') : userProfilesPath(env)));
  const configFile = path.join(home, 'config.toml');
  const installPath = path.join(home, 'skills/victoria-observability');
  const beforeProfiles = read(profileFile), beforeConfig = read(configFile);
  const existing = parse(beforeProfiles);
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) fail('Environment configuration must be a JSON object');
  const examples = parse(read(path.join(source, 'references/environments.json')));
  const current = Object.hasOwn(existing, profileName) ? existing[profileName] : undefined;
  const seed = current || (Object.hasOwn(examples, profileName) ? examples[profileName] : {});
  const profile = structuredClone(seed);
  for (const kind of ['metrics', 'logs']) {
    profile[kind] = { ...(profile[kind] || {}), ...(opts[`${kind}-url`] ? { url: opts[`${kind}-url`] } : {}) };
    if (!profile[kind].url) fail(`No ${kind} MCP URL is configured; supply --${kind}-url`);
    profile[kind].url = endpoint(profile[kind].url);
    if (opts[`${kind}-bearer-env`]) profile[kind].bearer_env = opts[`${kind}-bearer-env`];
    if (profile[kind].bearer_env && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(profile[kind].bearer_env)) fail('Invalid authentication environment variable name');
  }
  const install = installState(source, installPath);
  preflightConnections(beforeConfig, profileName, profile);
  const checks = {}, servers = [];
  for (const kind of ['metrics', 'logs']) {
    const target = profile[kind];
    const common = { kind, url: target.url, ...(target.bearer_env ? { 'bearer-env': target.bearer_env } : {}) };
    const catalog = await queryFn({ ...common, list: true }, { env });
    const available = new Set(catalog.tools.map(x => x.name));
    const tools = [...READ_TOOLS[kind]].filter(name => available.has(name));
    if (!tools.includes('query')) fail(`${kind} query tool is unavailable; no initialization changes were written`);
    const probeArgs = kind === 'metrics'
      ? { query: profile.checks?.metrics_query || 'count(up)' }
      : { query: profile.checks?.logs_query || '*', start: new Date(Date.now() - 15 * 60000).toISOString(), limit: 1 };
    const result = await queryFn({ ...common, tool: 'query', args: JSON.stringify(probeArgs) }, { env });
    const text = resultText(result);
    let hasData = Boolean(text);
    if (kind === 'metrics') {
      const data = text ? JSON.parse(text) : {};
      if (data.status !== 'success') fail('Metric query did not return a successful API result');
      hasData = Boolean(data.data?.result?.some(x => Number(x.value?.[1]) > 0));
    }
    checks[kind] = { querySucceeded: true, hasData, server: catalog.server, readonlyTools: tools.length };
    const body = [
      `url = ${JSON.stringify(target.url)}`,
      ...(target.bearer_env ? [`bearer_token_env_var = ${JSON.stringify(target.bearer_env)}`] : []),
      'startup_timeout_sec = 15', 'tool_timeout_sec = 30',
      `enabled_tools = ${JSON.stringify(tools)}`,
    ].join('\n') + '\n';
    servers.push({ name: `${profileName}-victoria-${kind}`, body, url: target.url });
  }
  const merged = mergeClientConfig(beforeConfig, servers);
  const profileUnchanged = current && isDeepStrictEqual(current, profile);
  const afterProfiles = profileUnchanged ? beforeProfiles : json({ ...existing, [profileName]: profile });
  const report = {
    profile: profileName, checkedAt: new Date().toISOString(), checks,
    skill: { path: installPath, action: install }, profiles: { path: profileFile, action: beforeProfiles === afterProfiles ? 'unchanged' : beforeProfiles === null ? 'create' : 'update' },
    mcp: { path: configFile, servers: merged.actions },
    status: Object.values(checks).every(x => x.hasData) ? 'queries-verified' : 'connected-with-no-recent-data',
  };
  if (opts.command === 'doctor') return { ...report, applied: false, initialized: install !== 'install' && beforeProfiles === afterProfiles && beforeConfig === merged.after };
  if (!opts.apply) return { ...report, applied: false, note: 'Preview only. Use --apply to install the skill and write client configuration. No cluster or server configuration is modified.' };
  // Detect concurrent client edits before copying or writing anything.
  if (read(profileFile) !== beforeProfiles || read(configFile) !== beforeConfig) fail('Client configuration changed during checks; no initialization changes were written');
  if (install === 'install') {
    fs.mkdirSync(path.dirname(installPath), { recursive: true });
    fs.cpSync(source, installPath, { recursive: true, errorOnExist: true, force: false });
  }
  const changes = [writeChange(profileFile, beforeProfiles, afterProfiles), writeChange(configFile, beforeConfig, merged.after)];
  const reloadRequired = merged.actions.some(x => x.action === 'add');
  return { ...report, applied: true, initialized: true, reloadRequired, changes, note: reloadRequired ? 'Client files are ready. Reload MCP connections to load new tools; this command does not restart applications.' : 'Existing matching MCP entries were preserved. No client restart was performed.' };
}

const HELP = `Victoria observability: client installation, environment setup and real read-query checks.
  node scripts/setup.mjs init --profile dev                    # preview + connectivity checks
  node scripts/setup.mjs init --profile dev --apply            # install/configure this client
  node scripts/setup.mjs doctor --profile dev                  # read-only verification
  node scripts/setup.mjs init --profile staging --metrics-url https://metrics.example/mcp --logs-url https://logs.example/mcp --apply
Options: --codex-home DIR, --profiles-file FILE, --metrics-bearer-env NAME, --logs-bearer-env NAME
Node.js 18+ required. No npm packages, cluster deployment, server configuration changes, or automatic credential installation.
Only missing client MCP entries are appended. Different same-name entries and edited skill installations are not overwritten.
`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    if (opts.help || ['help', '--help'].includes(opts.command)) console.log(HELP);
    else console.log(JSON.stringify(await setup(opts), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
