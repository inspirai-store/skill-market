import test from 'node:test';
import assert from 'node:assert/strict';
import { options, query } from './query.mjs';

function fixture({ sse = false, required = ['query'], error, onlyUnsafe = false } = {}) {
  const calls = [];
  const fetcher = async (_url, init) => {
    const request = JSON.parse(init.body);
    calls.push({ request, headers: init.headers });
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 });
    let result;
    if (request.method === 'initialize') result = { protocolVersion: '2025-03-26', serverInfo: { name: 'test', version: '1' }, capabilities: {} };
    else if (request.method === 'tools/list') result = { tools: [
      ...(onlyUnsafe ? [] : [{ name: 'query', inputSchema: { type: 'object', properties: { query: { type: 'string' }, start: { type: 'string' }, limit: { type: 'number' } }, required } }]),
      { name: 'delete_series', inputSchema: { type: 'object' } },
    ] };
    else if (request.method === 'tools/call') result = error
      ? { isError: true, content: [{ type: 'text', text: error }] }
      : { content: [{ type: 'text', text: '{"count":7,"message":"日志🧪"}' }] };
    else throw new Error('Unexpected RPC method');
    const envelope = { jsonrpc: '2.0', id: request.id, result };
    const headers = { 'content-type': sse ? 'text/event-stream' : 'application/json', 'mcp-session-id': 'test-session' };
    if (!sse) return new Response(JSON.stringify(envelope), { headers });
    const body = `event: message\ndata: ${JSON.stringify(envelope)}\n\n`;
    const bytes = new TextEncoder().encode(body);
    const split = Math.max(1, bytes.indexOf(0xf0) + 2);
    return new Response(new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, split)); c.enqueue(bytes.slice(split)); c.close(); } }), { headers });
  };
  return { calls, fetcher };
}

const target = { kind: 'metrics', url: 'http://example.invalid/mcp', tool: 'query', args: '{"query":"up"}' };

test('requires an explicit target and denies writes before any network request', async () => {
  const f = fixture();
  await assert.rejects(query({ kind: 'metrics', tool: 'query' }, f));
  await assert.rejects(query({ ...target, tool: 'delete_series' }, f));
  assert.equal(f.calls.length, 0);
  assert.throws(() => options(['--unknown']));
});

test('negotiates JSON-RPC state, then executes exactly the requested read', async () => {
  const f = fixture();
  const out = await query(target, f);
  assert.equal(JSON.parse(out.result.content[0].text).count, 7);
  assert.deepEqual(f.calls.map(x => x.request.method), ['initialize', 'notifications/initialized', 'tools/list', 'tools/call']);
  assert.equal(f.calls[1].request.id, undefined);
  assert.equal(f.calls[3].headers['mcp-session-id'], 'test-session');
  assert.equal(f.calls[3].headers['mcp-protocol-version'], '2025-03-26');
  assert.deepEqual(f.calls[3].request.params, { name: 'query', arguments: { query: 'up' } });
});

test('reads SSE and preserves a multibyte string split across chunks', async () => {
  const out = await query(target, fixture({ sse: true }));
  assert.equal(JSON.parse(out.result.content[0].text).message, '日志🧪');
});

test('uses the discovered schema, requires log start and supplies a modest default limit', async () => {
  const first = fixture({ required: ['query', 'start'] });
  await assert.rejects(query({ ...target, kind: 'logs', args: '{"query":"*"}' }, first));
  assert.equal(first.calls.filter(x => x.request.method === 'tools/call').length, 0);
  const second = fixture({ required: ['query', 'start'] });
  await query({ ...target, kind: 'logs', args: '{"query":"*","start":"2026-11-06T10:00:00Z"}' }, second);
  assert.equal(second.calls.at(-1).request.params.arguments.limit, 100);
});

test('filters unsafe catalog entries and does not invent unavailable read tools', async () => {
  const f = fixture({ onlyUnsafe: true });
  const listing = await query({ kind: 'metrics', url: target.url, list: true }, f);
  assert.deepEqual(listing.tools, []);
  assert.deepEqual(listing.otherToolNames, ['delete_series']);
  await assert.rejects(query(target, f));
  assert.equal(f.calls.filter(x => x.request.method === 'tools/call').length, 0);
});

test('reads bearer credentials from environment and redacts a reflected token in errors', async () => {
  const token = 'synthetic-test-token';
  const f = fixture({ error: `Rejected credential: ${token}` });
  await assert.rejects(query({ ...target, 'bearer-env': 'TEST_TOKEN' }, { ...f, env: { TEST_TOKEN: token } }), error => !error.message.includes(token) && error.message.includes('[REDACTED]'));
  assert.equal(f.calls[0].headers.authorization, `Bearer ${token}`);
});
