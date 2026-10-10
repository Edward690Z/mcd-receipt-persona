#!/usr/bin/env node
/**
 * 重新生成 README 使用的预览图（assets/*.png）。
 *
 * - 只使用虚构的演示订单（examples/demo-orders.json 同源），不读取任何真实数据。
 * - 需要本机安装 Edge / Chrome / Chromium（无头截图），无需 npm 依赖。
 * - 每张图的宽、高都不超过 1600 px（超大图片放进 AI 对话会触发接口限制）。
 *
 * 用法：node scripts/build-assets.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeOrders, computeStats, derivePersona, demoOrders } from '../skills/mcd-receipt-persona/scripts/wrapped.mjs';
import { buildDeck } from '../skills/mcd-receipt-persona/scripts/lib/cards.mjs';
import { buildAtlas } from '../skills/mcd-receipt-persona/scripts/lib/atlas.mjs';
import { findBrowser, shot } from '../skills/mcd-receipt-persona/scripts/lib/export.mjs';
import { REPO, NAME_ZH } from '../skills/mcd-receipt-persona/scripts/lib/brand.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const FONT = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Source Han Sans SC',sans-serif";
const MONO = "'Cascadia Mono','SF Mono',Consolas,'Courier New',monospace";
const PROMPT = '帮我看看我的麦当劳点餐人格';

// ── 演示数据 → 7 页卡片 ───────────────────────────────────────────────
const { orders } = normalizeOrders(demoOrders());
const st = computeStats(orders);
const persona = derivePersona(st);
const deck = buildDeck({ st, persona, orders, opts: { name: '示例用户', repo: REPO } });
const page = (i) => deck[i].svg;

// ── 1) 封面横幅 ────────────────────────────────────────────────────────
const HERO = { w: 1600, h: 800 };
const heroHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;width:${HERO.w}px;height:${HERO.h}px;overflow:hidden}
body{position:relative;font-family:${FONT};color:#4B2116;
  background:repeating-conic-gradient(from 0deg at 25% 52%,rgba(255,255,255,.16) 0deg 7.5deg,rgba(255,255,255,0) 7.5deg 15deg),linear-gradient(135deg,#FFC72C 0%,#FFAE00 100%)}
.left{position:absolute;left:84px;top:92px;width:596px}
.pill{display:inline-block;background:#DA291C;color:#fff;font-weight:800;font-size:26px;padding:10px 26px;border-radius:30px;letter-spacing:2px}
.title{position:relative;height:176px;margin-top:24px}
.title span{position:absolute;left:0;top:0;font-size:144px;line-height:176px;font-weight:900;letter-spacing:2px;white-space:nowrap}
.title .s{color:#fff;-webkit-text-stroke:22px #fff;text-stroke:22px #fff}
.title .f{color:#DA291C}
.sub{font-size:46px;font-weight:800;margin-top:4px}
.cmd{margin-top:32px;display:inline-block;background:#1c1d24;color:#e6e6e6;font-family:${MONO};font-size:28px;padding:18px 26px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.28)}
.cmd i{font-style:normal;color:#7CFC8A}.cmd b{font-weight:400;color:#ffd866}
.chips{margin-top:30px;display:flex;flex-wrap:wrap;gap:14px;width:596px}
.chip{background:#fff;border:4px solid #4B2116;border-radius:40px;padding:8px 18px;font-size:24px;font-weight:800;white-space:nowrap}
.cards{position:absolute;right:40px;top:78px;width:840px;height:660px}
.c{position:absolute;width:330px;height:587px;border-radius:22px;overflow:hidden;box-shadow:0 18px 44px rgba(75,33,22,.45)}
.c svg{display:block;width:100%;height:100%}
.c1{left:0;top:62px;transform:rotate(-7deg);z-index:1}
.c3{left:500px;top:66px;transform:rotate(7deg);z-index:2}
.c2{left:250px;top:14px;z-index:3}
.foot{position:absolute;left:84px;bottom:30px;font-size:20px;opacity:.7}
</style></head><body>
<div class="left">
  <div class="pill">1024 程序员节 · 麦当劳 MCP Skill</div>
  <div class="title"><span class="s">${NAME_ZH}</span><span class="f">${NAME_ZH}</span></div>
  <div class="sub">你的麦当劳点餐小票人格</div>
  <div class="cmd"><i>你 ›</i> <b>${PROMPT}</b></div>
  <div class="chips"><span class="chip">16 种程序员人格</span><span class="chip">7 页竖屏故事卡</span><span class="chip">只读 · 不下单</span><span class="chip">本地处理 · 零依赖</span></div>
</div>
<div class="cards">
  <div class="c c1">${page(0)}</div>
  <div class="c c3">${page(6)}</div>
  <div class="c c2">${page(5)}</div>
</div>
<div class="foot">${REPO} · 演示数据（虚构）· 非麦当劳官方 · 仅供娱乐</div>
</body></html>`;

// ── 2) 7 页故事卡墙（4 + 3 + 一块行动提示） ──────────────────────────────
const CARD = { w: 362, h: 644 }, GAP = 24, PAD = 40, CAP = 34;
const ROW = CARD.h + 10 + CAP;
const WALL = { w: PAD * 2 + CARD.w * 4 + GAP * 3, h: PAD * 2 + ROW * 2 + 28 };
const cells = deck.map((p, i) => `<div class="cell"><div class="card">${p.svg}</div><div class="cap"><i>${String(i + 1).padStart(2, '0')}</i>${p.title}</div></div>`).join('');
const wallHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0}
body{width:${WALL.w}px;height:${WALL.h}px;padding:${PAD}px;background:#FFF1CF;font-family:${FONT};color:#4B2116}
.grid{display:grid;grid-template-columns:repeat(4,${CARD.w}px);column-gap:${GAP}px;row-gap:28px}
.cell{display:flex;flex-direction:column;gap:10px}
.card{width:${CARD.w}px;height:${CARD.h}px;border-radius:22px;overflow:hidden;box-shadow:0 10px 28px rgba(75,33,22,.28)}
.card svg{display:block;width:100%;height:100%}
.cap{height:${CAP}px;line-height:${CAP}px;text-align:center;font-size:26px;font-weight:800}
.cap i{font-style:normal;color:#DA291C;margin-right:10px;font-family:${MONO}}
.cta{width:${CARD.w}px;height:${CARD.h}px;border-radius:22px;background:linear-gradient(160deg,#E3342A,#A81A10);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 30px;box-shadow:0 10px 28px rgba(75,33,22,.28)}
.cta{align-items:stretch;padding:0 28px}
.cta small{font-size:26px;letter-spacing:6px;color:#FFC72C;font-weight:800;text-align:center}
.cta p{margin:14px 0 6px;font-size:44px;line-height:1.3;font-weight:900;text-align:center}
.cta .b{max-width:270px;margin-top:18px;padding:14px 20px;border-radius:24px;font-size:30px;line-height:1.35;font-weight:800;text-align:left}
.cta .me{align-self:flex-end;background:#FFC72C;color:#4B2116;border-bottom-right-radius:6px}
.cta .ai{align-self:flex-start;background:#fff;color:#27251F;border-bottom-left-radius:6px}
.cta .ai b{color:#DA291C;letter-spacing:3px}
.cta em{font-style:normal;margin-top:40px;font-size:24px;opacity:.9;line-height:1.7;text-align:center}
.cta code{background:#1c1d24;color:#7CFC8A;font-family:${MONO};font-size:24px;padding:4px 14px;border-radius:10px}
</style></head><body><div class="grid">
${cells}
<div class="cell"><div class="cta"><small>TRY IT</small><p>对 AI 说一句话</p>
<div class="b me">${PROMPT}</div>
<div class="b ai">你是 <b>${persona.code}</b><br>「${persona.title}」</div>
<em>没有 Token？先看演示<br><code>npm run demo</code></em></div><div class="cap">&nbsp;</div></div>
</div></body></html>`;

// ── 3) 16 型图鉴（矢量按比例缩小，高度 ≤ 1600） ───────────────────────────
const atlas = buildAtlas({ repo: REPO });
const AT_W = 1100, AT_H = Math.round((AT_W * atlas.height) / atlas.width);
const atlasHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#FFF8E7}svg{display:block;width:${AT_W}px;height:${AT_H}px}</style></head><body>${atlas.svg}</body></html>`;

// ── 渲染 ───────────────────────────────────────────────────────────────
const browser = findBrowser();
if (!browser) { console.error('没有找到 Edge / Chrome / Chromium（可用环境变量 MCD_BROWSER 指定浏览器路径）'); process.exit(2); }
mkdirSync(assets, { recursive: true });
const work = mkdtempSync(join(tmpdir(), `${REPO}-assets-`));
const jobs = [
  ['hero', heroHtml, HERO.w, HERO.h],
  ['story-wall', wallHtml, WALL.w, WALL.h],
  ['atlas', atlasHtml, AT_W, AT_H],
];
let bad = 0;
try {
  for (const [name, html, w, h] of jobs) {
    const htmlPath = join(work, `${name}.html`);
    const out = join(assets, `${name}.png`);
    writeFileSync(htmlPath, html);
    const ok = shot(browser, join(work, 'profile'), pathToFileURL(htmlPath).href, out, w, h);
    if (!ok) { console.error(`✗ ${name}: 截图失败`); bad++; continue; }
    const b = readFileSync(out);
    const pw = b.readUInt32BE(16), ph = b.readUInt32BE(20);
    const fine = pw <= 1600 && ph <= 1600;
    if (!fine) bad++;
    console.log(`${fine ? '✓' : '✗'} assets/${name}.png  ${pw}×${ph}  ${(b.length / 1024).toFixed(0)} KB${fine ? '' : '  ← 超过 1600px'}`);
  }
} finally {
  try { rmSync(work, { recursive: true, force: true }); } catch { /* 忽略 */ }
}
console.log(`演示人格：${persona.code}「${persona.title}」，${st.n} 单（虚构数据）`);
process.exit(bad ? 1 : 0);
