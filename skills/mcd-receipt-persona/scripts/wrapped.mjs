#!/usr/bin/env node
/**
 * mcd-receipt-persona（麦味人格）：把麦当劳历史订单变成「点餐人格」小票故事卡片。
 *
 * 零依赖（仅 Node.js >= 18），全程本地计算，不联网、不上传任何数据。
 * 导出 PNG 时会调用本机已安装的 Edge / Chrome（--png），没有浏览器也能得到 SVG 和 HTML。
 *
 * 用法：
 *   node wrapped.mjs --input orders.json --out ./output [--png] [--name 昵称] [--repo 页脚署名]
 *   node wrapped.mjs --demo --out ./output
 *   node wrapped.mjs --dump-demo examples/demo-orders.json
 *
 * 输入既可以是标准化格式（见 references/input-schema.md），
 * 也可以是 order-list / query-order 的原始返回（脚本会尽力自动识别字段）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { AXES, PERSONAS } from './lib/personas.mjs';
import { buildDeck } from './lib/cards.mjs';
import { renderViewer, renderLong } from './lib/report.mjs';
import { exportPngs, findBrowser, shot } from './lib/export.mjs';
import { buildAtlas } from './lib/atlas.mjs';
import { REPO } from './lib/brand.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

// ───────────────────────────── 参数 ─────────────────────────────
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const k = t.slice(2);
    const nx = argv[i + 1];
    if (nx === undefined || nx.startsWith('--')) a[k] = true;
    else { a[k] = nx; i++; }
  }
  return a;
}

// ───────────────────────────── 工具函数 ─────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0');
const pct = (x) => `${Math.round(x * 100)}%`;
const money = (x) => `¥${(Math.round(x * 100) / 100).toFixed(x % 1 === 0 ? 0 : 2)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const isCJK = (ch) => /[\u2e80-\u9fff\uff00-\uffef]/.test(ch);

function charW(ch, size) { return isCJK(ch) ? size : size * 0.56; }
function textW(s, size) { let w = 0; for (const ch of s) w += charW(ch, size); return w; }
function fitText(s, maxPx, size) {
  if (textW(s, size) <= maxPx) return s;
  let out = '';
  for (const ch of s) {
    if (textW(out + ch + '…', size) > maxPx) break;
    out += ch;
  }
  return out + '…';
}
function wrapText(s, maxPx, size) {
  const lines = []; let cur = '';
  for (const ch of s) {
    if (textW(cur + ch, size) > maxPx) { lines.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

function pick(obj, keys) {
  for (const k of keys) {
    let v = obj;
    for (const part of k.split('.')) { v = v == null ? undefined : v[part]; }
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ───────────────────────────── 时间解析（北京时间墙上时间） ─────────────────────────────
function parseTime(v) {
  if (v == null || v === '') return null;
  let parts = null;
  if (typeof v === 'number' || /^\d{10,13}$/.test(String(v).trim())) {
    let n = Number(v); if (n < 1e11) n *= 1000;
    const d = new Date(n + 8 * 3600e3);
    parts = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
  } else {
    const s = String(v).trim();
    if (/T.*(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
      const t = Date.parse(s);
      if (!Number.isNaN(t)) {
        const d = new Date(t + 8 * 3600e3);
        parts = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
      }
    }
    if (!parts) {
      const m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[T\s]*(\d{1,2})[:时](\d{2}))?/)
        || s.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2}))?/);
      if (m) parts = { y: +m[1], m: +m[2], d: +m[3], h: m[4] ? +m[4] : 12, mi: m[5] ? +m[5] : 0, hasTime: !!m[4] };
    }
  }
  if (!parts || parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 31) return null;
  parts.dow = new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay();
  parts.dateKey = `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`;
  parts.dayNum = Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / 86400000);
  parts.minutes = parts.h * 60 + parts.mi;
  return parts;
}

// ───────────────────────────── 字段词典（对未知返回结构做容错） ─────────────────────────────
const TIME_KEYS = ['time', 'orderTime', 'createTime', 'createdAt', 'created_at', 'gmtCreate', 'payTime', 'orderDate', 'orderCreateTime', 'orderDateTime', 'date', 'dateTime', 'placeOrderTime', 'submitTime'];
const AMOUNT_KEYS = ['amount', 'realTotalAmount', 'payAmount', 'actualAmount', 'actualPay', 'realAmount', 'paidAmount', 'orderAmount', 'totalAmount', 'payPrice', 'orderPrice', 'totalPrice'];
const DISCOUNT_KEYS = ['discount', 'totalDiscountAmount', 'discountAmount', 'couponAmount', 'reduceAmount', 'preferentialAmount', 'couponDiscount', 'discountPrice'];
const TYPE_KEYS = ['type', 'orderType', 'diningType', 'eatType', 'deliveryType', 'orderChannel', 'channel', 'scene', 'sceneType', 'dineType', 'orderTypeName', 'diningTypeName'];
const STORE_KEYS = ['store', 'storeCode', 'storeName', 'shopName', 'restaurantName', 'store.name', 'shop.name'];
const ITEM_ARRAY_KEYS = ['items', 'orderProductList', 'products', 'productList', 'mealList', 'meals', 'goods', 'orderItems', 'details', 'itemList', 'commodityList', 'skuList', 'orderProducts', 'productInfos', 'orderDetails'];
const ITEM_NAME_KEYS = ['name', 'productName', 'mealName', 'title', 'itemName', 'skuName', 'goodsName', 'spuName', 'commodityName'];
const ITEM_QTY_KEYS = ['qty', 'quantity', 'itemQuantity', 'count', 'num', 'number', 'buyNum', 'productNum'];
const COMBO_KEYS = ['comboItemList', 'subItems', 'children'];
// 套餐里的蘸酱、餐具等不算"餐品"，不参与最爱餐品和品类统计
const IGNORE_ITEM_RE = /酱$|蘸料|餐具|吸管|纸巾|打包|配送费/;
const cleanName = (s) => String(s).replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim();
const ITEM_PRICE_KEYS = ['price', 'unitPrice', 'salePrice', 'actualPrice', 'productPrice'];
const ID_KEYS = ['orderId', 'orderNo', 'orderNumber', 'id', 'orderCode'];
const STATUS_KEYS = ['status', 'orderStatus', 'statusName', 'statusDesc', 'orderStatusName'];

function hasTimeKey(o) {
  return o && typeof o === 'object' && !Array.isArray(o) && TIME_KEYS.some((k) => o[k] != null && parseTime(o[k]));
}

function mapType(v, order) {
  // 麦当劳 MCP：beType 1 到店取餐 / 4 甜品站等 → 到店；2 麦乐送；5 得来速；6 企业团餐
  const be = order && order.beType != null ? String(order.beType) : '';
  if (be === '2') return 'delivery';
  if (be === '5') return 'drive';
  if (be === '6') return 'group';
  if (be === '1' || be === '4') return 'pickup';
  // 没有 beType 时：orderType 1 到店（含得来速）、2 外送（含团餐）
  if (order && order.orderType != null && /^[12]$/.test(String(order.orderType)) && (v === undefined || /^[12]$/.test(String(v)))) {
    return String(order.orderType) === '2' ? 'delivery' : 'pickup';
  }
  const s = String(v ?? '').toLowerCase();
  if (/外送|麦乐送|配送|delivery|takeout_delivery/.test(s)) return 'delivery';
  if (/得来速|drive/.test(s)) return 'drive';
  if (/团餐|group/.test(s)) return 'group';
  if (/堂食|店内|dine|eat.?in/.test(s)) return 'dinein';
  if (/外带|自取|取餐|takeaway|take.?away|pickup|pick.?up|to.?go/.test(s)) return 'pickup';
  if (order && (order.deliveryAddress || order.addressId || order.address)) return 'delivery';
  return 'unknown';
}

const CANCEL_RE = /取消|关闭|退款|cancel|closed|refund|已失效/i;

// 从一段文本里取出第一个完整的 JSON 对象/数组（识别字符串内的括号，忽略前后的说明文字）
export function extractJson(text) {
  // 说明文字里可能有 [alt] 之类的括号：候选解析失败就从下一个起点继续找，优先要对象
  let from = 0;
  while (from < text.length) {
    const rel = text.slice(from).search(/[{[]/);
    if (rel < 0) return null;
    const start = from + rel;
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end > 0) {
      try {
        const v = JSON.parse(text.slice(start, end + 1));
        if (v && typeof v === 'object') return v;
      } catch { /* 不是 JSON，继续往后找 */ }
    }
    from = start + 1;
  }
  return null;
}

// 递归收集订单数组（兼容 MCP 的 content[].text：纯 JSON 字符串，或「说明 + ## Original Response + JSON」的 Markdown）
function collectOrders(node, out, depth = 0) {
  if (depth > 8 || node == null) return;
  if (typeof node === 'string') {
    const t = node.trim();
    let parsed = null;
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try { parsed = JSON.parse(t); } catch { /* 继续尝试下面的提取 */ }
    }
    if (!parsed) {
      const mark = t.indexOf('## Original Response');
      if (mark >= 0) parsed = extractJson(t.slice(mark + 20));
    }
    if (parsed) collectOrders(parsed, out, depth + 1);
    return;
  }
  if (Array.isArray(node)) {
    if (node.length && node.some(hasTimeKey)) { for (const o of node) if (hasTimeKey(o)) out.push(o); return; }
    for (const x of node) collectOrders(x, out, depth + 1);
    return;
  }
  if (typeof node === 'object') {
    if (hasTimeKey(node) && (ITEM_ARRAY_KEYS.some((k) => Array.isArray(node[k])) || AMOUNT_KEYS.some((k) => node[k] != null))) { out.push(node); return; }
    for (const v of Object.values(node)) collectOrders(v, out, depth + 1);
  }
}

function itemsFromOrder(o) {
  for (const k of ITEM_ARRAY_KEYS) {
    if (Array.isArray(o[k]) && o[k].length) {
      const items = [];
      const push = (name, qty, price) => {
        const n = cleanName(name);
        if (!n || IGNORE_ITEM_RE.test(n)) return;
        items.push({ name: n, qty: Math.max(1, Math.round(qty ?? 1)), price: price ?? null });
      };
      for (const it of o[k]) {
        if (typeof it === 'string') { push(it, 1, null); continue; }
        const name = pick(it, [...ITEM_NAME_KEYS, 'itemName']);
        if (!name) continue;
        const qty = toNumber(pick(it, ITEM_QTY_KEYS)) ?? 1;
        // 套餐：真正的餐品在子项里（如「人气经典随心配」= 双层吉士汉堡 + 小杯玉米杯），展开统计
        const comboKey = COMBO_KEYS.find((ck) => Array.isArray(it[ck]) && it[ck].length);
        if (comboKey) {
          for (const c of it[comboKey]) {
            const cn = pick(c, [...ITEM_NAME_KEYS, 'itemName']);
            if (cn) push(cn, (toNumber(pick(c, ITEM_QTY_KEYS)) ?? 1) * qty, null);
          }
        } else {
          push(name, qty, toNumber(pick(it, ITEM_PRICE_KEYS)));
        }
      }
      if (items.length) return items;
    }
  }
  const text = pick(o, ['orderName', 'productNames', 'summary', 'desc', 'description', 'itemsText']);
  if (typeof text === 'string' && text.trim()) {
    return text.split(/[、,，+;；\n]/).map((s) => s.trim()).filter(Boolean).map((name) => {
      const m = name.match(/^(.*?)\s*[x×*]\s*(\d+)$/i);
      return m ? { name: m[1], qty: +m[2], price: null } : { name, qty: 1, price: null };
    });
  }
  return [];
}

export function normalizeOrders(raw, opts = {}) {
  const found = [];
  collectOrders(raw, found);
  const seen = new Set();
  const orders = [];
  let skippedCancelled = 0, skippedNoTime = 0;
  for (const o of found) {
    const id = pick(o, ID_KEYS);
    if (id != null) { if (seen.has(String(id))) continue; seen.add(String(id)); }
    const status = pick(o, STATUS_KEYS);
    if (status != null && CANCEL_RE.test(String(status))) { skippedCancelled++; continue; }
    const tRaw = pick(o, TIME_KEYS.filter((k) => o[k] != null && parseTime(o[k])));
    const t = parseTime(tRaw);
    if (!t) { skippedNoTime++; continue; }
    const items = itemsFromOrder(o);
    const divisor = opts.amountUnit === 'cents' ? 100 : 1;
    let amount = toNumber(pick(o, AMOUNT_KEYS));
    if (amount != null) amount /= divisor;
    if (amount == null) {
      const s = items.reduce((a, it) => a + (it.price ?? 0) * it.qty, 0);
      amount = s > 0 ? s : null;
    }
    let discount = toNumber(pick(o, DISCOUNT_KEYS));
    if (discount != null) discount = Math.abs(discount) / divisor;
    const storeVal = pick(o, STORE_KEYS);
    const store = typeof storeVal === 'object' ? (storeVal?.name ?? null) : (storeVal ?? null);
    orders.push({
      id: id != null ? String(id) : null,
      t,
      amount,
      discount: discount ?? 0,
      hasDiscountField: discount != null,
      type: mapType(pick(o, TYPE_KEYS), o),
      store: store ? String(store) : null,
      items,
    });
  }
  orders.sort((a, b) => a.t.dayNum - b.t.dayNum || a.t.minutes - b.t.minutes);
  return { orders, meta: { found: found.length, skippedCancelled, skippedNoTime } };
}

// ───────────────────────────── 餐品分类 ─────────────────────────────
const CATEGORIES = [
  ['甜品', /冰淇淋|圣代|麦旋风|甜筒|苹果派|红豆派|菠萝派|蛋挞|新地|甜品|派$/],
  ['饮品', /可乐|雪碧|芬达|美汁源|果汁|橙汁|咖啡|拿铁|美式|卡布|摩卡|玛奇朵|茶|牛奶|豆浆|矿泉|纯净水|气泡水|奶昔|冰沙|饮/],
  ['早餐', /满分|粥|油条|烧饼|早餐|薯饼|蛋卷|松饼|早安/],
  ['汉堡', /堡|巨无霸|Big ?Mac/i],
  ['鸡肉小食', /麦乐鸡|鸡翅|翅|鸡块|鸡腿|脆汁鸡|鸡柳|鸡排|鸡米花/],
  ['薯类', /薯/],
  ['轻食', /沙拉|玉米|轻食|蔬/],
];
export function categorize(name) {
  for (const [cat, re] of CATEGORIES) if (re.test(name)) return cat;
  return '其他';
}

// ───────────────────────────── 统计 ─────────────────────────────
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SLOTS = [
  { key: '早餐', test: (m) => m >= 300 && m < 630 },
  { key: '午餐', test: (m) => m >= 630 && m < 840 },
  { key: '下午茶', test: (m) => m >= 840 && m < 1020 },
  { key: '晚餐', test: (m) => m >= 1020 && m < 1260 },
  { key: '夜宵', test: (m) => m >= 1260 || m < 300 },
];
const TYPE_LABEL = { delivery: '麦乐送外送', dinein: '堂食', pickup: '外带/取餐', drive: '得来速', group: '团餐', unknown: '未标注' };

export function computeStats(orders) {
  const n = orders.length;
  const spent = orders.reduce((a, o) => a + (o.amount ?? 0), 0);
  const saved = orders.reduce((a, o) => a + (o.discount ?? 0), 0);
  const hasAmount = orders.some((o) => o.amount != null);
  const hasDiscountData = orders.some((o) => o.hasDiscountField);

  const itemMap = new Map();
  const itemOrders = new Map();
  const catMap = new Map();
  let totalQty = 0;
  for (const o of orders) {
    const names = new Set();
    for (const it of o.items) {
      itemMap.set(it.name, (itemMap.get(it.name) ?? 0) + it.qty);
      if (!names.has(it.name)) itemOrders.set(it.name, (itemOrders.get(it.name) ?? 0) + 1);
      const c = categorize(it.name);
      catMap.set(c, (catMap.get(c) ?? 0) + it.qty);
      totalQty += it.qty;
      names.add(it.name);
    }
    o._names = names;
  }
  // 按「出现在多少单里」排序，份数作为次要排序（避免一单里点 3 份就被当成最爱）
  const topItems = [...itemMap.entries()]
    .sort((a, b) => (itemOrders.get(b[0]) - itemOrders.get(a[0])) || (b[1] - a[1]))
    .slice(0, 10)
    .map(([name, qty]) => ({ name, qty, orders: itemOrders.get(name), category: categorize(name) }));
  const topItem = topItems[0]?.name ?? '—';
  const topItemOrders = topItems[0]?.orders ?? 0;
  const topItemShare = n ? topItemOrders / n : 0;

  const hourHist = Array(24).fill(0);
  const slotCount = Object.fromEntries(SLOTS.map((s) => [s.key, 0]));
  const dowCount = Array(7).fill(0);
  const monthCount = new Map();
  const typeCount = {};
  let dayCount = 0;
  const adjusted = (m) => (m < 300 ? m + 1440 : m);
  let latest = null, earliest = null;
  for (const o of orders) {
    hourHist[o.t.h]++;
    for (const s of SLOTS) if (s.test(o.t.minutes)) { slotCount[s.key]++; break; }
    if (o.t.minutes >= 300 && o.t.minutes < 1020) dayCount++;
    dowCount[o.t.dow]++;
    const ym = `${o.t.y}-${pad2(o.t.m)}`;
    monthCount.set(ym, (monthCount.get(ym) ?? 0) + 1);
    typeCount[o.type] = (typeCount[o.type] ?? 0) + 1;
    if (!latest || adjusted(o.t.minutes) > adjusted(latest.minutes)) latest = o.t;
    if (!earliest || adjusted(o.t.minutes) < adjusted(earliest.minutes)) earliest = o.t;
  }
  const dayShare = n ? dayCount / n : 0;
  const knownType = n - (typeCount.unknown ?? 0);
  const deliveryShare = knownType ? (typeCount.delivery ?? 0) / knownType : 0;
  const couponOrders = orders.filter((o) => o.discount > 0).length;
  const couponShare = n ? couponOrders / n : 0;

  const days = [...new Set(orders.map((o) => o.t.dayNum))].sort((a, b) => a - b);
  let streak = 1, bestStreak = days.length ? 1 : 0, bestEnd = days[0];
  for (let i = 1; i < days.length; i++) {
    streak = days[i] === days[i - 1] + 1 ? streak + 1 : 1;
    if (streak > bestStreak) { bestStreak = streak; bestEnd = days[i]; }
  }
  // 并列第一不能随便挑一个：样本少的时候并列很常见，如实列出全部
  const topSlotCount = Math.max(...Object.values(slotCount));
  const topSlots = topSlotCount > 0 ? Object.entries(slotCount).filter(([, c]) => c === topSlotCount).map(([k]) => k) : [];
  const topDowCount = Math.max(...dowCount);
  const topDows = dowCount.map((c, i) => [c, i]).filter(([c]) => c === topDowCount).map(([, i]) => WEEK[i]);
  const monthsSorted = [...monthCount.entries()].sort((a, b) => b[1] - a[1]);
  const topMonth = monthsSorted.length > 1 && monthsSorted[0][1] > monthsSorted[1][1] ? monthsSorted[0] : null;
  const maxOrder = orders.reduce((m, o) => ((o.amount ?? 0) > (m?.amount ?? -1) ? o : m), null);
  const stores = new Set(orders.map((o) => o.store).filter(Boolean));
  const fmtT = (t) => (t ? `${pad2(t.h)}:${pad2(t.mi)}` : '—');

  return {
    n, spent, saved, hasAmount, hasDiscountData, totalQty,
    avgAmount: n && hasAmount ? spent / n : 0,
    maxAmount: maxOrder?.amount ?? 0,
    period: { from: orders[0]?.t.dateKey, to: orders[n - 1]?.t.dateKey, activeDays: days.length },
    topItems, topItem, topItemOrders, topItemShare,
    distinctItems: itemMap.size,
    categories: [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, qty]) => ({ name, qty, share: totalQty ? qty / totalQty : 0 })),
    hourHist, slotCount, topSlots, topSlotCount,
    topSlot: topSlots.length > 1 ? `${topSlots.join('、')}（并列）` : (topSlots[0] ?? '—'),
    dowCount, topDows, topDowCount, topDow: topDows.length > 1 ? `${topDows.join('、')}（并列）` : topDows[0],
    topMonth: topMonth ? { month: topMonth[0], count: topMonth[1] } : null,
    monthCount: [...monthCount.entries()].sort(),
    typeCount, knownType, dayShare, deliveryShare, couponOrders, couponShare,
    bestStreak, latest: fmtT(latest), earliest: fmtT(earliest),
    storeCount: stores.size,
  };
}

// ───────────────────────────── 人格 ─────────────────────────────
export function derivePersona(st) {
  const day = st.dayShare >= 0.5;
  const home = st.knownType > 0 && st.deliveryShare >= 0.5;
  const loyal = st.topItemShare >= 0.35;
  const budget = st.couponShare >= 0.4 || (st.hasDiscountData && st.saved / Math.max(1, st.spent + st.saved) >= 0.12);
  const code = `${day ? 'D' : 'N'}${home ? 'H' : 'S'}${loyal ? 'L' : 'X'}${budget ? 'B' : 'F'}`;
  const top = fitText(st.topItem, 8 * 20, 20);
  const axes = [
    { axis: AXES[0], pick: day ? AXES[0].a : AXES[0].b, strength: day ? st.dayShare : 1 - st.dayShare,
      note: day ? `05–17 点下单占 ${pct(st.dayShare)}` : `17 点后及凌晨下单占 ${pct(1 - st.dayShare)}` },
    { axis: AXES[1], pick: home ? AXES[1].a : AXES[1].b, strength: st.knownType ? (home ? st.deliveryShare : 1 - st.deliveryShare) : 0.5,
      note: st.knownType ? (home ? `麦乐送外送占 ${pct(st.deliveryShare)}` : `到店/外带/得来速占 ${pct(1 - st.deliveryShare)}`) : '订单未标注就餐方式，按到店计' },
    { axis: AXES[2], pick: loyal ? AXES[2].a : AXES[2].b, strength: loyal ? st.topItemShare : 1 - st.topItemShare,
      note: loyal ? `「${top}」出现在 ${pct(st.topItemShare)} 的订单里`
        : st.topItemOrders <= 1 ? '几乎每次都点不一样的，没有重复的"本命"餐品'
          : `最常点的「${top}」也只占 ${pct(st.topItemShare)} 的订单` },
    { axis: AXES[3], pick: budget ? AXES[3].a : AXES[3].b, strength: budget ? Math.max(st.couponShare, 0.4) : 1 - st.couponShare,
      note: st.hasDiscountData ? (budget ? `${pct(st.couponShare)} 的订单用了优惠` : `只有 ${pct(st.couponShare)} 的订单用了优惠`) : '订单未包含优惠数据，按随心派计' },
  ];
  const [title, sub, tagline] = PERSONAS[code];
  return { code, title, sub, tagline, axes, lowSample: st.n < 5 };
}

export function buildInsights(st) {
  const out = [];
  const night = st.hourHist.slice(21).reduce((a, b) => a + b, 0) + st.hourHist.slice(0, 5).reduce((a, b) => a + b, 0);
  if (st.n && night / st.n >= 0.2) out.push(`${pct(night / st.n)} 的订单发生在 21 点之后`);
  if (st.topItem !== '—' && st.topItemOrders >= 2) out.push(`「${st.topItem}」出现在 ${pct(st.topItemShare)} 的订单里`);
  else if (st.n >= 3 && st.distinctItems >= 3) out.push(`${st.distinctItems} 种不同餐品，几乎没有重复，是真正的尝鲜派`);
  if (st.bestStreak >= 2) out.push(`最长连续 ${st.bestStreak} 天都有订单`);
  if (st.saved > 0) out.push(`${st.couponOrders} 单用了优惠，累计省下 ${money(st.saved)}`);
  if (st.topMonth) out.push(`${st.topMonth.month} 是你最活跃的一个月（${st.topMonth.count} 单）`);
  // 每个星期几都只有 1 单时，"最常下单的一天"没有意义，不说
  if (st.topDowCount >= 2) {
    out.push(st.topDows.length > 1 ? `${st.topDows.join('、')}并列最常下单（各 ${st.topDowCount} 单）` : `${st.topDow}是你最常下单的一天（${st.topDowCount} 单）`);
  }
  if (st.topSlots.length === 1 && st.n >= 3) out.push(`${st.topSlot}是你的主场（${st.topSlotCount} 单）`);
  return out.slice(0, 5);
}

function renderMarkdown(st, persona, insights) {
  return [
    `# 我的麦当劳点餐人格：「${persona.title}」${persona.code}`,
    '',
    `> ${persona.tagline}`,
    '',
    `- 统计周期：${st.period.from} – ${st.period.to}（${st.period.activeDays} 个下单日）`,
    `- 订单数：${st.n}　累计消费：${st.hasAmount ? money(st.spent) : '—'}　累计省下：${st.hasDiscountData ? money(st.saved) : '—'}`,
    `- 最爱餐品：${st.topItem}　最常时段：${st.topSlot}　最晚下单：${st.latest}　最长连续：${st.bestStreak} 天`,
    '',
    '## 四个维度',
    ...persona.axes.map((a) => `- ${a.pick.name}（${pct(a.strength)}）：${a.note}`),
    '',
    '## 有意思的发现',
    ...insights.map((s) => `- ${s}`),
    '',
    persona.lowSample ? '> 样本较少（不足 5 单），结果仅供参考。\n' : '',
    '_本报告在本地生成，非麦当劳官方产品，仅供娱乐。_',
  ].join('\n');
}

// ───────────────────────────── 演示数据（确定性伪随机，不含任何真实信息） ─────────────────────────────
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function demoOrders() {
  const rnd = mulberry32(1024);
  const menu = [
    ['巨无霸套餐', 39], ['麦辣鸡腿堡套餐', 36], ['板烧鸡腿堡', 22], ['双层吉士汉堡', 20], ['麦乐鸡(5块)', 12],
    ['麦辣鸡翅(4块)', 18], ['中薯条', 11], ['大薯条', 14], ['中可乐', 9], ['美式咖啡', 12], ['拿铁', 15],
    ['苹果派', 8], ['麦旋风', 14], ['猪柳蛋麦满分', 14], ['薯饼', 7], ['玉米杯', 8], ['圆筒冰淇淋', 6], ['麦麦脆汁鸡(2块)', 32],
  ];
  const orders = [];
  const start = Date.UTC(2026, 0, 5);
  for (let d = 0; d < 277; d++) {
    const p = d % 9 < 3 ? 0.38 : 0.12; // 制造一些连续下单的日子
    if (rnd() > p) continue;
    const day = new Date(start + d * 86400000);
    const r = rnd();
    const h = r < 0.18 ? 8 + Math.floor(rnd() * 3) : r < 0.3 ? 12 + Math.floor(rnd() * 2) : r < 0.45 ? 15 + Math.floor(rnd() * 2) : 19 + Math.floor(rnd() * 5);
    const mi = Math.floor(rnd() * 60);
    const type = rnd() < 0.66 ? '麦乐送' : rnd() < 0.5 ? '堂食' : '得来速';
    const count = 1 + Math.floor(rnd() * 3);
    const items = [];
    for (let i = 0; i < count; i++) { const [name, price] = menu[Math.floor(rnd() * menu.length)]; items.push({ name, qty: rnd() < 0.2 ? 2 : 1, price }); }
    const sum = items.reduce((a, it) => a + it.price * it.qty, 0);
    const discount = rnd() < 0.55 ? Math.round(sum * (0.1 + rnd() * 0.25)) : 0;
    orders.push({
      id: `DEMO${String(orders.length + 1).padStart(4, '0')}`,
      time: `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}-${pad2(day.getUTCDate())} ${pad2(h)}:${pad2(mi)}:00`,
      type, amount: sum - discount, discount, store: '示例餐厅', items,
    });
  }
  return { orders };
}

// ───────────────────────────── 主流程 ─────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || process.argv.length <= 2) {
    console.log('用法：node wrapped.mjs --input orders.json --out ./output [--png] [--name 昵称] [--repo 仓库名] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--amount-unit cents]\n      node wrapped.mjs --demo --out ./output --png\n      node wrapped.mjs --atlas --out ./output --png    # 16 型图鉴\n      node wrapped.mjs --dump-demo examples/demo-orders.json');
    return;
  }
  if (args.atlas) {
    const out = resolve(String(args.out && args.out !== true ? args.out : './output'));
    mkdirSync(out, { recursive: true });
    const at = buildAtlas({ repo: args.repo && args.repo !== true ? String(args.repo) : REPO });
    writeFileSync(join(out, 'atlas.svg'), at.svg);
    console.log('已生成 16 型图鉴：' + join(out, 'atlas.svg'));
    if (args.png) {
      const b = findBrowser();
      if (!b) { console.log('未找到浏览器，跳过 PNG'); return; }
      const prof = mkdtempSync(join(tmpdir(), 'mcd-atlas-'));
      shot(b, prof, pathToFileURL(join(out, 'atlas.svg')).href, join(out, 'atlas.png'), at.width, at.height);
      try { rmSync(prof, { recursive: true, force: true }); } catch {}
      console.log('已导出 PNG：' + join(out, 'atlas.png'));
    }
    return;
  }
  if (args['dump-demo']) {
    const p = resolve(String(args['dump-demo']));
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(demoOrders(), null, 2) + '\n');
    console.log(`已写入演示数据：${p}`);
    return;
  }
  let raw;
  if (args.demo) raw = demoOrders();
  else if (args.input) {
    const text = readFileSync(resolve(String(args.input)), 'utf8').replace(/^\uFEFF/, '');
    try { raw = JSON.parse(text); } catch (e) { console.error(`输入文件不是合法 JSON：${e.message}`); process.exit(2); }
  } else { console.error('请指定 --input <orders.json> 或 --demo'); process.exit(2); }

  const { orders: all, meta } = normalizeOrders(raw, { amountUnit: args['amount-unit'] });
  const since = args.since ? parseTime(String(args.since)) : null;
  const until = args.until ? parseTime(String(args.until)) : null;
  const orders = all.filter((o) => (!since || o.t.dayNum >= since.dayNum) && (!until || o.t.dayNum <= until.dayNum));
  if (!orders.length) {
    console.error(`没有解析到有效订单（识别到 ${meta.found} 条，取消/失效 ${meta.skippedCancelled} 条，缺少时间 ${meta.skippedNoTime} 条）。\n请参考 references/input-schema.md 把订单整理为标准格式后重试。`);
    process.exit(3);
  }
  const st = computeStats(orders);
  const persona = derivePersona(st);
  const insights = buildInsights(st);
  const opts = { name: args.name && args.name !== true ? String(args.name) : '', repo: args.repo && args.repo !== true ? String(args.repo) : REPO };
  const deck = buildDeck({ st, persona, orders, opts });

  const outDir = resolve(String(args.out && args.out !== true ? args.out : './output'));
  const pagesDir = join(outDir, 'pages');
  mkdirSync(pagesDir, { recursive: true });
  for (const p of deck) writeFileSync(join(pagesDir, `${String(p.id).padStart(2, '0')}-${p.title}.svg`), p.svg);
  writeFileSync(join(outDir, 'card.svg'), deck[deck.length - 1].svg); // 最适合直接分享的一页
  writeFileSync(join(outDir, 'report.html'), renderViewer(deck, { persona, repo: opts.repo }));
  writeFileSync(join(outDir, 'long.html'), renderLong(deck));
  writeFileSync(join(outDir, 'summary.md'), renderMarkdown(st, persona, insights));
  const { topItems, categories, ...rest } = st;
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ persona: { code: persona.code, title: persona.title, tagline: persona.tagline, axes: persona.axes.map((a) => ({ axis: a.axis.id, pick: a.pick.name, strength: +a.strength.toFixed(3), note: a.note })) }, insights, stats: { ...rest, topItems, categories } }, null, 2));

  console.log(`人格：${persona.code}「${persona.title}」`);
  console.log(`订单 ${st.n} 单（跳过取消 ${meta.skippedCancelled}、缺时间 ${meta.skippedNoTime}），周期 ${st.period.from} – ${st.period.to}`);
  console.log(`输出目录：${outDir}\n  report.html（翻页报告）  long.html（长图页）  card.svg（分享页）  pages/*.svg（7 页）  summary.md  summary.json`);
  if (args.png) {
    const r = exportPngs(outDir, deck.length);
    if (r.ok) console.log(`已导出 PNG：${r.files.length} 张（pages/*.png）+ long.png，使用 ${r.browser}`);
    else console.log(`未导出 PNG：${r.reason}。可用浏览器打开 long.html 截图。`);
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
