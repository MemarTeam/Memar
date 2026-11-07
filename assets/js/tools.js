// Small members' tools: a QR code maker and the brand kit. Also the file-saving helper the tools share.
import { lang, t } from './i18n.js';
import { esc, logo, tri } from './ui.js';

// Saves a file to the visitor's device.
export async function saveBlob(blob, filename) {
  // inside a Claude preview the page can't start downloads itself, so it asks the host instead
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const d = await window.claude.use('downloads');
      if (d) { await d.save({ filename, data: blob }); return; }
    }
  } catch (e) { /* fall through to a normal download */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const STYLES = { ink: ['#111418', '#F3F1EB'], night: ['#F3F1EB', '#082F54'], blue: ['#1E6AB6', '#F3F1EB'] };

function qrMatrix(text) {
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}
function qrSvg(text, style) {
  const [fg, bg] = STYLES[style];
  const { n, dark } = qrMatrix(text);
  const pad = 4, size = n + pad * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) d += `M${c + pad} ${r + pad}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/><path fill="${fg}" d="${d}"/></svg>`;
}
function qrPng(text, style, px = 1200) {
  const [fg, bg] = STYLES[style];
  const { n, dark } = qrMatrix(text);
  const pad = 4, cell = Math.floor(px / (n + pad * 2)), size = cell * (n + pad * 2);
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.fillStyle = fg;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (dark(r, k)) g.fillRect((k + pad) * cell, (r + pad) * cell, cell, cell);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

export async function mountQr(el, ctx) {
  let link = '', style = 'ink';
  try { link = localStorage.getItem('memar-qr-link') || ''; } catch (e) { /* storage blocked */ }
  el.innerHTML = `<div class="m-head"><div><h1 tabindex="-1">${esc(t('qr'))}</h1><p>${esc(t('qrText'))}</p></div></div>
    <div class="qr-tool">
      <form class="m-card" novalidate>
        <div class="field"><label for="qr-link">${esc(t('qrLink'))}</label><input id="qr-link" type="url" dir="ltr" placeholder="https://" value="${esc(link)}"><span class="err" aria-live="polite"></span></div>
        <fieldset class="m-fs"><legend>${esc(t('qrStyle'))}</legend><div class="m-choices">
          ${[['ink', t('qrInk')], ['night', t('qrNight')], ['blue', t('qrBlue')]].map(([k, l]) => `<label class="m-choice"><input type="radio" name="st" value="${k}"${k === style ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}
        </div></fieldset>
        <div class="m-btnrow"><button type="button" class="btn btn-primary btn-sm" data-png disabled>${esc(t('dlPng'))}${tri()}</button><button type="button" class="btn btn-outline btn-sm" data-svg disabled>${esc(t('dlSvg'))}</button></div>
      </form>
      <div class="qr-preview m-card" aria-live="polite"></div>
    </div>`;
  const input = el.querySelector('#qr-link'), prev = el.querySelector('.qr-preview'), err = el.querySelector('.err');
  el.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
  const btns = el.querySelectorAll('[data-png],[data-svg]');
  const draw = () => {
    link = input.value.trim();
    try { localStorage.setItem('memar-qr-link', link); } catch (e) { /* storage blocked */ }
    const ok = /^https?:\/\/\S+/i.test(link);
    err.textContent = link && !ok ? t('linkInvalid') : '';
    btns.forEach((b) => { b.disabled = !ok; });
    prev.innerHTML = ok ? qrSvg(link, style) : `<div class="qr-empty" aria-hidden="true"></div>`;
  };
  input.addEventListener('input', draw);
  el.querySelectorAll('[name="st"]').forEach((r) => r.addEventListener('change', () => { style = r.value; draw(); }));
  el.querySelector('[data-svg]').addEventListener('click', () => saveBlob(new Blob([qrSvg(link, style)], { type: 'image/svg+xml' }), 'memar-qr.svg'));
  el.querySelector('[data-png]').addEventListener('click', async () => saveBlob(await qrPng(link, style), 'memar-qr.png'));
  draw();
  return null;
}

// ---------- brand kit ----------
const PALETTE = [
  ['Paper', '#F3F1EB', 'الورق', 'أرضية كل الصفحات', 'The ground of every page'],
  ['Ink', '#111418', 'الحبر', 'النصوص والعناوين', 'Text and headings'],
  ['Blueprint Blue', '#1E6AB6', 'أزرق المخطط', 'الأفعال والتمييز فقط', 'Actions and highlights only'],
  ['Blueprint Night', '#082F54', 'ليل المخطط', 'شريط مميز واحد في كل صفحة', 'One feature band per page'],
  ['Blue Light', '#5996D9', 'أزرق فاتح', 'التفاصيل على الخلفية الداكنة', 'Details on dark grounds'],
  ['Blue Tint', '#DCE9F9', 'صبغة زرقاء', 'خلفيات الوسوم والتحديد', 'Tag and selection backgrounds'],
  ['Sand', '#EBDBC9', 'الرمل', 'وسوم ولمسات صغيرة', 'Tags and small touches'],
  ['Courtyard', '#267450', 'أخضر الفناء', 'وسم الديزايناثون', 'The designathon tag'],
  ['Clay', '#A85334', 'الطين', 'وسم المحاضرات', 'The talk tag'],
  ['Graphite', '#51565B', 'الجرافيت', 'النص الثانوي', 'Secondary text']
];
// the five font roles; the names come from the board's current choice (Fonts and appearance)
const FONT_ROLES = [
  ['arHead', 'العناوين العربية', 'Arabic headings'],
  ['arBody', 'النص العربي', 'Arabic text'],
  ['enHead', 'العناوين الإنجليزية، بعرض ١١٥٪', 'English headings, 115% width'],
  ['enBody', 'النص الإنجليزي', 'English text'],
  ['mono', 'التسميات الصغيرة: التواريخ والأرقام', 'Small labels: dates and numbers']
];
const LOGOS = [
  ['paper', '#F3F1EB', '#111418', '#1E6AB6', 'onPaper'],
  ['night', '#082F54', '#F3F1EB', '#5996D9', 'onNight'],
  ['ink', '#111418', '#F3F1EB', '#1E6AB6', 'onInk']
];
function logoFile(bg, ink, triC, transparent) {
  const inner = logo(ink, triC).replace(/<svg[^>]*>/, '').replace('</svg>', '');
  const pad = 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${170 - pad} ${200 - pad} ${969 + pad * 2} ${170 + pad * 2}">${transparent ? '' : `<rect x="${170 - pad}" y="${200 - pad}" width="${969 + pad * 2}" height="${170 + pad * 2}" fill="${bg}"/>`}${inner}</svg>`;
}
function svgToPng(svg, w = 2400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const h = Math.round(w * img.height / img.width);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

export async function mountBrand(el, ctx) {
  const ar = lang === 'ar';
  const fonts = window.MemarLook ? window.MemarLook.fonts() : { arHead: 'Noto Kufi Arabic', arBody: 'IBM Plex Sans Arabic', enHead: 'Archivo', enBody: 'IBM Plex Sans', mono: 'IBM Plex Mono' };
  el.innerHTML = `<div class="m-head"><div><h1 tabindex="-1">${esc(t('brand'))}</h1><p>${esc(t('brandText'))}</p></div></div>
    <section class="m-card"><h2>${esc(t('logoFiles'))}</h2>
      <div class="bk-logos">${LOGOS.map(([k, bg, ink, tc, label]) => `<div class="bk-logo">
          <div class="bk-logo-art" style="background:${bg}">${logo(ink, tc)}</div>
          <div class="bk-logo-foot"><span>${esc(t(label))}</span>
            <span class="m-btnrow"><button type="button" class="btn btn-sm btn-outline" data-logo="${k}" data-fmt="svg">SVG</button><button type="button" class="btn btn-sm btn-outline" data-logo="${k}" data-fmt="png">PNG</button></span></div>
        </div>`).join('')}</div>
      <p class="muted bk-rule">${esc(t('brandRules'))}</p>
    </section>
    <section class="m-card"><h2>${esc(t('colors'))}</h2>
      <div class="bk-colors">${PALETTE.map(([n, hex, nar, uar, uen]) => `<button type="button" class="bk-color" data-hex="${hex}" aria-label="${esc(t('copy'))} ${hex}">
          <span class="sw" style="background:${hex}"></span>
          <span class="tx"><b>${esc(ar ? nar : n)}</b><span class="mono" dir="ltr">${hex}</span><span class="muted">${esc(ar ? uar : uen)}</span></span>
        </button>`).join('')}</div>
    </section>
    <section class="m-card"><h2>${esc(t('fonts'))}</h2>
      <div class="bk-fonts">${FONT_ROLES.map(([k, uar, uen]) => { const n = fonts[k]; return `<a class="bk-font" href="https://fonts.google.com/specimen/${encodeURIComponent(n).replace(/%20/g, '+')}" target="_blank" rel="noopener">
          <b style="font-family:'${esc(n)}'" lang="en" dir="ltr">${esc(n)}</b><span class="muted">${esc(ar ? uar : uen)}</span></a>`; }).join('')}</div>
    </section>`;
  el.querySelectorAll('[data-logo]').forEach((b) => b.addEventListener('click', async () => {
    const [k, bg, ink, tc] = LOGOS.find((x) => x[0] === b.dataset.logo);
    const svg = logoFile(bg, ink, tc, false);
    if (b.dataset.fmt === 'svg') saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `memar-logo-${k}.svg`);
    else { try { saveBlob(await svgToPng(svg), `memar-logo-${k}.png`); } catch (e) { ctx.toast(t('errSave'), true); } }
  }));
  el.querySelectorAll('.bk-color').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.hex); ctx.toast(`${t('copied')} ${b.dataset.hex}`); } catch (e) { ctx.toast(b.dataset.hex); }
  }));
  return null;
}
