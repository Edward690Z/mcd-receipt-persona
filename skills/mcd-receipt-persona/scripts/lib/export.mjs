/** 用本机已安装的 Edge / Chrome / Chromium 无头截图，把 SVG 页面导出为 PNG（无需安装任何依赖）。 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO } from './brand.mjs';

export function findBrowser() {
  const env = process.env.MCD_BROWSER;
  if (env && existsSync(env)) return env;
  const win = ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].map((k) => process.env[k]).filter(Boolean);
  const candidates = [
    ...win.flatMap((b) => [`${b}\\Microsoft\\Edge\\Application\\msedge.exe`, `${b}\\Google\\Chrome\\Application\\chrome.exe`]),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  }
  return null;
}

export function shot(browser, profile, url, out, w, h) {
  const r = spawnSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`, `--window-size=${w},${h}`, `--screenshot=${out}`, '--virtual-time-budget=4000', url,
  ], { timeout: 90000, stdio: 'ignore' });
  return existsSync(out) && r.status !== null;
}

export function exportPngs(outDir, pageCount) {
  const browser = findBrowser();
  if (!browser) return { ok: false, reason: '没有找到 Edge / Chrome / Chromium（可用环境变量 MCD_BROWSER 指定浏览器路径）' };
  const profile = mkdtempSync(join(tmpdir(), `${REPO}-`));
  const files = [];
  try {
    const pagesDir = join(outDir, 'pages');
    for (const f of readdirSync(pagesDir).filter((n) => n.endsWith('.svg')).sort()) {
      const out = join(pagesDir, f.replace(/\.svg$/, '.png'));
      if (shot(browser, profile, pathToFileURL(join(pagesDir, f)).href, out, 1080, 1920)) files.push(out);
    }
    shot(browser, profile, pathToFileURL(join(outDir, 'long.html')).href, join(outDir, 'long.png'), 1080, 1920 * pageCount);
    return { ok: files.length > 0, files, browser, reason: files.length ? '' : '截图失败' };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* 忽略 */ }
  }
}
