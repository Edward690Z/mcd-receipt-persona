/**
 * SVG 基础工具：配色、文本测量、点阵 LED 字体、条形码等。
 * 全部为原创绘制，不使用任何品牌标志或外部资源。
 */
import { REPO } from './brand.mjs';

export const C = {
  red: '#DA291C', redDark: '#B01E12', yellow: '#FFC72C', yellowSoft: '#FFD84D', cream: '#FFF8E7', creamDark: '#F1E7CF',
  brown: '#4B2116', ink: '#27251F', green: '#6BBF3A', bun: '#E8A33D', bunDark: '#C98521', patty: '#7A3E1D',
  cheese: '#FFC72C', white: '#FFFFFF', pink: '#FF9AA2', kraft: '#D8A767', kraftDark: '#B98545', grey: '#8A8A8A',
};

export const FONT = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Source Han Sans SC',sans-serif";
export const MONO = "'Cascadia Mono','SF Mono',Consolas,'Courier New','NSimSun','SimSun',monospace";

export const pad2 = (n) => String(n).padStart(2, '0');
export const pct = (x) => `${Math.round(x * 100)}%`;
export const money = (x) => `¥${(Math.round(x * 100) / 100).toFixed(x % 1 === 0 ? 0 : 2)}`;
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const isCJK = (ch) => /[\u2e80-\u9fff\uff00-\uffef]/.test(ch);
export const charW = (ch, size, mono = false) => (isCJK(ch) ? size : size * (mono ? 0.6 : 0.56));
export const textW = (s, size, mono = false) => { let w = 0; for (const ch of String(s)) w += charW(ch, size, mono); return w; };
export function fitText(s, maxPx, size, mono = false) {
  s = String(s);
  if (textW(s, size, mono) <= maxPx) return s;
  let out = '';
  for (const ch of s) { if (textW(out + ch + '…', size, mono) > maxPx) break; out += ch; }
  return out + '…';
}
export function wrapText(s, maxPx, size, mono = false) {
  const lines = []; let cur = '';
  for (const ch of String(s)) { if (textW(cur + ch, size, mono) > maxPx) { lines.push(cur); cur = ch; } else cur += ch; }
  if (cur) lines.push(cur);
  return lines;
}

/** 文本元素。mono 使用等宽字体；rotate 绕自身锚点旋转。 */
export function T(x, y, s, o = {}) {
  const { size = 28, fill = C.ink, weight = 400, anchor = 'start', opacity = 1, spacing = 0, mono = false, rotate = 0, stroke, sw = 0 } = o;
  const tr = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  const st = stroke ? ` stroke="${stroke}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"` : '';
  const ff = mono ? ` font-family="${MONO}"` : '';
  return `<text style="white-space:pre" x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" opacity="${opacity}" letter-spacing="${spacing}"${ff}${tr}${st}>${esc(s)}</text>`;
}

/** 由种子字符串确定性生成的条形码（纯装饰，不编码任何信息）。 */
export function barcode(seed, x, y, w, h, fill = C.ink) {
  let s = 2166136261;
  for (const ch of String(seed)) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619) >>> 0; }
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let cx = x; const out = [];
  while (cx < x + w) {
    const bw = 2 + Math.floor(rnd() * 6), gap = 2 + Math.floor(rnd() * 5);
    if (cx + bw > x + w) break;
    out.push(`<rect x="${cx}" y="${y}" width="${bw}" height="${h}" fill="${fill}"/>`);
    cx += bw + gap;
  }
  return out.join('');
}

/** 5×7 点阵字体（仅包含人格代码与数字所需字符）。 */
const G = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
export function dotText(str, { x, y, pitch = 22, r = 8, on = C.yellow, off = '#4a3410', gap = 1, anchor = 'start' }) {
  const chars = [...String(str).toUpperCase()].map((c) => (G[c] ? c : ' '));
  const cols = chars.length * 5 + (chars.length - 1) * gap;
  const width = (cols - 1) * pitch;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const lit = [], dim = [];
  chars.forEach((c, i) => {
    const gx = x0 + i * (5 + gap) * pitch;
    G[c].forEach((row, ry) => [...row].forEach((v, cx) => {
      const el = `<circle cx="${gx + cx * pitch}" cy="${y + ry * pitch}" r="${r}" fill="${v === '1' ? on : off}"/>`;
      (v === '1' ? lit : dim).push(el);
    }));
  });
  return { dim: dim.join(''), lit: lit.join(''), width };
}

export const GLOW = `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
export const SOFT = `<filter id="soft" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#5b1209" flood-opacity=".32"/></filter>`;

export const star4 = (x, y, s = 1, fill = '#FFF3B0', opacity = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 L3.6 -3.6 L14 0 L3.6 3.6 L0 14 L-3.6 3.6 L-14 0 L-3.6 -3.6 Z" fill="${fill}" opacity="${opacity}"/>`;

export function svgOpen(w, h, defs = '', label = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}" role="img" aria-label="${esc(label)}"><defs>${defs}</defs>`;
}

/** 底部页码点 + 免责声明 */
export function pager(i, n, { dark = false, repo = REPO } = {}) {
  const col = dark ? '#ffffff' : C.brown;
  const out = [];
  const gap = 26, x0 = 540 - ((n - 1) * gap) / 2;
  for (let k = 0; k < n; k++) out.push(`<circle cx="${x0 + k * gap}" cy="1832" r="${k === i ? 8 : 5}" fill="${col}" opacity="${k === i ? 0.95 : 0.35}"/>`);
  out.push(T(540, 1884, `${repo} · 仅供娱乐 · 非麦当劳官方 · 数据仅在本地处理`, { size: 20, fill: col, anchor: 'middle', opacity: 0.7 }));
  return out.join('');
}

/** 阳光放射背景 */
export function sunburst(cx, cy, n = 18, r = 1700, fill = '#fff', opacity = 0.08) {
  const out = [];
  for (let k = 0; k < n; k += 2) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    out.push(`<path d="M${cx} ${cy} L${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z" fill="${fill}" opacity="${opacity}"/>`);
  }
  return out.join('');
}
