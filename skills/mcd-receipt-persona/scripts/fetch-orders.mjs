#!/usr/bin/env node
/**
 * fetch-orders：通过麦当劳 MCP（Streamable HTTP）拉取历史订单，脱敏后保存到本地，并与已有历史合并。
 *
 * 只调用只读工具：order-list、query-order。
 * 不保存手机号、收货地址、骑手信息；订单号、门店编码只保存哈希。
 *
 * 用法：
 *   node fetch-orders.mjs [--out output/history.json] [--config <mcp 配置文件>] [--detail 30]
 *
 * Token 来源（优先级）：环境变量 MCD_MCP_TOKEN → --config 指定的文件 → 当前目录下的 mcp-config.local.json。
 * Token 不会被打印或写入任何输出文件。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { extractJson } from './wrapped.mjs';
import { REPO } from './lib/brand.mjs';

const MCP_URL = 'https://mcp.mcd.cn';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 12);

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), nx = argv[i + 1];
    if (nx === undefined || nx.startsWith('--')) a[k] = true; else { a[k] = nx; i++; }
  }
  return a;
}

function resolveAuth(configPath) {
  const env = process.env.MCD_MCP_TOKEN?.trim();
  if (env) return { header: `Bearer ${env}`, url: MCP_URL };
  if (configPath && existsSync(resolve(configPath))) {
    const cfg = JSON.parse(readFileSync(resolve(configPath), 'utf8').replace(/^\uFEFF/, ''));
    const srv = cfg.mcpServers?.['mcd-mcp'] ?? Object.values(cfg.mcpServers ?? {})[0];
    const auth = srv?.headers?.Authorization;
    if (auth && !/\$\{[^}]+\}/.test(auth)) return { header: auth, url: srv.url || MCP_URL };
  }
  return null;
}

class McpClient {
  constructor(url, auth) { this.url = url; this.auth = auth; this.sid = null; this.id = 0; }
  async rpc(method, params, notify = false, attempt = 0) {
    const body = { jsonrpc: '2.0', method, ...(params ? { params } : {}), ...(notify ? {} : { id: ++this.id }) };
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: this.auth };
    if (this.sid) headers['Mcp-Session-Id'] = this.sid;
    const r = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    this.sid = r.headers.get('mcp-session-id') || this.sid;
    if (r.status === 401) throw new Error('MCP Token 无效或已过期（401）。请检查 Token 配置。');
    if (r.status === 429 && attempt < 3) { await sleep(2000 * (attempt + 1)); return this.rpc(method, params, notify, attempt + 1); }
    if (!r.ok) throw new Error(`MCP 请求失败：HTTP ${r.status}`);
    if (notify) return null;
    const text = await r.text();
    const datas = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
    return JSON.parse(datas.length ? datas[datas.length - 1] : text);
  }
  async init() {
    await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: REPO, version: '1.0.0' } });
    await this.rpc('notifications/initialized', undefined, true);
  }
  async call(name, args = {}) {
    const r = await this.rpc('tools/call', { name, arguments: args });
    if (r.error) throw new Error(`${name} 调用失败：${r.error.message ?? '未知错误'}`);
    if (r.result?.isError) throw new Error(`${name} 返回错误：${String(r.result.content?.[0]?.text ?? '').slice(0, 120)}`);
    const text = (r.result?.content ?? []).map((c) => c.text ?? '').join('\n');
    const mark = text.indexOf('## Original Response');
    const json = extractJson(mark >= 0 ? text.slice(mark + 20) : text);
    if (!json) throw new Error(`${name} 的返回无法解析为 JSON`);
    return json;
  }
}

// 脱敏：只保留统计需要的字段
function sanitizeOrder(o) {
  const prods = (o.orderProductList ?? []).map((p) => ({
    productName: p.productName,
    quantity: p.quantity ?? 1,
    comboItemList: (p.comboItemList ?? []).map((c) => ({ name: c.name ?? c.itemName, quantity: c.quantity ?? c.itemQuantity ?? 1 })),
  }));
  return {
    orderId: hash(o.orderId),
    createTime: o.createTime,
    orderType: o.orderType,
    beType: o.beType,
    storeCode: o.storeCode ? hash(o.storeCode) : undefined,
    orderStatus: o.orderStatus,
    realTotalAmount: o.realTotalAmount,
    orderProductList: prods,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = resolve(String(args.out && args.out !== true ? args.out : 'output/history.json'));
  const detailMax = args.detail === undefined ? 30 : Math.max(0, parseInt(args.detail, 10) || 0);
  const auth = resolveAuth(args.config && args.config !== true ? String(args.config) : 'mcp-config.local.json');
  if (!auth) {
    console.error('未找到 MCP Token。请先设置环境变量 MCD_MCP_TOKEN，或用 --config 指向包含 Token 的本地 MCP 配置文件。\n获取 Token：https://open.mcd.cn/mcp');
    process.exit(2);
  }

  const client = new McpClient(auth.url, auth.header);
  await client.init();

  const listJson = await client.call('order-list');
  const latest = listJson?.data?.list ?? [];
  console.log(`order-list 返回 ${latest.length} 单（该接口只提供最近的订单，不支持分页）`);

  const prev = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')).orders ?? []) : [];
  const byId = new Map(prev.map((o) => [o.orderId, o]));
  let added = 0;
  for (const raw of latest) {
    const s = sanitizeOrder(raw);
    if (!byId.has(s.orderId)) { byId.set(s.orderId, s); added++; }
    else byId.set(s.orderId, { ...byId.get(s.orderId), ...s, totalDiscountAmount: byId.get(s.orderId).totalDiscountAmount });
  }

  // 用 query-order 补充优惠金额（order-list 不含）。串行 + 间隔，远低于 600 次/分钟的限流。
  const rawIds = new Map(latest.map((o) => [hash(o.orderId), o.orderId]));
  let detailed = 0, failed = 0;
  for (const [h, realId] of rawIds) {
    if (detailed >= detailMax) break;
    const cur = byId.get(h);
    if (cur.totalDiscountAmount !== undefined) continue;
    try {
      const d = (await client.call('query-order', { orderId: realId }))?.data ?? {};
      cur.totalDiscountAmount = d.totalDiscountAmount ?? '0';
      if (d.realTotalAmount != null) cur.realTotalAmount = d.realTotalAmount;
      detailed++;
    } catch (e) { failed++; if (process.env.MCD_DEBUG) console.error('  query-order 失败：' + e.message); if (/401/.test(e.message)) throw e; }
    await sleep(150);
  }

  const orders = [...byId.values()].sort((a, b) => String(a.createTime).localeCompare(String(b.createTime)));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ updatedAt: new Date().toISOString(), orders }, null, 2) + '\n');
  console.log(`新增 ${added} 单；补充优惠信息 ${detailed} 单${failed ? `（失败 ${failed} 单）` : ''}；本地历史共 ${orders.length} 单`);
  console.log(`已保存（已脱敏）：${out}`);
}

main().catch((e) => { console.error(`出错了：${e.message}`); process.exit(1); });


