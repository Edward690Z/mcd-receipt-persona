/** 单文件 HTML：翻页查看器（上下翻页 / 键盘 / 保存 PNG）与长图页。无外部资源，可离线打开。 */
import { esc } from './svgkit.mjs';
import { REPO, NAME_ZH } from './brand.mjs';

export function renderLong(deck) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>long</title><style>html,body{margin:0;padding:0;background:#000}svg{display:block;width:1080px;height:1920px}</style></head><body>${deck.map((p) => p.svg).join('')}</body></html>`;
}

export function renderViewer(deck, { persona, repo = REPO } = {}) {
  // 下载文件名前缀会被写进内联脚本，只保留安全字符
  const fileBase = String(repo).replace(/[^\w.\-\u4e00-\u9fa5]/g, '') || REPO;
  const nav = deck.map((p, i) => `<button class="dot" data-i="${i}" title="${esc(p.title)}" aria-label="第 ${i + 1} 页：${esc(p.title)}"></button>`).join('');
  const pages = deck.map((p, i) => `<section class="page" id="p${i}" data-i="${i}"><div class="frame">${p.svg}</div><div class="bar"><span>${i + 1} / ${deck.length} · ${esc(p.title)}</span><button class="save" data-i="${i}">保存本页 PNG</button></div></section>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>我的${NAME_ZH}：${esc(persona?.title ?? '')}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#16100d;color:#fff;font-family:'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif}
main{height:100vh;overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth}
.page{height:100vh;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px 0}
.frame{height:calc(100vh - 64px);aspect-ratio:9/16;max-width:100vw}
.frame svg{width:100%;height:100%;display:block;border-radius:22px;box-shadow:0 14px 50px rgba(0,0,0,.55)}
.bar{display:flex;gap:14px;align-items:center;font-size:14px;color:#c9bdb4;height:34px}
.save{background:#FFC72C;color:#4B2116;border:0;border-radius:18px;padding:7px 16px;font-weight:700;cursor:pointer;font-size:14px}
.save:hover{background:#ffd75e}
nav{position:fixed;right:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:12px;z-index:5}
.dot{width:12px;height:12px;border-radius:50%;border:2px solid #fff;background:transparent;opacity:.5;cursor:pointer;padding:0}
.dot.on{background:#FFC72C;border-color:#FFC72C;opacity:1;transform:scale(1.25)}
.hint{position:fixed;left:14px;bottom:12px;font-size:12px;color:#8f8279}
@media(max-width:600px){nav{display:none}.hint{display:none}}
</style></head><body>
<main id="m">${pages}</main><nav>${nav}</nav>
<div class="hint">↑ ↓ 或滑动翻页 · ${esc(repo)} · 非麦当劳官方 · 仅供娱乐</div>
<script>
(function(){
  var m=document.getElementById('m'),pages=[].slice.call(document.querySelectorAll('.page')),dots=[].slice.call(document.querySelectorAll('.dot'));
  function cur(){var h=m.clientHeight;return Math.max(0,Math.min(pages.length-1,Math.round(m.scrollTop/h)));}
  function mark(){var c=cur();dots.forEach(function(d,i){d.classList.toggle('on',i===c)});}
  m.addEventListener('scroll',mark);mark();
  dots.forEach(function(d){d.addEventListener('click',function(){pages[+d.dataset.i].scrollIntoView({behavior:'smooth'})})});
  document.addEventListener('keydown',function(e){
    var c=cur();
    if(['ArrowDown','PageDown',' ','ArrowRight'].indexOf(e.key)>=0){e.preventDefault();pages[Math.min(pages.length-1,c+1)].scrollIntoView({behavior:'smooth'})}
    if(['ArrowUp','PageUp','ArrowLeft'].indexOf(e.key)>=0){e.preventDefault();pages[Math.max(0,c-1)].scrollIntoView({behavior:'smooth'})}
  });
  function save(i){
    var svg=pages[i].querySelector('svg');
    var xml=new XMLSerializer().serializeToString(svg);
    var url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas');c.width=1080;c.height=1920;
      c.getContext('2d').drawImage(img,0,0,1080,1920);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='${fileBase}-'+String(i+1).padStart(2,'0')+'.png';a.click();},'image/png');
    };
    img.onerror=function(){var a=document.createElement('a');a.href=url;a.download='${fileBase}-'+(i+1)+'.svg';a.click();};
    img.src=url;
  }
  [].forEach.call(document.querySelectorAll('.save'),function(b){b.addEventListener('click',function(){save(+b.dataset.i)})});
})();
</script></body></html>`;
}
