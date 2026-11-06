import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setup, mergeClientConfig } from './setup.mjs';
import { profilesPath, userProfilesPath } from './query.mjs';

function fixture(t, existing = '') {
  const base = path.resolve(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'victoria-setup-test-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), base);
    assert.ok(path.basename(resolved).startsWith('victoria-setup-test-'));
    fs.rmSync(resolved, { recursive: true, force: false });
  });
  const source = path.join(root, 'bundle'), home = path.join(root, 'client');
  for (const dir of ['scripts', 'references', 'agents']) fs.mkdirSync(path.join(source, dir), { recursive: true });
  fs.writeFileSync(path.join(source, 'SKILL.md'), '---\nname: victoria-observability\ndescription: fixture\n---\n');
  fs.writeFileSync(path.join(source, 'scripts/query.mjs'), '// fixture\n');
  fs.writeFileSync(path.join(source, 'scripts/setup.mjs'), '// fixture\n');
  fs.writeFileSync(path.join(source, 'agents/openai.yaml'), 'interface: {}\n');
  const dev = { metrics: { url: 'http://metrics.invalid/mcp' }, logs: { url: 'http://logs.invalid/mcp' } };
  fs.writeFileSync(path.join(source, 'references/environments.json'), JSON.stringify({ dev }));
  if (existing) { fs.mkdirSync(home); fs.writeFileSync(path.join(home, 'config.toml'), existing); }
  const calls = [];
  const queryFn = async opts => {
    calls.push(opts);
    if (opts.list) return { server: { name: opts.kind, version: 'fixture' }, tools: [{ name: 'delete_series' }, { name: 'query' }] };
    return { result: { content: [{ type: 'text', text: opts.kind === 'metrics' ? '{"status":"success","data":{"result":[{"value":[0,"7"]}]}}' : '{"_time":"2026-11-06T10:00:00Z","_msg":"private fixture log"}' }] } };
  };
  return { root, source, home, calls, queryFn, opts: { command: 'init', profile: 'dev', 'codex-home': home } };
}

test('preview verifies real-query contracts without creating client files or installation directories', async t => {
  const f = fixture(t);
  const out = await setup(f.opts, f);
  assert.equal(out.applied, false);
  assert.equal(out.status, 'queries-verified');
  assert.equal(fs.existsSync(f.home), false);
  assert.equal(f.calls.filter(x => x.tool === 'query').length, 2);
  assert.ok(!JSON.stringify(out).includes('private fixture log'));
});

test('first install, persistent profile discovery, backups and repeated apply preserve unrelated settings', async t => {
  const original = '# keep exact\r\nmodel = "existing-model"\r\n[mcp_servers.unrelated]\r\ncommand = "keep-me"\r\n';
  const f = fixture(t, original);
  const first = await setup({ ...f.opts, apply: true }, f);
  assert.equal(first.initialized, true);
  assert.ok(fs.existsSync(path.join(first.skill.path, 'scripts/setup.mjs')));
  const config = fs.readFileSync(path.join(f.home, 'config.toml'), 'utf8');
  assert.ok(config.startsWith(original));
  assert.ok(config.includes('enabled_tools = ["query"]'));
  assert.ok(!config.includes('delete_series'));
  const backup = first.changes.find(x => x.backup).backup;
  assert.equal(fs.readFileSync(backup, 'utf8'), original);
  assert.equal(profilesPath({}, { CODEX_HOME: f.home }), first.profiles.path);
  const second = await setup({ ...f.opts, apply: true }, f);
  assert.ok(second.changes.every(x => x.action === 'unchanged'));
  assert.equal(fs.readFileSync(path.join(f.home, 'config.toml'), 'utf8'), config);
  assert.equal((config.match(/\[mcp_servers\.dev-victoria-metrics\]/g) || []).length, 1);
  const doctor = await setup({ ...f.opts, command: 'doctor' }, f);
  assert.equal(doctor.initialized, true);
  assert.equal(doctor.applied, false);
});

test('preserves profiles for other environments', async t => {
  const f = fixture(t);
  const file = userProfilesPath({ CODEX_HOME: f.home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const other = { metrics: { url: 'https://other.invalid/mcp', bearer_env: 'OTHER_TOKEN' }, custom: ['keep', 1] };
  fs.writeFileSync(file, JSON.stringify({ other }));
  await setup({ ...f.opts, apply: true }, f);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)).other, other);
});

test('a disabled or different existing endpoint stops before network access and leaves files unchanged', async t => {
  for (const extra of ['enabled = false\n', '']) {
    const original = `[mcp_servers.dev-victoria-metrics]\nurl = "https://different.invalid/mcp"\n${extra}`;
    const f = fixture(t, original);
    await assert.rejects(setup({ ...f.opts, apply: true }, f));
    assert.equal(f.calls.length, 0);
    assert.equal(fs.readFileSync(path.join(f.home, 'config.toml'), 'utf8'), original);
    assert.equal(fs.existsSync(path.join(f.home, 'skills')), false);
  }
});

test('a failed endpoint probe cannot leave partial client configuration', async t => {
  const f = fixture(t);
  const queryFn = async () => { throw new Error('endpoint unavailable'); };
  await assert.rejects(setup({ ...f.opts, apply: true }, { ...f, queryFn }));
  assert.equal(fs.existsSync(f.home), false);
});

test('refuses edited existing installations rather than replacing user files', async t => {
  const f = fixture(t);
  const target = path.join(f.home, 'skills/victoria-observability');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'SKILL.md'), 'user-edited skill');
  await assert.rejects(setup({ ...f.opts, apply: true }, f));
  assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), 'user-edited skill');
  assert.equal(f.calls.length, 0);
});

test('does not mistake TOML examples in multiline strings for configured MCP tables', () => {
  const original = 'instructions = """\n[mcp_servers.dev-victoria-metrics]\nurl = "not-an-entry"\n"""\n';
  const server = { name: 'dev-victoria-metrics', body: 'url = "https://real.invalid/mcp"\nenabled_tools = ["query"]\n' };
  const first = mergeClientConfig(original, [server]);
  assert.ok(first.after.startsWith(original));
  assert.equal(first.actions[0].action, 'add');
  assert.equal(mergeClientConfig(first.after, [server]).after, first.after);
  const commented = '[mcp_servers."dev-victoria-metrics"]# comment [brackets]\nurl = "https://real.invalid/mcp" # keep\nenabled_tools = [ "query" ]\n';
  assert.equal(mergeClientConfig(commented, [server]).after, commented);
});

test('reports missing recent data without claiming ingestion is ready', async t => {
  const f = fixture(t);
  const queryFn = async opts => opts.list ? f.queryFn(opts) : { result: { content: [{ type: 'text', text: opts.kind === 'metrics' ? '{"status":"success","data":{"result":[]}}' : '' }] } };
  const out = await setup(f.opts, { ...f, queryFn });
  assert.equal(out.status, 'connected-with-no-recent-data');
  assert.ok(Object.values(out.checks).every(x => x.querySucceeded && !x.hasData));
});

test('a public bundle with no embedded environment requires explicit URLs before contacting any endpoint', async t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.source, 'references/environments.json'), '{}\n');
  await assert.rejects(setup({ ...f.opts, apply: true }, f));
  assert.equal(f.calls.length, 0);
  assert.equal(fs.existsSync(f.home), false);
  const installed = await setup({ ...f.opts, 'metrics-url': 'https://metrics.example.com/mcp', 'logs-url': 'https://logs.example.com/mcp', apply: true }, f);
  assert.equal(installed.initialized, true);
  const stored = JSON.parse(fs.readFileSync(installed.profiles.path));
  assert.equal(stored.dev.metrics.url, 'https://metrics.example.com/mcp');
  assert.equal(stored.dev.logs.url, 'https://logs.example.com/mcp');
});
