// Announcement maker: the radar → pill grid → QR film from the workshop announcement, filled in from an
// event or by hand, previewed live and exported as a 2K MP4 in the browser.
// Needs the classic scripts workshop-core.js (MemarWorkshop), qrcode.js and mp4-muxer.js on the page.
import { lang, L, t, bothDates, num } from './i18n.js';
import { splitEvents, eventDate, safeUrl } from './data.js';
import { esc, tri, play } from './ui.js';
import { saveBlob } from './tools.js';

const KEY = 'memar-announce-v1';
const FPS = 60, EW = 2560, EH = 1440, BITRATE = 30e6;
const MAX_LINES = 6;
const clone = (o) => JSON.parse(JSON.stringify(o));

const BLANK = {
  header: { en: 'Memar Workshop', ar: 'ورشة معمار' },
  lines: [{ en: '', ar: '' }],
  link: '', scan: { en: 'Scan to register', ar: 'امسح للتسجيل' }, hold: 7, eventId: ''
};
const HEADERS = {
  workshop: { en: 'Memar Workshop', ar: 'ورشة معمار' },
  designathon: { en: 'Memar Designathon', ar: 'ديزايناثون معمار' },
  talk: { en: 'Memar Talk', ar: 'محاضرة معمار' },
  visit: { en: 'Memar Site Visit', ar: 'زيارة معمار الميدانية' }
};

function fromEvent(e) {
  const lines = [];
  const add = (v) => { if (v && (v.ar || v.en)) lines.push({ ar: v.ar || v.en, en: v.en || v.ar }); };
  add(e.title);
  add(e.guest);
  const d = eventDate(e);
  if (d && !isNaN(d)) lines.push(bothDates(d));
  add(e.place);
  return {
    header: clone(HEADERS[e.type] || HEADERS.workshop),
    lines: lines.slice(0, MAX_LINES),
    link: safeUrl(e.registerUrl) || '',
    scan: { en: 'Scan to register', ar: 'امسح للتسجيل' },
    hold: 7, eventId: e.id
  };
}
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.lines && s.header) return s; } catch (e) { /* storage blocked */ } return clone(BLANK); }
function store(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* storage blocked */ } }

// the film needs both languages on every line; an empty side borrows the other
function forFilm(cfg) {
  const both = (v) => ({ en: (v.en || v.ar || '').trim() || ' ', ar: (v.ar || v.en || '').trim() || ' ' });
  const lines = cfg.lines.filter((l) => (l.en || l.ar || '').trim()).map(both);
  return { header: both(cfg.header), lines: lines.length ? lines : [{ en: ' ', ar: ' ' }], link: cfg.link || ' ', scan: both(cfg.scan), hold: Number(cfg.hold) || 7, fonts: filmFonts() };
}
// the film's text uses the site's body fonts, so a change of identity reaches the videos too
function filmFonts() {
  const f = window.MemarLook ? window.MemarLook.fonts() : { enBody: 'IBM Plex Sans', arBody: 'IBM Plex Sans Arabic' };
  return { en: `"${f.enBody}", "${f.arBody}", system-ui, sans-serif`, ar: `"${f.arBody}", "${f.enBody}", Tahoma, sans-serif`, names: [f.enBody, f.arBody] };
}

export async function mount(el, ctx, params) {
  if (!window.MemarWorkshop) { el.innerHTML = `<p>${esc(t('errLoad'))}</p>`; return null; }
  let events = [];
  try { events = splitEvents(await ctx.be.list('events')).upcoming; } catch (e) { console.error(e); }

  let cfg = load();
  const want = params.get('event');
  if (want) {
    const ev = events.find((e) => e.id === want);
    if (ev) { cfg = fromEvent(ev); store(cfg); }
    history.replaceState(null, '', '#tools/announce');
  }

  el.innerHTML = `<div class="m-head"><div><h1 tabindex="-1">${esc(t('genTitle'))}</h1><p>${esc(t('genText'))}</p></div></div>
    <div class="an">
      <div class="an-stage">
        <div class="an-view"><canvas aria-label="${esc(t('preview'))}" role="img"></canvas></div>
        <div class="an-transport">
          <button type="button" class="btn btn-sm btn-ink" data-play></button>
          <button type="button" class="btn btn-sm btn-outline" data-replay>${esc(t('replay'))}</button>
          <input type="range" class="an-scrub" dir="ltr" min="0" max="1000" value="0" aria-label="${esc(t('preview'))}">
          <span class="mono an-time" dir="ltr"></span>
        </div>
        <div class="an-export">
          <button type="button" class="btn btn-primary" data-export>${esc(t('exportMp4'))}${tri()}</button>
          <div class="an-bar" aria-hidden="true"><i></i></div>
          <p class="an-status" aria-live="polite">${esc(t('exportNote'))}</p>
        </div>
      </div>
      <form class="an-form m-card" novalidate>
        ${events.length ? `<div class="field"><label for="an-ev">${esc(t('genFrom'))}</label>
          <select id="an-ev"><option value="">${esc(t('genNone'))}</option>${events.map((e) => `<option value="${esc(e.id)}"${e.id === cfg.eventId ? ' selected' : ''}>${esc(L(e.title))}</option>`).join('')}</select></div>` : ''}
        <fieldset class="m-fs"><legend>${esc(t('topPill'))}</legend><div class="pair">
          <div class="field"><label for="an-h-ar">${esc(t('f_ar'))}</label><input type="text" id="an-h-ar" data-k="header.ar" dir="rtl" lang="ar" maxlength="40"></div>
          <div class="field"><label for="an-h-en">${esc(t('f_en'))}</label><input type="text" id="an-h-en" data-k="header.en" dir="ltr" lang="en" maxlength="40"></div>
        </div></fieldset>
        <fieldset class="m-fs"><legend>${esc(t('lines'))}</legend><div class="an-lines"></div>
          <button type="button" class="btn btn-sm btn-outline" data-addline>${esc(t('addLine'))}</button></fieldset>
        <div class="field"><label for="an-link">${esc(t('qrLink'))}</label><input id="an-link" data-k="link" type="url" dir="ltr" placeholder="https://"><span class="err" aria-live="polite"></span></div>
        <fieldset class="m-fs"><legend>${esc(t('qrCaption'))}</legend><div class="pair">
          <div class="field"><label for="an-s-ar">${esc(t('f_ar'))}</label><input type="text" id="an-s-ar" data-k="scan.ar" dir="rtl" lang="ar" maxlength="40"></div>
          <div class="field"><label for="an-s-en">${esc(t('f_en'))}</label><input type="text" id="an-s-en" data-k="scan.en" dir="ltr" lang="en" maxlength="40"></div>
        </div></fieldset>
        <div class="field"><div class="an-hold-head"><label for="an-hold">${esc(t('qrHold'))}</label><output id="an-hold-out" for="an-hold"></output></div><input id="an-hold" type="range" min="5" max="10" step="1"></div>
      </form>
    </div>`;

  const cv = el.querySelector('canvas'), cx = cv.getContext('2d');
  const scrub = el.querySelector('.an-scrub'), timeEl = el.querySelector('.an-time');
  const playBtn = el.querySelector('[data-play]');
  const form = el.querySelector('.an-form');
  const linesEl = el.querySelector('.an-lines');
  const status = el.querySelector('.an-status'), bar = el.querySelector('.an-bar i');
  const exportBtn = el.querySelector('[data-export]');
  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  let film = null, time = 0, playing = !reduce, last = null, dirty = true, raf = 0, alive = true, exporting = false, timer = 0;

  // ----- form -----
  const get = (k) => k.split('.').reduce((o, p) => (o ? o[p] : ''), cfg);
  const set = (k, v) => { const ps = k.split('.'); let o = cfg; ps.slice(0, -1).forEach((p) => { o = o[p]; }); o[ps[ps.length - 1]] = v; };
  function fill() {
    form.querySelectorAll('[data-k]').forEach((i) => { i.value = get(i.dataset.k) || ''; });
    const hold = form.querySelector('#an-hold'); hold.value = cfg.hold; form.querySelector('#an-hold-out').textContent = t('holdS', { n: num(cfg.hold) });
    drawLines();
  }
  function drawLines() {
    linesEl.innerHTML = cfg.lines.map((l, i) => `<div class="an-line" data-i="${i}">
        <span class="n mono">${i + 1}</span>
        <input type="text" aria-label="${esc(t('lineN', { n: i + 1 }))} · ${esc(t('f_ar'))}" dir="rtl" lang="ar" data-l="ar" maxlength="48" value="${esc(l.ar)}">
        <input type="text" aria-label="${esc(t('lineN', { n: i + 1 }))} · ${esc(t('f_en'))}" dir="ltr" lang="en" data-l="en" maxlength="48" value="${esc(l.en)}">
        <button type="button" class="icon-btn" data-rm aria-label="${esc(t('removeLine'))} ${i + 1}"${cfg.lines.length <= 1 ? ' disabled' : ''}>×</button>
      </div>`).join('');
    el.querySelector('[data-addline]').disabled = cfg.lines.length >= MAX_LINES;
  }
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => {
    const i = e.target;
    if (i.dataset.k) set(i.dataset.k, i.dataset.k === 'link' ? i.value.trim() : i.value);
    else if (i.dataset.l) cfg.lines[+i.closest('.an-line').dataset.i][i.dataset.l] = i.value;
    else if (i.id === 'an-hold') { cfg.hold = +i.value; form.querySelector('#an-hold-out').textContent = t('holdS', { n: num(cfg.hold) }); }
    else return;
    changed();
  });
  form.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { cfg.lines.splice(+rm.closest('.an-line').dataset.i, 1); drawLines(); changed(); }
    if (e.target.closest('[data-addline]')) {
      if (cfg.lines.length < MAX_LINES) { cfg.lines.push({ ar: '', en: '' }); drawLines(); changed(); linesEl.querySelector('.an-line:last-child input').focus(); }
    }
  });
  const sel = form.querySelector('#an-ev');
  if (sel) sel.addEventListener('change', () => {
    const ev = events.find((x) => x.id === sel.value);
    cfg = ev ? fromEvent(ev) : { ...clone(BLANK), header: cfg.header };
    fill(); changed();
  });
  function linkCheck() {
    const err = form.querySelector('#an-link').parentElement.querySelector('.err');
    err.textContent = cfg.link && !/^https?:\/\//i.test(cfg.link) ? t('linkInvalid') : '';
  }
  function changed() { store(cfg); linkCheck(); clearTimeout(timer); timer = setTimeout(rebuild, 200); }

  // ----- preview -----
  function rebuild() {
    const frac = film ? time / film.duration : 0;
    film = window.MemarWorkshop.create(forFilm(cfg));
    time = Math.min(film.duration, frac * film.duration);
    dirty = true;
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.min(1920, Math.round(cv.clientWidth * dpr))), h = Math.round(w * 9 / 16);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw() {
    if (!film) return;
    size();
    film.render(cx, time, cv.width, cv.height);
    scrub.value = String(Math.round((time / film.duration) * 1000));
    timeEl.textContent = `${time.toFixed(1)} / ${film.duration.toFixed(1)} s`;
  }
  function setPlaying(p) {
    playing = p; last = null;
    playBtn.innerHTML = p ? `<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true" fill="currentColor"><rect x="2" y="1" width="3.5" height="12"/><rect x="8.5" y="1" width="3.5" height="12"/></svg>${esc(t('pause'))}` : `${play(14)}${esc(t('play'))}`;
  }
  function tick(now) {
    if (!alive) return;
    if (playing && film && !exporting) {
      if (last !== null) { time = (time + (now - last) / 1000) % film.duration; }
      last = now; dirty = true;
    }
    if (dirty && !exporting) { draw(); dirty = false; }
    raf = requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  el.querySelector('[data-replay]').addEventListener('click', () => { time = 0; setPlaying(true); dirty = true; });
  scrub.addEventListener('input', () => { setPlaying(false); if (film) time = (+scrub.value / 1000) * film.duration; dirty = true; });
  const onResize = () => { dirty = true; };
  addEventListener('resize', onResize);

  // ----- export -----
  const canEncode = () => typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function' && window.Mp4Muxer;
  async function pickCodec() {
    const list = [['avc1.640033', 'avc'], ['avc1.4d0033', 'avc'], ['avc1.640034', 'avc'], ['vp09.00.51.08', 'vp9']];
    for (const [codec, mux] of list) {
      try { const r = await VideoEncoder.isConfigSupported({ codec, width: EW, height: EH, bitrate: BITRATE, framerate: FPS }); if (r && r.supported) return { codec, mux }; } catch (e) { /* try the next */ }
    }
    return null;
  }
  async function encode(onProgress) {
    const codec = await pickCodec();
    if (!codec) throw new Error('codec');
    const c = document.createElement('canvas'); c.width = EW; c.height = EH;
    const g = c.getContext('2d');
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: codec.mux, width: EW, height: EH, frameRate: FPS }, fastStart: 'in-memory' });
    let failure = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
    const conf = { codec: codec.codec, width: EW, height: EH, bitrate: BITRATE, framerate: FPS, bitrateMode: 'variable' };
    if (codec.mux === 'avc') conf.avc = { format: 'avc' };
    enc.configure(conf);
    const f = window.MemarWorkshop.create(forFilm(cfg)), n = Math.round(f.duration * FPS);
    for (let i = 0; i < n; i++) {   // n frames, not n + 1: the last frame would repeat the first when it loops
      if (failure) throw failure;
      if (!alive) throw new Error('left');
      f.render(g, i / FPS, EW, EH);
      const frame = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
      frame.close();
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
      if (i % 15 === 0) { onProgress(i / n); await new Promise((r) => setTimeout(r, 0)); }
    }
    await enc.flush();
    if (failure) throw failure;
    muxer.finalize();
    onProgress(1);
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), mux: codec.mux };
  }
  exportBtn.addEventListener('click', async () => {
    if (exporting) return;
    if (!canEncode()) { status.textContent = t('exportFail'); status.className = 'an-status warn'; return; }
    exporting = true; exportBtn.disabled = true; bar.style.width = '0%';
    const slug = (cfg.header.en || 'announcement').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'announcement';
    const name = `${slug}.mp4`;
    try {
      const { blob, mux } = await encode((p) => { bar.style.width = (p * 100).toFixed(1) + '%'; status.textContent = t('exporting', { p: Math.round(p * 100) }); status.className = 'an-status'; });
      await saveBlob(blob, name);
      status.textContent = t('exported', { f: name }) + (mux === 'vp9' ? ' ' + t('vp9Note') : '');
      const firstLine = cfg.lines.find((l) => l.ar || l.en) || cfg.header;
      ctx.logExport({ ar: firstLine.ar || firstLine.en, en: firstLine.en || firstLine.ar });
    } catch (e) {
      console.error(e);
      if (alive) { status.textContent = e && e.message === 'codec' ? t('exportFail') : t('errSave'); status.className = 'an-status warn'; }
    }
    exporting = false; exportBtn.disabled = false; last = null; dirty = true;
  });

  fill();
  linkCheck();
  setPlaying(playing);
  // the film measures its text, so wait for the fonts before the first build
  const [fe, fa] = filmFonts().names;
  try { await Promise.race([Promise.all([document.fonts.load(`500 40px "${fe}"`, 'Workshop'), document.fonts.load(`500 40px "${fa}"`, 'ورشة')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* draw with what's there */ }
  if (!alive) return null;
  rebuild();
  raf = requestAnimationFrame(tick);

  return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); removeEventListener('resize', onResize); };
}
