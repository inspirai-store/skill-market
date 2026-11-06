import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

export const READ_TOOLS = {
  metrics: new Set(['query', 'query_range', 'metrics', 'metrics_metadata', 'labels', 'label_values', 'series', 'metric_statistics', 'active_queries', 'top_queries', 'tsdb_status', 'prettify_query', 'explain_query', 'rules', 'alerts']),
  logs: new Set(['query', 'stats_query', 'stats_query_range', 'hits', 'facets', 'field_names', 'field_values', 'stream_field_names', 'stream_field_values', 'stream_ids', 'streams']),
};
const DEFAULT_PROFILES = fileURLToPath(new URL('../references/environments.json', import.meta.url));
const MAX_BYTES = 2 * 1024 * 1024;

export function userProfilesPath(env = process.env) {
  return env.VICTORIA_OBSERVABILITY_CONFIG || path.join(env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'victoria-observability', 'environments.json');
}
export function profilesPath(opts = {}, env = process.env) {
  if (opts['profiles-file']) return opts['profiles-file'];
  const userFile = userProfilesPath(env);
  if (env.VICTORIA_OBSERVABILITY_CONFIG || fs.existsSync(userFile)) return userFile;
  return DEFAULT_PROFILES;
}

const fail = message => { throw new Error(message); };
export function options(argv) {
  const out = {};
  const flags = new Set(['help', 'list']);
  const values = new Set(['kind', 'url', 'profile', 'profiles-file', 'bearer-env', 'tool', 'args', 'args-file']);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (flags.has(key)) out[key] = true;
    else if (values.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
    else fail(`Unknown option or missing value: ${argv[i]}`);
  }
  return out;
}

export class McpReader {
  constructor(url, { token, fetcher = fetch } = {}) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('Use an HTTP(S) MCP URL without embedded credentials');
    this.url = parsed.href; this.token = token; this.fetcher = fetcher; this.id = 0;
  }
  async rpc(method, params = {}, notification = false) {
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (this.session) headers['mcp-session-id'] = this.session;
    if (this.protocol) headers['mcp-protocol-version'] = this.protocol;
    const id = notification ? undefined : ++this.id;
    const response = await this.fetcher(this.url, {
      method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, params }),
    });
    if (response.headers.get('mcp-session-id')) this.session = response.headers.get('mcp-session-id');
    if (!response.ok) fail(`MCP ${method} returned HTTP ${response.status}`);
    let text = ''; let bytes = 0;
    const decoder = new TextDecoder();
    for await (const chunk of response.body || []) {
      bytes += chunk.byteLength;
      if (bytes > MAX_BYTES) { fail('MCP response exceeded 2 MiB; narrow the query, use aggregation or reduce the limit'); }
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();
    if (notification) return null;
    const messages = response.headers.get('content-type')?.includes('text/event-stream')
      ? text.split(/\r?\n\r?\n/).filter(block => /^data:/m.test(block)).map(block => JSON.parse(block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')))
      : [JSON.parse(text)];
    const message = messages.find(x => x.id === id);
    if (!message) fail(`MCP ${method} returned no matching JSON-RPC result`);
    const safe = value => this.token ? String(value).split(this.token).join('[REDACTED]') : String(value);
    if (message.error) fail(`MCP error: ${safe(message.error.message || message.error.code)}`);
    if (message.result?.isError) fail(`Query failed: ${safe((message.result.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n'))}`);
    return message.result;
  }
  async connect() {
    const info = await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'victoria-observability-readonly', version: '1.0.0' } });
    this.protocol = info.protocolVersion;
    await this.rpc('notifications/initialized', {}, true);
    return info;
  }
}

export async function query(opts, { env = process.env, fetcher = fetch } = {}) {
  if (!READ_TOOLS[opts.kind]) fail('--kind must be metrics or logs');
  if (Boolean(opts.url) === Boolean(opts.profile)) fail('Choose exactly one explicit target: --url or --profile');
  if (opts.list && opts.tool) fail('Choose --list or --tool, not both');
  if (!opts.list && !READ_TOOLS[opts.kind].has(opts.tool)) fail('Tool is not in this helper\'s read-only allowlist; use --list to inspect available read tools');
  if (opts.args && opts['args-file']) fail('Use --args or --args-file, not both');
  let target = { url: opts.url };
  if (opts.profile) {
    const profiles = JSON.parse(fs.readFileSync(profilesPath(opts, env), 'utf8').replace(/^\uFEFF/, ''));
    target = profiles[opts.profile]?.[opts.kind];
    if (!target?.url) fail('Profile has no endpoint for this data type');
  }
  const tokenName = opts['bearer-env'] || target.bearer_env;
  if (tokenName && !env[tokenName]) fail(`Required authentication environment variable is not set: ${tokenName}`);
  const client = new McpReader(target.url, { token: tokenName ? env[tokenName] : undefined, fetcher });
  const info = await client.connect();
  const catalog = await client.rpc('tools/list');
  if (opts.list) return {
    target: opts.profile || new URL(target.url).origin, kind: opts.kind, server: info.serverInfo,
    tools: catalog.tools.filter(x => READ_TOOLS[opts.kind].has(x.name)),
    otherToolNames: catalog.tools.filter(x => !READ_TOOLS[opts.kind].has(x.name)).map(x => x.name),
  };
  const tool = catalog.tools.find(x => x.name === opts.tool);
  if (!tool) fail('The requested read tool is not available on this server');
  const rawArgs = opts['args-file'] ? fs.readFileSync(opts['args-file'], 'utf8') : opts.args || '{}';
  const args = JSON.parse(rawArgs.replace(/^\uFEFF/, ''));
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('Tool arguments must be a JSON object');
  if (opts.kind === 'logs' && opts.tool === 'query' && tool.inputSchema?.properties?.limit && args.limit === undefined) args.limit = 100;
  const missing = (tool.inputSchema?.required || []).filter(key => args[key] === undefined);
  if (missing.length) fail(`Missing required tool arguments: ${missing.join(', ')}; inspect --list`);
  return { kind: opts.kind, tool: opts.tool, result: await client.rpc('tools/call', { name: opts.tool, arguments: args }) };
}

const HELP = `Read-only Victoria MCP query (Node.js 18+; no dependencies).
  node query.mjs --kind metrics|logs (--profile NAME | --url URL) --list
  node query.mjs --kind metrics|logs (--profile NAME | --url URL) --tool TOOL --args-file query.json
Optional: --profiles-file FILE, --bearer-env ENV_NAME, --args JSON
Profiles: explicit file > VICTORIA_OBSERVABILITY_CONFIG > user configuration > packaged example.
Targets are explicit. Profiles supply addresses, not automatic query filters.
No writes, deployment actions, client configuration changes, or model API calls.
`;
function redact(message, env, tokenName) {
  let text = String(message);
  if (tokenName && env[tokenName]) text = text.split(env[tokenName]).join('[REDACTED]');
  return text.replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let opts;
  try {
    opts = options(process.argv.slice(2));
    if (opts.help) console.log(HELP);
    else console.log(JSON.stringify(await query(opts), null, 2));
  } catch (error) {
    console.error(redact(error.message, process.env, opts?.['bearer-env']));
    process.exitCode = 1;
  }
}
