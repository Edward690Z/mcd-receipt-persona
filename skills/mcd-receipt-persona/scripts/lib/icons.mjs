/**
 * 原创矢量食物图标 + 人格角色生成器。
 * 所有图形均为基础形状手绘，不含任何品牌标志（不画金拱门）。
 * 每个食物以 (0,0) 为中心，包围盒约 ±130，并给出脸的位置。
 */
import { C, T, star4 } from './svgkit.mjs';

const shadow = (w = 120, y = 122) => `<ellipse cx="0" cy="${y}" rx="${w}" ry="13" fill="#000" opacity=".14"/>`;
const sesame = [[-62, -78, -14], [-18, -98, 8], [34, -86, -8], [70, -52, 22], [-84, -44, -24], [8, -62, 4]]
  .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#FFF3C4" transform="rotate(${r} ${x} ${y})"/>`).join('');

const FOODS = {
  burger: () => ({
    face: { x: 0, y: -52, s: 1 },
    art: `${shadow(128, 112)}
<path d="M-120 58 H120 Q120 104 62 104 H-62 Q-120 104 -120 58 Z" fill="${C.bun}"/>
<path d="M-120 58 H120 Q119 70 112 78 H-112 Q-119 70 -120 58 Z" fill="${C.bunDark}" opacity=".45"/>
<rect x="-126" y="14" width="252" height="40" rx="20" fill="${C.patty}"/>
<path d="M-124 6 H124 L104 38 L62 14 L0 40 L-62 14 L-104 38 Z" fill="${C.cheese}"/>
<path d="M-140 -2 q14 -16 28 0 q14 16 28 0 q14 -16 28 0 q14 16 28 0 q14 -16 28 0 q14 16 28 0 q14 -16 28 0 q14 16 28 0 q14 -16 28 0 q14 16 28 0 L140 14 H-140 Z" fill="${C.green}"/>
<path d="M-122 -8 Q-122 -120 0 -120 Q122 -120 122 -8 Z" fill="${C.bun}"/>
<path d="M-122 -8 Q-122 -120 0 -120 Q62 -120 94 -92 Q44 -104 -8 -64 Q-70 -22 -122 -8 Z" fill="#fff" opacity=".2"/>
${sesame}`,
  }),

  fries: () => {
    const sticks = [[-78, 92, -6, C.yellow], [-52, 120, -3, C.yellowSoft], [-26, 100, 0, C.yellow], [0, 128, 2, C.yellowSoft], [26, 98, 4, C.yellow], [52, 116, 6, C.yellowSoft], [-14, 84, -2, C.yellowSoft]]
      .map(([x, h, r, f]) => `<rect x="${x}" y="${-h}" width="22" height="${h + 8}" rx="6" fill="${f}" transform="rotate(${r} ${x + 11} 0)"/><rect x="${x + 4}" y="${-h + 4}" width="5" height="${h - 6}" rx="2.5" fill="#fff" opacity=".35" transform="rotate(${r} ${x + 11} 0)"/>`).join('');
    return {
      face: { x: 0, y: 52, s: 1 },
      art: `${shadow(100, 122)}${sticks}
<path d="M-98 -6 H98 L78 120 H-78 Z" fill="${C.red}"/>
<path d="M-98 -6 H98 L95 14 H-95 Z" fill="${C.redDark}"/>
<path d="M-78 120 L-98 -6 L-84 -6 L-62 120 Z" fill="#fff" opacity=".12"/>`,
    };
  },

  cola: () => ({
    face: { x: 0, y: 34, s: 1 },
    art: `${shadow(78, 122)}
<rect x="22" y="-142" width="12" height="82" rx="6" fill="${C.ink}" transform="rotate(12 28 -100)"/>
<rect x="-86" y="-66" width="172" height="24" rx="12" fill="#FBF7EC" stroke="#E3D6B8" stroke-width="4"/>
<rect x="-84" y="-66" width="168" height="8" rx="4" fill="#000" opacity=".06"/>
<path d="M-76 -42 H76 L58 122 H-58 Z" fill="${C.red}"/>
<path d="M-66 80 q22 -16 44 0 t44 0 t44 0 L62 106 H-62 Z" fill="#fff" opacity=".9"/>
<path d="M-76 -42 L-58 122 L-44 122 L-62 -42 Z" fill="#fff" opacity=".13"/>`,
  }),

  coffee: () => ({
    face: { x: 0, y: 46, s: 0.92 },
    art: `${shadow(78, 122)}
<path d="M-18 -112 q-12 -16 0 -30 q12 -14 0 -30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".75"/>
<path d="M16 -106 q-12 -16 0 -30 q12 -14 0 -30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>
<rect x="-30" y="-94" width="60" height="18" rx="8" fill="${C.brown}"/>
<path d="M-74 -76 H74 L78 -46 H-78 Z" fill="${C.brown}"/>
<path d="M-72 -46 H72 L56 122 H-56 Z" fill="#FBF7EC" stroke="#E3D6B8" stroke-width="4" stroke-linejoin="round"/>
<path d="M-66 8 H66 L60 90 H-60 Z" fill="${C.kraft}"/>
<path d="M-66 8 H66 L65 20 H-65 Z" fill="${C.kraftDark}" opacity=".5"/>`,
  }),

  sundae: () => ({
    face: { x: 0, y: 70, s: 0.9 },
    art: `${shadow(86, 124)}
<path d="M-24 -126 q14 -22 24 -2 q-6 12 -24 2 Z" fill="#fff"/>
<ellipse cx="0" cy="-92" rx="40" ry="26" fill="#FFF6E0"/>
<ellipse cx="0" cy="-58" rx="62" ry="30" fill="#FFF0D2"/>
<ellipse cx="0" cy="-18" rx="86" ry="34" fill="#FFE8C0"/>
<path d="M-80 -18 q40 28 80 6 q40 22 80 -6" fill="none" stroke="${C.patty}" stroke-width="10" stroke-linecap="round" opacity=".55"/>
<circle cx="-38" cy="-52" r="6" fill="${C.patty}"/><circle cx="26" cy="-70" r="5" fill="${C.pink}"/><circle cx="48" cy="-30" r="6" fill="${C.patty}"/><circle cx="-56" cy="-22" r="5" fill="${C.pink}"/>
<path d="M-84 14 H84 L62 124 H-62 Z" fill="${C.red}"/>
<path d="M-84 14 H84 L82 30 H-82 Z" fill="${C.redDark}"/>`,
  }),

  drumstick: () => ({
    face: { x: -26, y: -6, s: 1 },
    art: `${shadow(110, 112)}
<g transform="rotate(-16)">
<rect x="46" y="-14" width="92" height="28" rx="14" fill="#FFF3DC"/>
<circle cx="140" cy="-16" r="18" fill="#FFF3DC"/><circle cx="140" cy="16" r="18" fill="#FFF3DC"/>
<path d="M-112 4 C-112 -84 22 -100 60 -42 C84 -6 62 74 -20 80 C-84 82 -112 54 -112 4 Z" fill="#D9822B"/>
<path d="M-96 -20 C-86 -66 -20 -82 22 -70 C-30 -66 -70 -44 -96 -20 Z" fill="#fff" opacity=".22"/>
<circle cx="-72" cy="44" r="6" fill="#B96A1C"/><circle cx="-30" cy="58" r="5" fill="#B96A1C"/><circle cx="26" cy="36" r="6" fill="#B96A1C"/><circle cx="30" cy="-30" r="5" fill="#B96A1C"/><circle cx="-60" cy="-52" r="5" fill="#B96A1C"/>
</g>`,
  }),

  muffin: () => ({
    face: { x: 0, y: -30, s: 1 },
    art: `${shadow(124, 114)}
<path d="M-112 74 H112 Q112 110 62 110 H-62 Q-112 110 -112 74 Z" fill="${C.bun}"/>
<ellipse cx="0" cy="66" rx="118" ry="16" fill="#E88A8A"/>
<path d="M-128 46 q10 -16 24 -6 q14 -14 30 -2 q14 -12 30 0 q16 -12 30 0 q16 -12 30 2 q14 -10 24 6 q10 18 -4 26 H-124 q-14 -8 -4 -26 Z" fill="#fff"/>
<path d="M-112 44 H112 L96 64 L56 50 L0 66 L-56 50 L-96 64 Z" fill="${C.cheese}"/>
<path d="M-114 36 Q-114 -96 0 -96 Q114 -96 114 36 Z" fill="#F0BE5E"/>
<path d="M-114 36 Q-114 -96 0 -96 Q58 -96 88 -70 Q40 -80 -8 -42 Q-66 -2 -114 36 Z" fill="#fff" opacity=".22"/>`,
  }),

  bag: () => ({
    face: { x: 0, y: 24, s: 1 },
    art: `${shadow(100, 124)}
<path d="M-44 -76 Q-44 -132 0 -132 Q44 -132 44 -76" fill="none" stroke="${C.kraftDark}" stroke-width="10" stroke-linecap="round"/>
<path d="M-94 -76 H94 L104 122 H-104 Z" fill="${C.kraft}"/>
<path d="M-94 -76 H94 L90 -52 H-90 Z" fill="${C.kraftDark}" opacity=".7"/>
<path d="M-102 70 H102 L104 94 H-104 Z" fill="${C.red}"/>
<path d="M-94 -76 L-104 122 L-90 122 L-80 -76 Z" fill="#fff" opacity=".14"/>`,
  }),
};

export const FOOD_KINDS = Object.keys(FOODS);

export function foodKindFor(category, name = '') {
  if (/咖啡|拿铁|美式|卡布|摩卡|玛奇朵/.test(name)) return 'coffee';
  return { 汉堡: 'burger', 薯类: 'fries', 饮品: 'cola', 甜品: 'sundae', 鸡肉小食: 'drumstick', 早餐: 'muffin' }[category] ?? 'bag';
}

/** 取一个食物，pos 为平移/缩放。withFace 使用给定表情。 */
export function food(kind, { x = 0, y = 0, s = 1, rotate = 0, face = null } = {}) {
  const f = (FOODS[kind] ?? FOODS.bag)();
  const fc = face && f.face ? `<g transform="translate(${f.face.x} ${f.face.y}) scale(${f.face.s})">${faceSvg(face)}</g>` : '';
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s})">${f.art}${fc}</g>`;
}

/* ─────────────── 表情 ─────────────── */
export function faceSvg({ eyes = 'awake', mouth = 'smile', blush = true } = {}) {
  const ink = C.ink;
  const out = [];
  if (blush) out.push(`<ellipse cx="-56" cy="24" rx="13" ry="8" fill="${C.pink}" opacity=".75"/><ellipse cx="56" cy="24" rx="13" ry="8" fill="${C.pink}" opacity=".75"/>`);
  for (const sx of [-1, 1]) {
    const cx = sx * 30;
    if (eyes === 'awake') out.push(`<ellipse cx="${cx}" cy="0" rx="10" ry="13" fill="${ink}"/><circle cx="${cx + 3}" cy="-5" r="4" fill="#fff"/>`);
    else if (eyes === 'sparkle') out.push(`<ellipse cx="${cx}" cy="0" rx="14" ry="17" fill="${ink}"/><circle cx="${cx + 4}" cy="-7" r="6" fill="#fff"/><circle cx="${cx - 4}" cy="6" r="3" fill="#fff"/>`);
    else if (eyes === 'calm') out.push(`<path d="M${cx - 13} 4 q13 -18 26 0" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`);
    else if (eyes === 'sleepy') out.push(`<ellipse cx="${cx}" cy="20" rx="17" ry="7" fill="#6b4fa0" opacity=".35"/><path d="M${cx - 13} 0 q13 12 26 0" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><path d="M${cx - 13} -6 h26" stroke="${ink}" stroke-width="3" opacity=".5" stroke-linecap="round"/>`);
  }
  if (mouth === 'smile') out.push(`<path d="M-17 28 q17 18 34 0" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`);
  else if (mouth === 'grin') out.push(`<path d="M-20 26 q20 26 40 0 Z" fill="#7a1a10"/><path d="M-12 38 q12 8 24 0 q-12 -6 -24 0 Z" fill="${C.pink}"/>`);
  else if (mouth === 'o') out.push(`<ellipse cx="0" cy="36" rx="9" ry="12" fill="#7a1a10"/>`);
  else if (mouth === 'smirk') out.push(`<path d="M-16 34 q16 10 32 -6" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>`);
  return out.join('');
}

/** 由人格代码决定表情：夜间=困倦，日间尝鲜=星星眼，日间专一=眯眼笑 */
export function faceForCode(code) {
  const [t, , v, p] = code.split('');
  return {
    eyes: t === 'N' ? 'sleepy' : v === 'X' ? 'sparkle' : 'calm',
    mouth: p === 'F' ? 'smirk' : t === 'N' ? 'o' : 'grin',
  };
}

/* ─────────────── 贴纸（人格四个维度各一枚） ─────────────── */
const badge = (inner, rot = 0) => `<g transform="rotate(${rot})"><circle r="54" fill="#000" opacity=".12" cx="3" cy="6"/><circle r="52" fill="${C.cream}" stroke="${C.brown}" stroke-width="6"/>${inner}</g>`;
const STICKERS = {
  D: () => badge(`<circle r="17" fill="${C.yellow}" stroke="${C.brown}" stroke-width="3"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-25" x2="0" y2="-35" stroke="${C.brown}" stroke-width="5" stroke-linecap="round" transform="rotate(${a})"/>`).join('')}`, -8),
  N: () => badge(`<path d="M10 -26 A28 28 0 1 0 26 14 A22 22 0 1 1 10 -26 Z" fill="${C.yellow}" stroke="${C.brown}" stroke-width="3"/>${star4(20, -14, 0.55, C.brown)}${star4(-2, 24, 0.4, C.brown)}`, 8),
  H: () => badge(`<path d="M-16 -8 H16 L20 24 H-20 Z" fill="${C.red}" stroke="${C.brown}" stroke-width="3" stroke-linejoin="round"/><path d="M-9 -8 Q-9 -26 0 -26 Q9 -26 9 -8" fill="none" stroke="${C.brown}" stroke-width="4" stroke-linecap="round"/><line x1="-44" y1="-2" x2="-26" y2="-2" stroke="${C.brown}" stroke-width="4" stroke-linecap="round"/><line x1="-44" y1="9" x2="-30" y2="9" stroke="${C.brown}" stroke-width="4" stroke-linecap="round"/><line x1="-44" y1="20" x2="-26" y2="20" stroke="${C.brown}" stroke-width="4" stroke-linecap="round"/>`, 6),
  S: () => badge(`<path d="M-26 -8 L-20 -26 H20 L26 -8 Z" fill="${C.red}" stroke="${C.brown}" stroke-width="3" stroke-linejoin="round"/><path d="M-13 -8 L-10 -26 M0 -8 V-26 M13 -8 L10 -26" stroke="#fff" stroke-width="5"/><rect x="-22" y="-8" width="44" height="32" fill="#fff" stroke="${C.brown}" stroke-width="3"/><rect x="-6" y="4" width="12" height="20" fill="${C.yellow}" stroke="${C.brown}" stroke-width="3"/>`, -6),
  L: () => badge(`<path d="M0 22 C-34 -2 -24 -28 -9 -26 C-2 -25 0 -17 0 -17 C0 -17 2 -25 9 -26 C24 -28 34 -2 0 22 Z" fill="${C.red}" stroke="${C.brown}" stroke-width="3.5" stroke-linejoin="round"/>`, 6),
  X: () => badge(`<circle cx="-4" cy="-4" r="17" fill="#fff" stroke="${C.brown}" stroke-width="5"/><line x1="9" y1="9" x2="26" y2="26" stroke="${C.brown}" stroke-width="8" stroke-linecap="round"/>${star4(-4, -4, 0.55, C.yellow)}`, -6),
  B: () => badge(`<path d="M-30 -14 H30 V-4 a6 6 0 0 0 0 12 V18 H-30 V8 a6 6 0 0 0 0 -12 Z" fill="${C.yellow}" stroke="${C.brown}" stroke-width="3.5" stroke-linejoin="round"/><line x1="-12" y1="-10" x2="-12" y2="14" stroke="${C.brown}" stroke-width="2.5" stroke-dasharray="3 4"/>${T(10, 11, '¥', { size: 24, weight: 800, anchor: 'middle', fill: C.red })}`, 8),
  F: () => badge(`<rect x="-22" y="-22" width="44" height="44" rx="10" fill="#fff" stroke="${C.brown}" stroke-width="4" transform="rotate(12)"/>${[[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${C.red}" transform="rotate(12)"/>`).join('')}`, -8),
};
export const sticker = (key, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${(STICKERS[key] ?? STICKERS.D)()}</g>`;

/** 完整人格角色：食物主体 + 表情 + 四枚维度贴纸 */
export function character(code, kind, { x = 540, y = 600, s = 1, stickers = true } = {}) {
  const [t, sc, v, p] = code.split('');
  const f = (FOODS[kind] ?? FOODS.bag)();
  const fc = faceForCode(code);
  const face = f.face ? `<g transform="translate(${f.face.x} ${f.face.y}) scale(${f.face.s})">${faceSvg(fc)}</g>` : '';
  const st = stickers
    ? sticker(t, -156, -112, 0.8) + sticker(sc, 158, -100, 0.8) + sticker(v, -158, 124, 0.76) + sticker(p, 158, 130, 0.76)
    : '';
  return `<g transform="translate(${x} ${y}) scale(${s})">${f.art}${face}${st}</g>`;
}
