/** 16 型麦味人格图鉴（一张图集齐全部角色，方便传播与对照）。 */
import { C, T, svgOpen, fitText, star4, sunburst } from './svgkit.mjs';
import { character } from './icons.mjs';
import { PERSONAS } from './personas.mjs';
import { REPO, NAME_ZH } from './brand.mjs';

const KINDS = ['burger', 'fries', 'cola', 'coffee', 'sundae', 'drumstick', 'muffin', 'bag'];

export function buildAtlas({ repo = REPO } = {}) {
  const W = 1760, cw = 400, ch = 470, gap = 24, top = 300;
  const rows = 4, H = top + rows * (ch + gap) + 110;
  const codes = Object.keys(PERSONAS);
  const o = [svgOpen(W, H, '', '16 型麦味人格图鉴'), `<rect width="${W}" height="${H}" fill="${C.cream}"/>`];
  o.push(`<rect width="${W}" height="250" fill="${C.red}"/>`, sunburst(W / 2, 125, 24, 2200, '#fff', 0.07));
  o.push(T(W / 2, 128, `16 型${NAME_ZH}图鉴`, { size: 96, weight: 900, fill: '#fff', anchor: 'middle' }));
  // 图例直接用用户看到的字母：D/N 时段 · H/S 场景 · L/X 口味 · B/F 价格
  o.push(T(W / 2, 196, 'D 日间 / N 夜间  ·  H 外送 / S 到店  ·  L 专一 / X 尝鲜  ·  B 精打细算 / F 随心', { size: 32, fill: C.yellow, anchor: 'middle', weight: 700 }));
  o.push(star4(120, 90, 1.8, C.yellow), star4(W - 130, 170, 1.4, '#fff'));
  codes.forEach((code, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = gap + col * (cw + gap), y = top + row * (ch + gap);
    const [title, sub] = PERSONAS[code];
    o.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="36" fill="#fff" stroke="${C.creamDark}" stroke-width="4"/>`);
    o.push(character(code, KINDS[i % KINDS.length], { x: x + cw / 2, y: y + 190, s: 0.74 }));
    o.push(T(x + cw / 2, y + 380, code, { size: 56, weight: 900, fill: C.red, anchor: 'middle', spacing: 8 }));
    o.push(T(x + cw / 2, y + 424, fitText(title, cw - 40, 34), { size: 34, weight: 800, anchor: 'middle' }));
    o.push(T(x + cw / 2, y + 454, sub, { size: 20, fill: '#9a9a9a', anchor: 'middle', mono: true }));
  });
  o.push(T(W / 2, H - 52, `${repo} · 角色为原创矢量绘制 · 仅供娱乐 · 非麦当劳官方`, { size: 24, fill: '#9a9a9a', anchor: 'middle' }));
  o.push('</svg>');
  return { svg: o.join(''), width: W, height: H };
}
