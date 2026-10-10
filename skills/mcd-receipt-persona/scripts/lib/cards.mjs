/**
 * 7 页 9:16 故事卡片（1080×1920），混合场景载体：
 * 封面小票 → 账单小票 → 餐盘本命 → 薯条盒干饭时钟 → 终端彩蛋 → 取餐叫号屏揭晓 → 分享页
 */
import { C, T, MONO, pad2, pct, money, fitText, wrapText, textW, barcode, dotText, GLOW, SOFT, star4, svgOpen, pager, sunburst } from './svgkit.mjs';
import { NAME_ZH } from './brand.mjs';
import { character, food, foodKindFor, faceForCode, faceSvg } from './icons.mjs';

const W = 1080, H = 1920;
const SLOT_RANGE = { 早餐: '05:00–10:29', 午餐: '10:30–13:59', 下午茶: '14:00–16:59', 晚餐: '17:00–20:59', 夜宵: '21:00–04:59' };
const SLOT_ORDER = ['早餐', '午餐', '下午茶', '晚餐', '夜宵'];

const fnv = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const hex7 = (s) => fnv(s).toString(16).padStart(8, '0').slice(0, 7);
const dashed = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#c9c1ab" stroke-width="3" stroke-dasharray="10 8"/>`;
const periodDots = (st) => (st.period.from ? `${st.period.from.replace(/-/g, '.')} – ${st.period.to.replace(/-/g, '.')}` : '');
const periodShort = (st) => (st.period.from ? `${st.period.from.slice(5).replace('-', '.')}–${st.period.to.slice(5).replace('-', '.')}` : '');

function receiptPath(x, y, w, h, tooth = 20) {
  const n = Math.floor(w / tooth), tw = w / n;
  let d = `M${x} ${y} H${x + w} V${y + h}`;
  for (let i = 0; i < n; i++) { const px = x + w - i * tw; d += ` L${px - tw / 2} ${y + h + tooth * 0.85} L${px - tw} ${y + h}`; }
  return `${d} Z`;
}
const row = (x1, x2, y, l, r, o = {}) => {
  const { size = 32, weight = 400, fl = C.ink, fr = C.ink, mono = false, wr = weight } = o;
  return T(x1, y, l, { size, weight, fill: fl, mono }) + T(x2, y, r, { size, weight: wr, fill: fr, anchor: 'end', mono: true });
};

function gradDef(id, c1, c2) { return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`; }

/* ═══════════ P1 封面：小票机吐出神秘小票 ═══════════ */
function pCover(x) {
  const { st, persona, opts, mainKind } = x;
  const no = String(fnv(persona.code + periodDots(st)) % 10000).padStart(4, '0');
  const defs = gradDef('bg', '#FFC72C', '#FFAA00') + SOFT + `<filter id="sil"><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .07  0 0 0 1 0"/></filter>`;
  const o = [svgOpen(W, H, defs, '封面：您的点餐小票已出炉'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`, sunburst(540, 800, 22, 2000, '#fff', 0.14)];
  o.push(T(540, 232, `我的${NAME_ZH}`, { size: 124, weight: 900, fill: C.red, anchor: 'middle', stroke: '#fff', sw: 16 }));
  o.push(T(540, 306, [opts.name ? `@${opts.name}` : '', periodDots(st)].filter(Boolean).join('   '), { size: 30, fill: C.brown, anchor: 'middle', opacity: 0.85 }));
  // 出票口
  o.push(`<rect x="100" y="372" width="880" height="96" rx="48" fill="#3a1510"/><rect x="100" y="372" width="880" height="30" rx="15" fill="#fff" opacity=".12"/><rect x="146" y="418" width="788" height="22" rx="11" fill="#0f0504"/>`);
  o.push(T(190, 407, 'ORDER PRINTER', { size: 20, fill: '#ffffff', opacity: 0.55, mono: true, spacing: 6 }));
  o.push(`<circle cx="918" cy="394" r="9" fill="#7CFC8A"/>`);
  // 小票
  o.push(`<g filter="url(#soft)"><path d="${receiptPath(170, 430, 740, 1220)}" fill="#FFFDF5"/></g>`);
  o.push(T(540, 524, 'ORDER RECEIPT', { size: 26, fill: '#9a9a9a', anchor: 'middle', mono: true, spacing: 10 }));
  o.push(T(540, 584, `${NAME_ZH} · 点餐报告`, { size: 44, weight: 800, anchor: 'middle' }));
  o.push(T(540, 626, `No.${no}  ${periodShort(st)}`, { size: 24, fill: '#8a8a8a', anchor: 'middle', mono: true }));
  o.push(dashed(220, 860, 668));
  // 剪影
  o.push(`<g filter="url(#sil)" opacity=".92">${character(persona.code, mainKind, { x: 540, y: 930, s: 1.18, stickers: false })}</g>`);
  o.push(T(540, 1040, '?', { size: 230, weight: 900, fill: C.yellow, anchor: 'middle', stroke: C.brown, sw: 14 }));
  o.push(star4(380, 780, 1.4, C.yellow), star4(720, 760, 1.1, C.red), star4(700, 1100, 1.2, C.yellow), star4(360, 1090, 0.9, C.red));
  o.push(T(540, 1196, '神秘人格已出炉', { size: 50, weight: 800, anchor: 'middle' }));
  o.push(T(540, 1244, '上滑，领取你的专属人格 ↑', { size: 28, fill: '#7d7d7d', anchor: 'middle' }));
  o.push(dashed(220, 860, 1286));
  o.push(row(230, 850, 1346, '订单数', `${st.n} 单`, { size: 30 }));
  o.push(row(230, 850, 1398, '统计周期', periodShort(st), { size: 30 }));
  if (st.hasAmount) o.push(row(230, 850, 1450, '累计消费', money(st.spent), { size: 30 }));
  o.push(row(230, 850, 1502, st.hasDiscountData ? '优惠已省' : '光顾餐厅', st.hasDiscountData ? money(st.saved) : `${st.storeCount || '—'} 家`, { size: 30, fr: C.red }));
  o.push(barcode(persona.code + no, 260, 1552, 560, 62));
  o.push(T(540, 1650, `*${persona.code.split('').join(' ')}-${no}*`, { size: 20, fill: '#9a9a9a', anchor: 'middle', mono: true }));
  // 装饰
  o.push(food('cola', { x: 100, y: 1180, s: 0.62, rotate: -12 }), food('burger', { x: 990, y: 1290, s: 0.6, rotate: 10 }), food('fries', { x: 96, y: 1500, s: 0.56, rotate: 8 }));
  o.push(pager(0, 7, { repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P2 账单小票 ═══════════ */
function pBill(x) {
  const { st, persona, opts } = x;
  const defs = gradDef('bg', '#E3342A', '#B01E12') + SOFT;
  const o = [svgOpen(W, H, defs, '账单小票'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`, sunburst(540, 900, 20, 2000, '#fff', 0.06)];
  o.push(T(540, 190, '这一期，你的账单', { size: 88, weight: 900, fill: '#fff', anchor: 'middle' }));
  o.push(T(540, 250, 'ORDER SUMMARY', { size: 28, fill: C.yellow, anchor: 'middle', mono: true, spacing: 10 }));
  o.push(`<g filter="url(#soft)"><path d="${receiptPath(120, 300, 840, 1360)}" fill="#FFFDF5"/></g>`);
  o.push(T(170, 392, '品名 ITEM', { size: 24, fill: '#8a8a8a', mono: true, spacing: 3 }), T(910, 392, '出现 ORDERS', { size: 24, fill: '#8a8a8a', anchor: 'end', mono: true, spacing: 3 }));
  o.push(dashed(170, 910, 418));
  let y = 478;
  const items = st.topItems.slice(0, 7);
  items.forEach((it, i) => {
    o.push(T(170, y, String(i + 1).padStart(2, '0'), { size: 30, fill: C.red, weight: 800, mono: true }));
    o.push(T(236, y, fitText(it.name, 520, 34), { size: 34, weight: 600 }));
    const right = it.qty > it.orders ? `${it.orders} 单 · ${it.qty} 份` : `${it.orders} 单`;
    o.push(T(910, y, right, { size: 28, anchor: 'end', mono: true, fill: C.ink }));
    y += 64;
  });
  if (st.distinctItems > items.length) { o.push(T(236, y, `…… 另有 ${st.distinctItems - items.length} 种餐品`, { size: 26, fill: '#9a9a9a' })); y += 56; }
  const stampY = Math.max(y - 52, 900);
  y += 6; o.push(dashed(170, 910, y)); y += 62;
  const lines = [['订单数 TOTAL', `${st.n} 单`, C.ink]];
  if (st.hasAmount) { lines.push(['累计消费', money(st.spent), C.ink], ['单均', money(st.avgAmount), C.ink]); }
  if (st.hasDiscountData) lines.push(['优惠已省', `-${money(st.saved)}`, C.red], ['用券订单', `${st.couponOrders} 单`, C.ink]);
  if (st.storeCount) lines.push(['光顾餐厅', `${st.storeCount} 家`, C.ink]);
  lines.forEach(([l, r, f], i) => { o.push(row(170, 910, y, l, r, { size: i === 0 ? 40 : 32, weight: i === 0 ? 800 : 400, fr: f })); y += i === 0 ? 70 : 58; });
  y += 4; o.push(dashed(170, 910, y)); y += 46;
  o.push(barcode('bill' + persona.code + st.n, 230, y, 620, 70));
  o.push(T(540, y + 118, '谢谢惠顾 · 欢迎下次再来', { size: 30, fill: '#7d7d7d', anchor: 'middle' }));
  // 印章
  o.push(`<g transform="translate(730 ${stampY + 4}) rotate(-12) scale(.62)" opacity=".92"><rect x="-150" y="-62" width="300" height="124" rx="22" fill="none" stroke="${C.red}" stroke-width="8"/>${T(0, 28, 'PAID', { size: 84, weight: 900, fill: C.red, anchor: 'middle', spacing: 8, mono: true })}</g>`);
  o.push(food('burger', { x: 950, y: 250, s: 0.5, rotate: 14 }), food('fries', { x: 130, y: 250, s: 0.48, rotate: -12 }));
  o.push(pager(1, 7, { dark: true, repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P3 餐盘：本命餐品 ═══════════ */
function pTray(x) {
  const { st, persona, opts } = x;
  const defs = gradDef('bg', '#FFF8E7', '#FFE9B8') + SOFT;
  const o = [svgOpen(W, H, defs, '餐盘：本命餐品'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  const hasFav = st.topItemOrders >= 2;
  o.push(T(540, 190, '你的本命餐品', { size: 92, weight: 900, fill: C.red, anchor: 'middle', stroke: '#fff', sw: 14 }));
  const sub = hasFav ? `「${fitText(st.topItem, 560, 40)}」出现在 ${pct(st.topItemShare)} 的订单里` : `${st.distinctItems} 种餐品几乎没有重复，你没有本命`;
  o.push(T(540, 256, sub, { size: 38, weight: 700, fill: C.brown, anchor: 'middle' }));
  // 托盘
  o.push(`<g filter="url(#soft)"><rect x="70" y="330" width="940" height="1130" rx="70" fill="${C.redDark}"/></g><rect x="100" y="360" width="880" height="1070" rx="50" fill="${C.red}"/><rect x="100" y="360" width="880" height="1070" rx="50" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="6"/>`);
  o.push(`<rect x="132" y="392" width="816" height="1006" rx="30" fill="#FFFDF5"/>`);
  // 垫纸花边
  const tri = []; for (let i = 0; i < 18; i++) tri.push(`<polygon points="${150 + i * 44},408 ${172 + i * 44},408 ${161 + i * 44},430" fill="${i % 2 ? C.yellow : C.red}"/>`);
  o.push(tri.join(''));
  const picks = st.topItems.slice(0, 4).map((it) => ({ ...it, kind: foodKindFor(it.category, it.name) }));
  const main = picks[0] ?? { name: '—', kind: 'bag', orders: 0 };
  o.push(food(main.kind, { x: 540, y: 690, s: 1.62, face: faceForCode(persona.code) }));
  const tag = (cx, cy, w, name, sub2, big = false) => {
    const h = big ? 84 : 76;
    return `<rect x="${cx - w / 2}" y="${cy}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" stroke="${C.brown}" stroke-width="5"/>`
      + T(cx, cy + (big ? 38 : 34), fitText(name, w - 40, big ? 34 : 26), { size: big ? 34 : 26, weight: 800, anchor: 'middle' })
      + T(cx, cy + (big ? 70 : 62), sub2, { size: big ? 24 : 22, fill: C.red, anchor: 'middle', weight: 700 });
  };
  o.push(tag(540, 936, 620, main.name, `NO.1 · 出现 ${main.orders} 单`, true));
  const sides = picks.slice(1);
  const xs = sides.length === 1 ? [540] : sides.length === 2 ? [360, 720] : [300, 540, 780];
  sides.forEach((it, i) => {
    const cx = xs[i];
    o.push(food(it.kind, { x: cx, y: 1176, s: 0.66, rotate: (i - 1) * 6 }));
    o.push(tag(cx, 1272, 232, it.name, `NO.${i + 2} · ${it.orders} 单`));
  });
  // 品类胶囊
  o.push(T(540, 1534, 'CATEGORY MIX · 品类占比', { size: 24, fill: C.brown, anchor: 'middle', mono: true, spacing: 6, opacity: 0.7 }));
  const cats = st.categories.slice(0, 4);
  const widths = cats.map((c) => textW(`${c.name} ${pct(c.share)}`, 32) + 56);
  const total = widths.reduce((a, b) => a + b, 0) + (cats.length - 1) * 16;
  let cx0 = 540 - total / 2;
  cats.forEach((c, i) => {
    o.push(`<rect x="${cx0}" y="1564" width="${widths[i]}" height="64" rx="32" fill="${i === 0 ? C.red : C.yellow}"/>`);
    o.push(T(cx0 + widths[i] / 2, 1607, `${c.name} ${pct(c.share)}`, { size: 32, weight: 800, anchor: 'middle', fill: i === 0 ? '#fff' : C.brown }));
    cx0 += widths[i] + 16;
  });
  o.push(star4(120, 300, 1.4, C.yellow), star4(960, 330, 1.1, C.red), star4(90, 1500, 1, C.red));
  o.push(pager(2, 7, { repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P4 薯条盒：干饭时钟 ═══════════ */
function pClock(x) {
  const { st, persona, opts } = x;
  const defs = gradDef('bg', '#FFC72C', '#FFAA00') + SOFT;
  const o = [svgOpen(W, H, defs, '薯条盒：干饭时钟'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`, sunburst(540, 1000, 22, 2200, '#fff', 0.14)];
  o.push(T(540, 190, '你的干饭时钟', { size: 92, weight: 900, fill: C.red, anchor: 'middle', stroke: '#fff', sw: 14 }));
  // 主场：并列时如实写"并列第一"，不再悄悄只挑第一个
  const tops = st.topSlots ?? [];
  const lead = tops.length === 1 ? `${tops[0]}是你的主场 · ${st.topSlotCount} 单`
    : tops.length >= 4 ? `全天候选手 · 每个时段都差不多`
      : tops.length > 1 ? `${tops.join(' · ')} 并列第一 · 各 ${st.topSlotCount} 单` : '';
  if (lead) o.push(T(540, 258, fitText(lead, 900, 42), { size: 42, weight: 800, fill: C.brown, anchor: 'middle' }));
  o.push(T(540, 306, `最早 ${st.earliest}  ·  最晚 ${st.latest}`, { size: 28, fill: C.brown, anchor: 'middle', mono: true, opacity: 0.75 }));
  const counts = SLOT_ORDER.map((k) => st.slotCount[k] ?? 0);
  const max = Math.max(1, ...counts);
  const base = 1020, xs = [260, 400, 540, 680, 820];
  // 薯条
  xs.forEach((cx, i) => {
    const zero = counts[i] === 0;
    const h = zero ? 30 : 70 + 560 * (counts[i] / max); // 0 单只露出一小截浅色薯条头，不再出现"悬空短横线"
    const top = counts[i] === max && max > 0;
    const rot = [-3, 2, -1, 3, -2][i];
    const fill = zero ? '#FFE7A3' : top ? '#FFD84D' : C.yellow;
    const stroke = zero ? '#F0CC70' : '#E8A800';
    o.push(`<g transform="rotate(${rot} ${cx} ${base})"><rect x="${cx - 48}" y="${base - h}" width="96" height="${h + 14}" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="5"/>${zero ? '' : `<rect x="${cx - 32}" y="${base - h + 14}" width="14" height="${Math.max(10, h - 30)}" rx="7" fill="#fff" opacity=".45"/>`}</g>`);
    o.push(T(cx, base - h - 22, zero ? '0' : `${counts[i]} 单`, { size: 34, weight: 800, anchor: 'middle', fill: top ? C.red : C.brown, rotate: rot, opacity: zero ? 0.4 : 1 }));
    if (top) o.push(star4(cx + 62, base - h - 40, 1.2, C.red));
  });
  // 盒子
  o.push(`<g filter="url(#soft)"><path d="M150 ${base - 10} H930 L866 1580 H214 Z" fill="${C.red}"/></g><path d="M150 ${base - 10} H930 L926 ${base + 34} H154 Z" fill="${C.redDark}"/><path d="M214 1580 L150 ${base - 10} L172 ${base - 10} L240 1580 Z" fill="#fff" opacity=".12"/>`);
  SLOT_ORDER.forEach((k, i) => {
    const hot = counts[i] === max && max > 0;
    o.push(T(xs[i], 1160, k, { size: 40, weight: 900, anchor: 'middle', fill: hot ? C.yellow : '#fff' }));
    o.push(T(xs[i], 1200, SLOT_RANGE[k].replace('–', '-'), { size: 17, anchor: 'middle', fill: '#fff', opacity: 0.7, mono: true }));
  });
  o.push(`<g transform="translate(540 1330) scale(1.9)">${faceSvg(faceForCode(persona.code))}</g>`);
  o.push(`<g transform="translate(540 1530)">${T(0, 14, 'FRIES · O\u2019CLOCK', { size: 22, fill: '#fff', anchor: 'middle', mono: true, spacing: 10, opacity: 0.6 })}</g>`);
  // 24h
  o.push(`<rect x="90" y="1630" width="900" height="168" rx="34" fill="#fff" opacity=".92"/>`);
  o.push(T(130, 1676, '24H 下单分布', { size: 24, fill: C.brown, mono: true, spacing: 4 }));
  const hm = Math.max(1, ...st.hourHist);
  st.hourHist.forEach((c, h) => {
    const bh = c ? 12 + 56 * (c / hm) : 6;
    o.push(`<rect x="${128 + h * 35}" y="${1778 - bh}" width="24" height="${bh}" rx="8" fill="${c === hm && c ? C.red : c ? C.brown : '#e7dec8'}"/>`);
    if (h % 6 === 0) o.push(T(140 + h * 35, 1793, pad2(h), { size: 15, fill: '#8a8a8a', anchor: 'middle', mono: true }));
  });
  o.push(food('cola', { x: 960, y: 420, s: 0.5, rotate: 12 }), food('burger', { x: 120, y: 440, s: 0.46, rotate: -10 }));
  o.push(pager(3, 7, { repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P5 终端：程序员彩蛋 ═══════════ */
function pTerminal(x) {
  const { st, persona, orders, opts } = x;
  const defs = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1d24"/><stop offset="1" stop-color="#0d0e12"/></linearGradient>${SOFT}`;
  const o = [svgOpen(W, H, defs, '终端彩蛋'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  o.push(T(540, 112, '给程序员的彩蛋', { size: 70, weight: 900, fill: C.yellow, anchor: 'middle' }));
  o.push(T(540, 162, fitText(`$ man ${opts.repo}`, 900, 26, true), { size: 26, fill: '#7CFC8A', anchor: 'middle', mono: true }));
  o.push(`<g filter="url(#soft)"><rect x="60" y="200" width="960" height="1560" rx="30" fill="#0f1115" stroke="#2c2f38" stroke-width="3"/></g><path d="M60 230 Q60 200 90 200 H990 Q1020 200 1020 230 V268 H60 Z" fill="#23262d"/>`);
  o.push(`<circle cx="102" cy="234" r="11" fill="#ff5f56"/><circle cx="138" cy="234" r="11" fill="#ffbd2e"/><circle cx="174" cy="234" r="11" fill="#27c93f"/>`);
  o.push(T(540, 243, fitText(`~/${opts.repo} — zsh — 80×24`, 700, 22, true), { size: 22, fill: '#8b8f9a', anchor: 'middle', mono: true }));

  const FS = 29, LH = 54, maxW = 880;
  let y = 340;
  const put = (segs) => {
    let cx = 100;
    for (const [txt, fill] of segs) {
      const t = fitText(txt, Math.max(0, 100 + maxW - cx), FS, true);
      o.push(T(cx, y, t, { size: FS, fill, mono: true }));
      cx += textW(t, FS, true);
      if (t !== txt) break;
    }
    y += LH;
  };
  const G = '#7CFC8A', W2 = '#e6e6e6', CY = '#8be9fd', YL = '#ffd866', BL = '#82aaff', GR = '#6b7080', PK = '#ff79c6';
  put([['$ ', G], ['whoami', W2]]);
  put([['> ', GR], [persona.code, PK], [`  # ${persona.title}`, GR]]);
  y += 14;
  const k = Math.min(6, orders.length);
  put([['$ ', G], [`git log --oneline -n ${k}`, W2]]);
  [...orders].slice(-k).reverse().forEach((od) => {
    const names = [...new Set(od.items.map((i) => i.name))].slice(0, 2).join('+') || 'order';
    const t = od.t;
    put([[hex7(t.dateKey + t.minutes + names) + ' ', YL], [`${pad2(t.m)}-${pad2(t.d)} ${pad2(t.h)}:${pad2(t.mi)} `, GR], [names, CY]]);
  });
  y += 14;
  put([['$ ', G], ['./stats --summary', W2]]);
  put([[`orders=${st.n} `, CY], [st.hasAmount ? `spent=${money(st.spent)} ` : '', CY], [st.hasDiscountData ? `saved=${money(st.saved)}` : '', G]]);
  put([[`top="${st.topItem}" `, CY], [`streak=${st.bestStreak}d`, CY]]);
  y += 14;
  put([['$ ', G], ['tail -n 3 warnings.log', W2]]);
  const night = [...st.hourHist.slice(21), ...st.hourHist.slice(0, 5)].reduce((a, b) => a + b, 0);
  const logs = [];
  if (st.n && night / st.n >= 0.2) logs.push([['WARN ', YL], [`${pct(night / st.n)} 的订单在 21:00 后提交`, W2]]);
  if (st.topItemOrders >= 2) logs.push([['INFO ', BL], [`"${st.topItem}" 命中率 ${pct(st.topItemShare)}`, W2]]);
  else logs.push([['INFO ', BL], [`${st.distinctItems} 种餐品，缓存命中率 ≈ 0`, W2]]);
  if (st.hasDiscountData) logs.push(st.couponOrders ? [['INFO ', BL], [`优惠已应用 ${st.couponOrders}/${st.n} 单`, W2]] : [['WARN ', YL], ['一张券都没用上', W2]]);
  if (st.bestStreak >= 2) logs.push([['INFO ', BL], [`最长连续下单 ${st.bestStreak} 天`, W2]]);
  logs.slice(0, 3).forEach((l) => put(l));
  y += 14;
  put([['$ ', G], [`echo "${persona.sub ?? persona.code}"`, W2]]);
  put([['> ', GR], [persona.sub ?? persona.code, PK]]);
  y += 8;
  o.push(T(100, y, '$ ', { size: FS, fill: G, mono: true }), `<rect x="136" y="${y - 26}" width="18" height="34" fill="${G}"/>`);
  o.push(food('fries', { x: 920, y: 1560, s: 0.55, rotate: 8 }), food('burger', { x: 160, y: 1600, s: 0.5, rotate: -8 }));
  o.push(pager(4, 7, { dark: true, repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P6 取餐叫号屏：人格揭晓 ═══════════ */
function pReveal(x) {
  const { st, persona, opts, mainKind } = x;
  const defs = gradDef('bg', '#2a120c', '#150806') + GLOW + `<radialGradient id="spot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFC72C" stop-opacity=".55"/><stop offset="1" stop-color="#FFC72C" stop-opacity="0"/></radialGradient>`;
  const o = [svgOpen(W, H, defs, `人格揭晓：${persona.code} ${persona.title}`), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`];
  // 叫号屏
  o.push(`<rect x="80" y="110" width="920" height="440" rx="40" fill="#0b0504" stroke="#6a3220" stroke-width="10"/><path d="M80 150 Q80 110 120 110 H960 Q1000 110 1000 150 V196 H80 Z" fill="${C.red}"/>`);
  o.push(T(130, 168, 'NOW SERVING', { size: 34, weight: 800, fill: '#fff', mono: true, spacing: 6 }), T(950, 168, '取餐号', { size: 34, weight: 800, fill: C.yellow, anchor: 'end' }));
  const dt = dotText(persona.code, { x: 540, y: 262, pitch: 29, r: 10.5, anchor: 'middle' });
  o.push(dt.dim, `<g filter="url(#glow)">${dt.lit}</g>`);
  o.push(T(540, 512, '请到柜台领取你的人格', { size: 32, weight: 700, fill: C.yellow, anchor: 'middle', spacing: 4 }));
  // 聚光 + 角色
  o.push(`<circle cx="540" cy="900" r="420" fill="url(#spot)"/>`);
  o.push(sunburst(540, 900, 24, 1200, C.yellow, 0.07));
  o.push(character(persona.code, mainKind, { x: 540, y: 880, s: 1.42 }));
  o.push(star4(150, 700, 1.6, C.yellow), star4(930, 640, 1.3, '#fff'), star4(200, 1080, 1.1, '#fff'), star4(900, 1100, 1.5, C.yellow));
  // 标题
  o.push(T(540, 1236, `「${persona.title}」`, { size: Math.min(100, Math.floor(880 / (persona.title.length + 2))), weight: 900, fill: '#fff', anchor: 'middle' }));
  o.push(T(540, 1292, persona.sub ?? '', { size: 36, fill: C.yellow, anchor: 'middle', mono: true, spacing: 4 }));
  wrapText(persona.tagline.replace(/^[^：]*：/, ''), 860, 30).slice(0, 2).forEach((l, i) => o.push(T(540, 1352 + i * 44, l, { size: 30, fill: '#fff', anchor: 'middle', opacity: 0.85 })));
  // 四维
  persona.axes.forEach((a, i) => {
    const yy = 1494 + i * 76;
    o.push(T(100, yy + 10, a.pick.name, { size: 34, weight: 800, fill: '#fff' }));
    o.push(`<rect x="370" y="${yy - 14}" width="450" height="26" rx="13" fill="#3b1c12"/><rect x="370" y="${yy - 14}" width="${Math.max(26, 450 * Math.min(1, a.strength))}" height="26" rx="13" fill="${C.yellow}"/>`);
    o.push(T(980, yy + 10, pct(a.strength), { size: 34, weight: 800, fill: C.yellow, anchor: 'end', mono: true }));
  });
  if (persona.lowSample) o.push(T(540, 1806, '* 样本较少（不足 5 单），结果仅供参考', { size: 22, fill: '#fff', anchor: 'middle', opacity: 0.6 }));
  o.push(pager(5, 7, { dark: true, repo: opts.repo }), '</svg>');
  return o.join('');
}

/* ═══════════ P7 分享页 ═══════════ */
function pShare(x) {
  const { st, persona, opts, mainKind } = x;
  const defs = gradDef('bg', '#E3342A', '#A81A10') + SOFT;
  const o = [svgOpen(W, H, defs, '分享页'), `<rect width="${W}" height="${H}" fill="url(#bg)"/>`, sunburst(540, 700, 22, 2200, '#fff', 0.07)];
  o.push(`<g filter="url(#soft)"><rect x="90" y="150" width="900" height="1560" rx="60" fill="#FFFDF5"/></g>`);
  o.push(`<rect x="370" y="118" width="340" height="64" rx="32" fill="${C.yellow}"/>`, T(540, 162, '1024 程序员节', { size: 32, weight: 900, anchor: 'middle', fill: C.brown }));
  o.push(T(540, 262, `我的${NAME_ZH}`, { size: 40, fill: '#8a8a8a', anchor: 'middle', weight: 700 }));
  o.push(character(persona.code, mainKind, { x: 540, y: 470, s: 0.96 }));
  o.push(T(540, 806, persona.code, { size: 156, weight: 900, fill: C.red, anchor: 'middle', spacing: 22 }));
  o.push(T(540, 892, `「${persona.title}」`, { size: Math.min(76, Math.floor(820 / (persona.title.length + 2))), weight: 900, anchor: 'middle' }));
  wrapText(persona.tagline.replace(/^[^：]*：/, ''), 800, 28).slice(0, 2).forEach((l, i) => o.push(T(540, 952 + i * 42, l, { size: 28, fill: '#7d7d7d', anchor: 'middle' })));
  persona.axes.forEach((a, i) => {
    const cx = 100 + (i % 2) * 440 + 20, cy = 1040 + Math.floor(i / 2) * 100;
    o.push(`<rect x="${cx}" y="${cy}" width="400" height="76" rx="38" fill="${C.cream}" stroke="${C.creamDark}" stroke-width="3"/>`);
    o.push(T(cx + 32, cy + 50, a.pick.name, { size: 32, weight: 800 }), T(cx + 368, cy + 50, pct(a.strength), { size: 32, weight: 800, fill: C.red, anchor: 'end', mono: true }));
  });
  o.push(dashed(150, 930, 1270));
  o.push(T(540, 1340, '@ 一个和你同型的同事，晒图 PK 一下', { size: 36, weight: 800, anchor: 'middle' }));
  o.push(T(540, 1396, `#${NAME_ZH}  #1024程序员节`, { size: 30, fill: C.red, anchor: 'middle', mono: true, weight: 700 }));
  o.push(T(540, 1470, `基于最近 ${st.n} 单 · ${periodDots(st)}`, { size: 26, fill: '#8a8a8a', anchor: 'middle' }));
  o.push(T(540, 1510, '官方接口仅提供最近 10 单，多运行几次，样本会越积越多', { size: 22, fill: '#aaa', anchor: 'middle' }));
  o.push(barcode('share' + persona.code, 260, 1560, 560, 70));
  o.push(T(540, 1668, `*${persona.code}*`, { size: 20, fill: '#9a9a9a', anchor: 'middle', mono: true }));
  o.push(food('fries', { x: 90, y: 300, s: 0.5, rotate: -14 }), food('cola', { x: 990, y: 320, s: 0.48, rotate: 14 }));
  o.push(pager(6, 7, { dark: true, repo: opts.repo }), '</svg>');
  return o.join('');
}

export const PAGE_TITLES = ['封面', '账单', '本命餐品', '干饭时钟', '程序员彩蛋', '人格揭晓', '分享'];

/**
 * 给一页 SVG 里所有 id 加上页面前缀，并同步改写 url(#id) / href="#id" 引用。
 * 为什么需要：long.html、report.html 会把 7 页 SVG 内联进同一个 HTML 文档，id 是文档级唯一的。
 * 每页都有名为 bg / soft 的渐变和滤镜，不加前缀时后面的页面会错用第一页的黄色背景。
 */
export function scopeIds(svg, prefix) {
  const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  let out = svg;
  for (const id of ids) {
    const e = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`\\bid="${e}"`, 'g'), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(#${e}\\)`, 'g'), `url(#${prefix}${id})`)
      .replace(new RegExp(`href="#${e}"`, 'g'), `href="#${prefix}${id}"`);
  }
  return out;
}

export function buildDeck({ st, persona, orders, opts = {} }) {
  const first = st.topItems[0];
  const mainKind = first ? foodKindFor(first.category, first.name) : 'bag';
  const x = { st, persona, orders, opts, mainKind };
  return [pCover, pBill, pTray, pClock, pTerminal, pReveal, pShare]
    .map((fn, i) => ({ id: i + 1, title: PAGE_TITLES[i], svg: scopeIds(fn(x), `p${i + 1}-`) }));
}
