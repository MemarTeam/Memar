// Members' area: sign-in, the menu, the content manager and the board's pages.
// Each page is a function in ROUTES below; the tools live in announce.js and tools.js.
import { lang, other, applyLang, setLang, L, t, shortStamp, num, day, month, time, weekday } from './i18n.js';
import { backend, isLive, clearCache, safePhoto, SECTIONS, CONTENT, EVENT_TYPES, TAG_COLORS, splitEvents, byNumberDesc, byOrder, eventDate, safeUrl, initialsOf, SITE_OFFSET, SITE_TZ } from './data.js';
import { esc, logo, tri, play, themeButton, bindTheme } from './ui.js';
import { DEFAULT_STORY, withDefaults } from './story.js';
import * as announce from './announce.js';
import * as tools from './tools.js';

const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const S = { be: null, user: null, me: null, members: [], linkState: null };
const THEME_LABELS = { dark: t('darkMode'), light: t('lightMode') };
let teardown = null;
let firstRoute = true;
let routeToken = 0;

// ---------- small helpers ----------
export function can(section) {
  const m = S.me;
  if (!m) return false;
  if (section === 'settings' || section === 'access' || section === 'log') return !!m.isBoard;
  return !!(m.isBoard || (m.perms && m.perms[section]));
}
export function tagHtml(m, size = '') {
  if (!m) return '';
  const [c, tint] = TAG_COLORS[m.color] || TAG_COLORS.blue;
  return `<span class="m-tag ${size}" style="--c:${c};--t:${tint}"><span class="dot">${esc(m.initials || initialsOf(L(m.name)))}</span><span class="nm">${esc(L(m.name))}</span></span>`;
}
const memberById = (id) => S.members.find((m) => m.id === id);

export function toast(msg, warn) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast' + (warn ? ' warn' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, warn ? 6000 : 3200);
}
// what to tell someone when sign-in fails, by Firebase's error code
function signInError(e) {
  const c = String((e && e.code) || '');
  if (/popup-blocked|operation-not-supported|web-storage-unsupported|internal-error/.test(c)) return t('popupBlocked');
  if (/unauthorized-domain|unauthorized-continue-uri|invalid-continue-uri/.test(c)) return t('unauthorizedDomain');
  if (/quota-exceeded|too-many-requests/.test(c)) return t('linkQuota');
  if (/invalid-action-code|expired-action-code/.test(c)) return t('linkExpired');
  return t('errSignIn');
}
function errText(e) {
  console.error(e);
  const s = String((e && (e.code || e.message)) || '');
  return /permission/i.test(s) ? t('noPerm') : t('errSave');
}

function confirmBox(title, text, okLabel) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'm-dialog m-confirm';
    d.innerHTML = `<form method="dialog">
        <h2>${esc(title)}</h2><p>${esc(text)}</p>
        <div class="m-dialog-foot"><button class="btn btn-sm btn-danger" value="ok">${esc(okLabel || t('del'))}</button><button class="btn btn-sm btn-outline" value="cancel">${esc(t('cancel'))}</button></div>
      </form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok'); d.remove(); });
    d.showModal();
    d.querySelector('[value="cancel"]').focus();
  });
}

async function once(form, fn) {
  if (form.dataset.busy) return;
  form.dataset.busy = '1';
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  try { await fn(); } finally { delete form.dataset.busy; if (btn) btn.disabled = false; }
}

const head = (title, text, actions = '') => `<div class="m-head">
    <div><h1 tabindex="-1">${title}</h1>${text ? `<p>${text}</p>` : ''}</div>
    ${actions ? `<div class="m-head-actions">${actions}</div>` : ''}
  </div>`;

// a line in the edit history, written with every change
function entry(action, section, title) { return { action, section, title: title || null }; }

// ---------- screens before the members' area ----------
function frame(inner) {
  return `<main class="m-gate">
      <div class="m-gate-card">
        <div class="m-gate-side">
          <a class="m-gate-logo" href="../index.html">${logo('#F3F1EB', '#5996D9', lang === 'ar' ? 'معمار — الموقع' : 'Memar — website')}</a>
          <div class="mono">${esc(t('mArea'))}</div>
          <div class="m-gate-motif" aria-hidden="true"><span style="width:96px;background:var(--blue)"></span><span style="width:60px;border:1.5px solid rgba(89,150,217,.6)"></span>${tri()}</div>
        </div>
        <div class="m-gate-main">${inner}</div>
      </div>
      <div class="m-gate-links"><a href="../index.html">${esc(t('back'))}</a><a href="?lang=${other}" data-lang lang="${other}">${esc(t('langFull'))}</a>${themeButton('linklike m-theme-link', THEME_LABELS, true)}</div>
    </main>`;
}
function bindLang(root = document) {
  $$('[data-lang]', root).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); setLang(other); }));
  bindTheme(root, THEME_LABELS);
}

function renderLoading() { app.innerHTML = `<div class="m-loading" role="status"><span class="spin" aria-hidden="true"></span>${esc(t('loading'))}</div>`; }

function renderSignIn() {
  const demo = S.be.kind === 'demo';
  const launch = demo && S.be.state === 'launch';
  app.innerHTML = frame(`
    <h1>${esc(t('signInTitle'))}</h1>
    <p class="muted">${esc(demo ? t('demoSignInNote') : t('signInText'))}</p>
    ${demo ? `<div class="m-gate-btns">
        <button type="button" class="btn btn-primary" data-demo="m1">${esc(t('demoBoard'))}${tri()}</button>
        ${launch ? '' : `<button type="button" class="btn btn-outline" data-demo="m2">${esc(t('demoMember'))}</button>`}
      </div>` : `<div class="m-gate-btns">
        <button type="button" class="btn btn-primary" id="g-btn"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#F3F1EB" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#F3F1EB" opacity=".85" d="M9 18c2.4 0 4.5-.8 5.9-2.2l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18z"/><path fill="#F3F1EB" opacity=".7" d="M4 10.8a5.4 5.4 0 0 1 0-3.5V5H1a9 9 0 0 0 0 8.1l3-2.3z"/><path fill="#F3F1EB" opacity=".55" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.4A9 9 0 0 0 1 5l3 2.3c.7-2.1 2.7-3.7 5-3.7z"/></svg>${esc(t('google'))}</button>
      </div>
      <div class="m-or"><span>${esc(t('or'))}</span></div>
      <form class="m-link-form" novalidate>
        <div class="field"><label for="em">${esc(t('emailLabel'))}</label><input id="em" type="email" dir="ltr" autocomplete="email" required></div>
        <button class="btn btn-outline" type="submit">${esc(t('sendLink'))}</button>
        <p class="m-msg" aria-live="polite"></p>
      </form>`}
  `);
  bindLang();
  $$('[data-demo]').forEach((b) => b.addEventListener('click', () => { renderLoading(); S.be.demoSignIn(b.dataset.demo); }));
  const g = $('#g-btn');
  if (g) g.addEventListener('click', async () => {
    g.disabled = true;
    try { await S.be.signInGoogle(); } catch (e) { if (!/popup-closed|cancelled/.test(e.code || '')) toast(signInError(e), true); console.error(e); }
    g.disabled = false;
  });
  const f = $('.m-link-form');
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('#em').value.trim(), msg = $('.m-msg', f);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg.textContent = t('emailInvalid'); msg.className = 'm-msg warn'; return; }
    f.querySelector('button').disabled = true;
    try { await S.be.sendLink(em); msg.textContent = t('linkSent', { e: em }); msg.className = 'm-msg ok'; }
    catch (err) { console.error(err); msg.textContent = signInError(err); msg.className = 'm-msg warn'; }
    f.querySelector('button').disabled = false;
  });
}

function renderNeedEmail() {
  app.innerHTML = frame(`
    <h1>${esc(t('confirmEmail'))}</h1>
    <p class="muted">${esc(t('needEmailText'))}</p>
    <form class="m-link-form" novalidate>
      <div class="field"><label for="em2">${esc(t('emailLabel'))}</label><input id="em2" type="email" dir="ltr" autocomplete="email" required></div>
      <button class="btn btn-primary" type="submit">${esc(t('finish'))}${tri()}</button>
      <p class="m-msg" aria-live="polite"></p>
    </form>`);
  bindLang();
  $('.m-link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { S.linkState = await S.be.completeLink($('#em2').value.trim()); }
    catch (err) { console.error(err); const m = $('.m-msg'); m.textContent = signInError(err); m.className = 'm-msg warn'; }
  });
}

function renderNotInvited(user) {
  app.innerHTML = frame(`
    <h1>${esc(t('notInvited'))}</h1>
    <p class="muted">${esc(t('notInvitedText', { e: user.email || '' }))}</p>
    <div class="m-gate-btns"><button type="button" class="btn btn-outline" id="so">${esc(t('signOut'))}</button></div>`);
  bindLang();
  $('#so').addEventListener('click', () => S.be.signOut());
}

// ---------- the shell ----------
function groups() {
  const g = [{ id: 'home', items: [['overview', t('overview')]] }];
  if (can('tools')) g.push({ id: 'tools', label: t('gTools'), items: [['tools/announce', t('announce')], ['tools/qr', t('qr')]] });
  const content = CONTENT.filter(can).map((c) => ['content/' + c, t(c)]);
  if (content.length) g.push({ id: 'content', label: t('gContent'), items: content });
  g.push({ id: 'resources', label: t('gResources'), items: [['resources/brand', t('brand')]] });
  if (S.me.isBoard) g.push({ id: 'admin', label: t('gAdmin'), items: [['admin/log', t('log')], ['admin/access', t('access')], ['admin/settings', t('settings')], ['admin/story', t('story')], ['admin/look', t('look')]] });
  return g;
}
function renderShell() {
  const gs = groups();
  const link = (path, label) => `<a href="#${path}" data-path="${path}">${tri()}<span>${esc(label)}</span></a>`;
  const tabs = [['overview', t('overview')]];
  if (gs.find((g) => g.id === 'tools')) tabs.push(['g/tools', t('gTools')]);
  if (gs.find((g) => g.id === 'content')) tabs.push(['g/content', t('gContent')]);
  tabs.push(['g/more', S.me.isBoard ? (lang === 'ar' ? 'الإدارة' : 'Admin') : t('more')]);
  app.innerHTML = `<div class="m-shell">
      <aside class="m-side" aria-label="${esc(t('mArea'))}">
        <div class="m-brand">
          <a href="../index.html">${logo('#F3F1EB', '#5996D9', lang === 'ar' ? 'معمار — الموقع' : 'Memar — website')}</a>
          <span class="mono">${esc(t('mArea'))}</span>
        </div>
        <a class="m-me" href="#profile" data-path="profile">${tagHtml(S.me, 'lg')}${S.me.isBoard ? `<span class="m-board">${esc(t('board'))}</span>` : ''}</a>
        <nav class="m-nav" aria-label="${esc(t('navSections'))}">${gs.map((g) => `<div class="m-group">${g.label ? `<div class="m-glabel mono">${esc(g.label)}</div>` : ''}${g.items.map(([p, l]) => link(p, l)).join('')}</div>`).join('')}</nav>
        <div class="m-side-foot">
          <a href="../index.html">${esc(t('back'))}</a>
          <a href="?lang=${other}" data-lang lang="${other}">${esc(t('langFull'))}</a>
          ${themeButton('linklike m-theme-link', THEME_LABELS, true)}
          <button type="button" class="linklike" data-signout>${esc(t('signOut'))}</button>
        </div>
      </aside>
      <header class="m-top">
        <a href="#overview" class="m-top-brand">${logo('#F3F1EB', '#5996D9', 'معمار')}<span class="mono">${esc(t('mArea'))}</span></a>
        <a class="m-me" href="#profile" data-path="profile">${tagHtml(S.me)}${S.me.isBoard ? `<span class="m-board">${esc(t('board'))}</span>` : ''}</a>
      </header>
      <main class="m-main" id="m-main"></main>
      <nav class="m-bottom" aria-label="${esc(t('navQuick'))}" style="--n:${tabs.length}">${tabs.map(([p, l]) => `<a href="#${p}" data-tab="${p}">${tri()}<span>${esc(l)}</span></a>`).join('')}</nav>
    </div>`;
  bindLang();
  $$('[data-signout]').forEach((b) => b.addEventListener('click', () => S.be.signOut()));
}

// which bottom tab a page belongs to
function tabOf(path) {
  if (path === 'overview') return 'overview';
  if (path.startsWith('tools/') || path === 'g/tools') return 'g/tools';
  if (path.startsWith('content/') || path === 'g/content') return 'g/content';
  return 'g/more';
}

async function route() {
  if (!S.me || !$('#m-main')) return;
  const raw = location.hash.replace(/^#/, '') || 'overview';
  const [path0, q] = raw.split('?');
  const params = new URLSearchParams(q || '');
  let path = ROUTES[path0] ? path0 : 'overview';
  if (ROUTES[path].need && !can(ROUTES[path].need)) path = 'overview';
  $$('[data-path]').forEach((a) => (a.dataset.path === path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $$('[data-tab]').forEach((a) => (a.dataset.tab === tabOf(path) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (teardown) { try { teardown(); } catch (e) { /* ignore */ } teardown = null; }
  const main = $('#m-main');
  main.innerHTML = `<div class="m-loading inline" role="status"><span class="spin" aria-hidden="true"></span>${esc(t('loading'))}</div>`;
  const token = ++routeToken;
  try {
    const td = (await ROUTES[path].render(main, params)) || null;
    if (token !== routeToken) { if (td) td(); return; }   // someone moved on while this page was loading
    teardown = td;
  } catch (e) {
    console.error(e);
    if (token === routeToken) main.innerHTML = head(esc(t('errLoad')), '');
  }
  document.title = `${ROUTES[path].title ? ROUTES[path].title() + ' · ' : ''}${t('mArea')} · ${lang === 'ar' ? 'معمار' : 'Memar'}`;
  if (!firstRoute) { const h = $('#m-main h1'); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  firstRoute = false;
}

// ---------- overview ----------
async function overview(main) {
  const [events, issues, episodes] = await Promise.all([S.be.list('events'), S.be.list('issues'), S.be.list('episodes')]);
  const { upcoming } = splitEvents(events);
  const next = upcoming[0];
  const quick = [];
  if (can('events')) quick.push(`<a class="btn btn-primary btn-sm" href="#content/events?new=1">${esc(t('addEvent'))}${tri()}</a>`);
  if (can('tools')) quick.push(`<a class="btn btn-outline btn-sm" href="#tools/announce">${esc(t('announce'))}</a>`);
  if (can('issues')) quick.push(`<a class="btn btn-outline btn-sm" href="#content/issues?new=1">${esc(t('addIssue'))}</a>`);
  if (can('episodes')) quick.push(`<a class="btn btn-outline btn-sm" href="#content/episodes?new=1">${esc(t('addEpisode'))}</a>`);
  const stat = (n, label, href, hidden) => `<a class="m-stat" href="${href}"><b>${esc(num(n))}</b><span>${esc(label)}</span>${hidden ? `<em>${esc(t('hidden'))}</em>` : ''}</a>`;
  let html = head(esc(t('hello', { n: L(S.me.name) })), esc(t('helloText')));
  html += `<div class="m-cards">`;
  if (quick.length) html += `<section class="m-card"><h2>${esc(t('shortcuts'))}</h2><div class="m-btnrow">${quick.join('')}</div></section>`;
  html += `<section class="m-card"><h2>${esc(t('onSite'))}</h2><div class="m-stats">
      ${stat(upcoming.length, t('n_upcoming'), can('events') ? '#content/events' : '../events.html', !events.length)}
      ${stat(issues.length, t('n_issues'), can('issues') ? '#content/issues' : '../magazine.html', !issues.length)}
      ${stat(episodes.length, t('n_episodes'), can('episodes') ? '#content/episodes' : '../podcast.html', !episodes.length)}
    </div></section>`;
  if (next) {
    const d = eventDate(next);
    html += `<section class="m-card m-next"><h2>${esc(t('nextEvent'))}</h2>
        <div class="m-next-row"><span class="m-date"><b>${esc(day(d))}</b><span>${esc(month(d))}</span></span>
        <div><b>${esc(L(next.title))}</b><span class="muted">${esc(weekday(d))} · ${esc(time(d))}${L(next.place) ? ' · ' + esc(L(next.place)) : ''}</span></div></div>
        ${can('tools') ? `<a class="btn btn-outline btn-sm" href="#tools/announce?event=${esc(next.id)}">${esc(t('makeVideo'))}</a>` : ''}
      </section>`;
  }
  if (S.me.isBoard) {
    let log = [];
    try { log = (await S.be.log(6)).slice(0, 6); } catch (e) { console.error(e); }
    html += `<section class="m-card m-wide"><div class="m-card-head"><h2>${esc(t('recent'))}</h2>${log.length ? `<a href="#admin/log" class="link-line">${esc(t('seeAll'))}</a>` : ''}</div>
      ${log.length ? `<div class="m-log compact">${log.map(logRow).join('')}</div>` : emptyLog()}</section>`;
  }
  html += `</div>`;
  main.innerHTML = html;
}

// ---------- content manager ----------
const toLocalParts = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return { date: '', time: '' };
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const tm = new Intl.DateTimeFormat('en-GB', { timeZone: SITE_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return { date, time: tm };
};
const pad2 = (n) => String(n || '').padStart(2, '0');

const FORMS = {
  events: [
    { k: 'type', kind: 'choice', label: 'f_type', options: () => EVENT_TYPES.map((v) => [v, t(v)]), req: true },
    { k: 'title', kind: 'pair', label: 'f_title', req: true },
    { k: 'date', kind: 'date', label: 'f_date', req: true, half: true },
    { k: 'time', kind: 'time', label: 'f_time', req: true, half: true },
    { k: 'place', kind: 'pair', label: 'f_place' },
    { k: 'guest', kind: 'pair', label: 'f_guest', hint: lang === 'ar' ? 'مثل: مع معماري ضيف' : 'For example: with a guest architect' },
    { k: 'summary', kind: 'pairArea', label: 'f_summary' },
    { k: 'registerUrl', kind: 'url', label: 'f_register' }
  ],
  issues: [
    { k: 'number', kind: 'number', label: 'f_number', req: true, half: true },
    { k: 'month', kind: 'month', label: 'f_month', req: true, half: true },
    { k: 'title', kind: 'pair', label: 'f_title' },
    { k: 'summary', kind: 'pairArea', label: 'f_summary' },
    { k: 'pdfUrl', kind: 'url', label: 'f_pdf', req: true },
    { k: 'coverUrl', kind: 'url', label: 'f_cover' },
    { k: 'coverColor', kind: 'choice', label: 'f_coverColor', options: () => [['night', t('c_night')], ['blue', t('c_blue')], ['sand', t('c_sand')]] }
  ],
  episodes: [
    { k: 'number', kind: 'number', label: 'f_epNumber', req: true, half: true },
    { k: 'date', kind: 'date', label: 'f_date', half: true },
    { k: 'title', kind: 'pair', label: 'f_title', req: true },
    { k: 'guest', kind: 'pair', label: 'f_guest' },
    { k: 'url', kind: 'url', label: 'f_url', req: true },
    { k: 'duration', kind: 'text', label: 'f_duration', ltr: true, placeholder: '32:10', half: true }
  ],
  team: [
    { k: 'name', kind: 'pair', label: 'f_name', req: true },
    { k: 'role', kind: 'pair', label: 'f_role' },
    { k: 'order', kind: 'number', label: 'f_order', half: true },
    { k: 'initials', kind: 'text', label: 'f_initials', half: true, hint: lang === 'ar' ? 'تُستخدم بدل الصورة. اتركها فارغة لتؤخذ من الاسم.' : 'Used instead of a photo. Leave empty to take them from the name.' },
    { k: 'photo', kind: 'photo', label: 'f_photo', hint: t('photoHint') }
  ]
};

function fieldHtml(f, v) {
  const id = 'f-' + f.k;
  const lab = esc(t(f.label)) + (f.req ? ' <span class="req" aria-hidden="true">*</span>' : '');
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  const val = (x) => esc(x == null ? '' : x);
  switch (f.kind) {
    case 'pair':
    case 'pairArea': {
      const tag = f.kind === 'pair' ? 'input' : 'textarea';
      const one = (lg) => {
        const vv = v && v[lg] ? v[lg] : '';
        const attrs = `id="${id}-${lg}" name="${f.k}.${lg}" dir="${lg === 'ar' ? 'rtl' : 'ltr'}" lang="${lg}"`;
        const inner = tag === 'input' ? `<input type="text" ${attrs} value="${val(vv)}">` : `<textarea ${attrs} rows="${f.rows || 3}">${val(vv)}</textarea>`;
        return `<div class="field"><label for="${id}-${lg}">${esc(t(lg === 'ar' ? 'f_ar' : 'f_en'))}</label>${inner}</div>`;
      };
      return `<fieldset class="m-fs" data-k="${f.k}"${f.req ? ' data-req' : ''}><legend>${lab}</legend>${hint}<div class="pair">${one('ar')}${one('en')}</div><span class="err" aria-live="polite"></span></fieldset>`;
    }
    case 'photo': {
      const cur = safePhoto(v);
      return `<div class="field m-photo" data-k="${f.k}">
          <span class="m-photo-label" id="${id}-label">${lab}</span>${hint}
          <div class="m-photo-row">
            <div class="m-photo-stage${cur ? '' : ' empty'}">
              <canvas width="480" height="480" tabindex="0" role="img" aria-labelledby="${id}-label" aria-describedby="${id}-help"></canvas>
              <span class="m-photo-empty" aria-hidden="true">${esc(t('noPhoto'))}</span>
            </div>
            <div class="m-photo-ctrls">
              <label class="btn btn-outline btn-sm m-file"><span>${esc(t(cur ? 'changePhoto' : 'choosePhoto'))}</span><input type="file" accept="image/*"></label>
              <div class="m-zoom"><label for="${id}-zoom">${esc(t('zoom'))}</label><input type="range" id="${id}-zoom" min="1" max="3" step="0.01" value="1"${cur ? '' : ' disabled'}></div>
              <p class="hint" id="${id}-help">${esc(t('dragHint'))}</p>
              <button type="button" class="linklike" data-photo-remove${cur ? '' : ' hidden'}>${esc(t('removePhoto'))}</button>
            </div>
          </div>
          <input type="hidden" name="${f.k}" value="${esc(cur)}">
          <span class="err" aria-live="polite"></span></div>`;
    }
    case 'choice': {
      const opts = f.options();
      const cur = v || opts[0][0];
      return `<fieldset class="m-fs" data-k="${f.k}"><legend>${lab}</legend><div class="m-choices">${opts.map(([o, l]) => `<label class="m-choice"><input type="radio" name="${f.k}" value="${esc(o)}"${o === cur ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>`;
    }
    default: {
      const type = { url: 'url', number: 'number', date: 'date', time: 'time', month: 'month', text: 'text' }[f.kind];
      const ltr = f.kind === 'url' || f.ltr || f.kind === 'number';
      return `<div class="field${f.half ? ' half' : ''}" data-k="${f.k}"${f.req ? ' data-req' : ''}><label for="${id}">${lab}</label>${hint}
          <input id="${id}" name="${f.k}" type="${type}"${ltr ? ' dir="ltr"' : ''}${f.kind === 'url' ? ' placeholder="https://"' : f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${f.kind === 'number' ? ' min="0" step="1" inputmode="numeric"' : ''} value="${val(v)}">
          <span class="err" aria-live="polite"></span></div>`;
    }
  }
}

// read and check a form; returns null and marks the fields when something is missing
function readForm(form, fields) {
  const fd = new FormData(form);
  const out = {};
  let ok = true;
  $$('.err', form).forEach((e) => { e.textContent = ''; });
  $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid'));
  const fail = (k, msg) => {
    ok = false;
    const box = form.querySelector(`[data-k="${k}"]`);
    if (box) { box.querySelector('.err').textContent = msg; $$('input,textarea', box).forEach((i) => i.setAttribute('aria-invalid', 'true')); }
  };
  for (const f of fields) {
    if (f.kind === 'photo') { out[f.k] = safePhoto(fd.get(f.k)); continue; }
    if (f.kind === 'pair' || f.kind === 'pairArea') {
      const v = { ar: String(fd.get(f.k + '.ar') || '').trim(), en: String(fd.get(f.k + '.en') || '').trim() };
      if (f.req && !v.ar && !v.en) fail(f.k, t('needOne'));
      out[f.k] = v;
    } else {
      let v = String(fd.get(f.k) || '').trim();
      if (f.req && !v) { fail(f.k, t('required')); continue; }
      if (f.kind === 'url' && v && !/^https?:\/\//i.test(v)) { fail(f.k, t('linkInvalid')); continue; }
      if (f.kind === 'number') v = v === '' ? null : Number(v);
      out[f.k] = v;
    }
  }
  if (!ok) { const first = form.querySelector('[aria-invalid]'); if (first) first.focus(); return null; }
  return out;
}

// how each section's items are listed and described
const SECTION = {
  events: {
    add: 'addEvent', empty: ['emptyEvents', 'emptyEventsText', 'addFirstEvent'],
    sort: (list) => { const { upcoming, past } = splitEvents(list); return [...upcoming, ...past]; },
    title: (x) => x.title,
    lead: (x) => { const d = eventDate(x); return d ? `<span class="m-date${splitEvents([x]).upcoming.length ? ' up' : ''}"><b>${esc(day(d))}</b><span>${esc(month(d))}</span></span>` : ''; },
    sub: (x) => { const d = eventDate(x); return [t(x.type), d ? `${weekday(d)} · ${time(d)}` : '', L(x.place)].filter(Boolean).join(' · '); },
    toForm: (x) => ({ ...x, ...toLocalParts(x.start) }),
    fromForm: (v) => { const { date, time: tm, ...rest } = v; return { ...rest, start: `${date}T${tm}:00${SITE_OFFSET}` }; },
    extra: (x) => (can('tools') && splitEvents([x]).upcoming.length ? `<a class="btn btn-sm btn-outline" href="#tools/announce?event=${esc(x.id)}">${esc(t('makeVideo'))}</a>` : '')
  },
  issues: {
    add: 'addIssue', empty: ['emptyIssues', 'emptyIssuesText', 'addFirstIssue'],
    sort: (l) => [...l].sort(byNumberDesc),
    title: (x) => ({ ar: `العدد ${num(x.number, 2).replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[c])}${x.title && x.title.ar ? ' · ' + x.title.ar : ''}`, en: `Issue ${pad2(x.number)}${x.title && x.title.en ? ' · ' + x.title.en : ''}` }),
    lead: (x) => `<span class="m-cover c-${esc(x.coverColor || 'night')}">${esc(pad2(x.number))}</span>`,
    sub: (x) => x.month || '',
    toForm: (x) => x, fromForm: (v) => ({ ...v, coverColor: v.coverColor || 'night' })
  },
  episodes: {
    add: 'addEpisode', empty: ['emptyEps', 'emptyEpsText', 'addFirstEp'],
    sort: (l) => [...l].sort(byNumberDesc),
    title: (x) => x.title,
    lead: (x) => `<span class="m-ep">${play(14, '#F3F1EB')}</span>`,
    sub: (x) => [`EP ${pad2(x.number)}`, x.duration, L(x.guest)].filter(Boolean).join(' · '),
    toForm: (x) => x, fromForm: (v) => v
  },
  team: {
    add: 'addPerson', empty: ['emptyTeam', 'emptyTeamText', 'addFirstPerson'],
    sort: (l) => [...l].sort(byOrder),
    title: (x) => x.name,
    lead: (x) => (safePhoto(x.photo) ? `<img class="m-avatar" src="${esc(safePhoto(x.photo))}" alt="" width="48" height="48">` : `<span class="m-avatar">${esc(x.initials || initialsOf(L(x.name)))}</span>`),
    sub: (x) => L(x.role),
    toForm: (x) => x, fromForm: (v) => v
  }
};

// little drawings for the empty lists, from the approved empty cards
const EMPTY_ART = {
  events: '<div class="m-eart"><div class="a" style="width:54px;background:var(--blue-tint)"></div><div class="b"><i></i><i style="width:60%"></i></div></div>',
  issues: '<div class="m-eart books"><div style="background:var(--night)"></div><div class="dash"></div></div>',
  episodes: '<div class="m-eart pods"><div class="ring"></div><i></i></div>',
  team: '<div class="m-eart people"><span style="background:var(--blue)"></span><span class="dash"></span><span class="dash faint"></span></div>'
};

function contentPage(col) {
  return async (main, params) => {
    const cfg = SECTION[col];
    const items = cfg.sort(await S.be.list(col));
    const add = `<button type="button" class="btn btn-primary btn-sm" data-add>${esc(t(cfg.add))}${tri()}</button>`;
    let html = head(esc(t(col === 'events' ? 'events' : col)), '', items.length ? add : '');
    if (!items.length) {
      html += `<section class="m-empty">${EMPTY_ART[col]}<h2>${esc(t(cfg.empty[0]))}</h2><p>${esc(t(cfg.empty[1]))}</p>
          <button type="button" class="btn btn-primary" data-add>${esc(t(cfg.empty[2]))}${tri()}</button></section>`;
    } else {
      html += `<div class="m-list">${items.map((x) => {
        const who = S.me.isBoard ? memberById(x.updatedBy) : null;
        const at = x.updatedAt && (x.updatedAt.toDate ? x.updatedAt.toDate() : new Date(x.updatedAt));
        return `<article class="m-row" data-id="${esc(x.id)}">
            <div class="lead">${cfg.lead(x)}</div>
            <div class="main"><b>${esc(L(cfg.title(x)))}</b><span class="sub">${esc(cfg.sub(x))}</span></div>
            ${who ? `<div class="who" title="${esc(t('lastEdit'))}">${tagHtml(who, 'sm')}${at && !isNaN(at) ? `<span class="mono">${esc(shortStamp(at))}</span>` : ''}</div>` : ''}
            <div class="acts">${cfg.extra ? cfg.extra(x) : ''}
              <button type="button" class="btn btn-sm btn-outline" data-edit>${esc(t('edit'))}</button>
              <button type="button" class="icon-btn" data-del aria-label="${esc(t('del'))} ${esc(L(cfg.title(x)))}"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"/></svg></button>
            </div>
          </article>`;
      }).join('')}</div>`;
    }
    main.innerHTML = html;
    $$('[data-add]', main).forEach((b) => b.addEventListener('click', () => openForm(col, null)));
    $$('[data-edit]', main).forEach((b) => b.addEventListener('click', () => openForm(col, items.find((x) => x.id === b.closest('.m-row').dataset.id))));
    $$('[data-del]', main).forEach((b) => b.addEventListener('click', async () => {
      const x = items.find((i) => i.id === b.closest('.m-row').dataset.id);
      const title = cfg.title(x);
      if (!(await confirmBox(t('confirmDel', { x: L(title) }), t('confirmDelText')))) return;
      try { await S.be.remove(col, x.id, entry('delete', col, title)); toast(t('saved')); route(); } catch (e) { toast(errText(e), true); }
    }));
    if (params.get('new') === '1') { history.replaceState(null, '', '#content/' + col); openForm(col, null); }
  };
}

function openForm(col, item) {
  const cfg = SECTION[col], fields = FORMS[col];
  const v = item ? cfg.toForm(item) : {};
  const d = document.createElement('dialog');
  d.className = 'm-dialog m-form-dialog';
  d.setAttribute('aria-labelledby', 'dlg-title');
  d.innerHTML = `<form novalidate>
      <div class="m-dialog-head"><h2 id="dlg-title">${esc(item ? t('edit') + ' · ' + L(cfg.title(item)) : t(cfg.add))}</h2>
        <button type="button" class="icon-btn" data-close aria-label="${esc(t('close'))}"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2 L14 14 M14 2 L2 14"/></svg></button></div>
      <div class="m-dialog-body"><div class="m-fields">${fields.map((f) => fieldHtml(f, v[f.k])).join('')}</div></div>
      <div class="m-dialog-foot">
        <button type="submit" class="btn btn-primary btn-sm">${esc(t('save'))}${tri()}</button>
        <button type="button" class="btn btn-outline btn-sm" data-close>${esc(t('cancel'))}</button>
        <span class="m-sig">${tagHtml(S.me, 'sm')}<span>${esc(t('sigNote'))}</span></span>
      </div>
    </form>`;
  document.body.appendChild(d);
  $$('.m-photo', d).forEach(setupPhoto);
  const close = () => { d.close(); };
  d.addEventListener('close', () => d.remove());
  $$('[data-close]', d).forEach((b) => b.addEventListener('click', close));
  const form = $('form', d);
  form.addEventListener('submit', (e) => { e.preventDefault(); once(form, saveItem); });
  async function saveItem() {
    const raw = readForm(form, fields);
    if (!raw) return;
    const data = cfg.fromForm(raw);
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.firstChild.textContent = t('saving');
    try {
      const title = cfg.title({ ...item, ...data });
      await S.be.save(col, item ? item.id : null, data, entry(item ? 'update' : 'create', col, title));
      close(); toast(t('saved')); route();
    } catch (err) { toast(errText(err), true); btn.firstChild.textContent = t('save'); }
  }
  d.showModal();
  const first = form.querySelector('input:not([type="radio"]), textarea');
  if (first) first.focus();
}

// ---------- a photo field: choose, place in the circle, saved as a small square picture ----------
function setupPhoto(box) {
  const cv = box.querySelector('canvas'), g = cv.getContext('2d');
  const file = box.querySelector('input[type="file"]'), zoom = box.querySelector('input[type="range"]');
  const hidden = box.querySelector('input[type="hidden"]'), rm = box.querySelector('[data-photo-remove]');
  const stage = box.querySelector('.m-photo-stage'), err = box.querySelector('.err'), pick = box.querySelector('.m-file span');
  const S = 480, OUT = 400;
  let img = null, base = 1, z = 1, ox = 0, oy = 0;
  const draw = () => {
    g.fillStyle = '#DCE9F9'; g.fillRect(0, 0, S, S);
    if (!img) return;
    const w = img.naturalWidth * base * z, h = img.naturalHeight * base * z;
    ox = Math.min(0, Math.max(S - w, ox)); oy = Math.min(0, Math.max(S - h, oy));   // the picture always fills the square
    g.drawImage(img, ox, oy, w, h);
  };
  // a 400 px square, as WebP where the browser can make it, small enough to keep in the database
  const commit = () => {
    if (!img) { hidden.value = ''; return; }
    const out = document.createElement('canvas'); out.width = OUT; out.height = OUT;
    out.getContext('2d').drawImage(cv, 0, 0, OUT, OUT);
    let type = 'image/webp', q = 0.85, url = out.toDataURL(type, q);
    if (!url.startsWith('data:image/webp')) { type = 'image/jpeg'; url = out.toDataURL(type, q); }
    while (url.length > 140000 && q > 0.45) { q -= 0.1; url = out.toDataURL(type, q); }
    hidden.value = url;
  };
  const show = (on) => { stage.classList.toggle('empty', !on); zoom.disabled = !on; rm.hidden = !on; pick.textContent = t(on ? 'changePhoto' : 'choosePhoto'); };
  const load = (src, fresh) => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      img = im; base = Math.max(S / im.naturalWidth, S / im.naturalHeight); z = 1; zoom.value = '1';
      ox = (S - im.naturalWidth * base) / 2; oy = (S - im.naturalHeight * base) / 2;
      show(true); draw(); if (fresh) commit(); resolve();
    };
    im.onerror = reject;
    im.src = src;
  });
  const zoomTo = (nz) => {
    const before = base * z; z = Math.min(3, Math.max(1, nz)); const after = base * z;
    ox = S / 2 - (S / 2 - ox) * after / before; oy = S / 2 - (S / 2 - oy) * after / before;
    zoom.value = String(z); draw();
  };
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    err.textContent = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    load(url, true).catch(() => { err.textContent = t('photoError'); }).finally(() => { URL.revokeObjectURL(url); file.value = ''; });
  });
  zoom.addEventListener('input', () => zoomTo(+zoom.value));
  zoom.addEventListener('change', commit);
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { if (!img) return; drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = S / cv.getBoundingClientRect().width;
    ox += (e.clientX - drag.x) * k; oy += (e.clientY - drag.y) * k; drag = { x: e.clientX, y: e.clientY }; draw();
  });
  const end = () => { if (drag) { drag = null; commit(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (e) => {
    if (!img) return;
    const step = e.shiftKey ? 40 : 10, moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) { ox += moves[e.key][0]; oy += moves[e.key][1]; draw(); commit(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomTo(z + 0.1); commit(); e.preventDefault(); }
    else if (e.key === '-') { zoomTo(z - 0.1); commit(); e.preventDefault(); }
  });
  rm.addEventListener('click', () => { img = null; hidden.value = ''; show(false); draw(); file.focus(); });
  draw();
  if (hidden.value) load(hidden.value, false).catch(() => { hidden.value = ''; show(false); });
}

// ---------- the edit history ----------
function logText(x) {
  const title = L(x.title);
  switch (x.action) {
    case 'create': case 'update': case 'delete': return t('a_' + x.action, { w: t('w_' + x.section), x: title });
    case 'join': return t('a_join');
    case 'invite': return t('a_invite', { x: title });
    case 'revoke': return t('a_revoke', { x: title });
    case 'perm': return t('a_perm', { x: title });
    case 'removeMember': return t('a_removeMember', { x: title });
    case 'settings': return t('a_settings');
    case 'story': return t('a_story');
    case 'look': return t('a_look');
    case 'export': return t('a_export', { x: title });
    default: return x.action;
  }
}
function logRow(x) {
  const who = memberById(x.uid) || { name: x.name, initials: x.initials, color: x.color };
  const at = x.at instanceof Date ? x.at : new Date(x.at);
  return `<div class="m-logrow" data-sec="${esc(x.section)}">
      <span class="who">${tagHtml(who)}</span>
      <span class="act">${esc(logText(x))}</span>
      <span class="sec${x.section === 'access' ? ' dark' : ''}">${esc(t('sec_' + x.section))}</span>
      <span class="when mono">${esc(isNaN(at) ? '' : shortStamp(at))}</span>
    </div>`;
}
function emptyLog() {
  return `<div class="m-empty flat"><div class="m-eart log"><span class="pilltag"><i></i><i class="l"></i></span><i class="line"></i></div>
      <h2>${esc(t('emptyLog'))}</h2><p>${esc(t('emptyLogText'))}</p></div>`;
}
async function logPage(main) {
  const log = await S.be.log(300);
  const secs = [...new Set(log.map((x) => x.section))];
  let html = head(esc(t('log')), esc(lang === 'ar' ? 'كل تعديل يحمل وسم العضو الذي قام به. يظهر هذا السجل لأعضاء المجلس فقط.' : 'Every edit carries the tag of the member who made it. Only the board sees this history.'),
    secs.length > 1 ? `<div class="filters" role="group" aria-label="${esc(t('logAll'))}"><button type="button" class="chip" aria-pressed="true" data-f="">${esc(t('logAll'))}</button>${secs.map((s) => `<button type="button" class="chip" aria-pressed="false" data-f="${esc(s)}">${esc(t('sec_' + s))}</button>`).join('')}</div>` : '');
  html += log.length ? `<section class="m-log"></section><button type="button" class="btn btn-outline btn-sm m-more" data-more hidden>${esc(t('showMore'))}</button>` : `<section class="m-card">${emptyLog()}</section>`;
  main.innerHTML = html;
  const PAGE = 150;
  let filter = '', shown = PAGE;
  const draw = () => {
    const rows = log.filter((x) => !filter || x.section === filter);
    const box = $('.m-log', main); if (!box) return;
    box.innerHTML = rows.slice(0, shown).map(logRow).join('');
    $('[data-more]', main).hidden = rows.length <= shown;
  };
  if (log.length) {
    draw();
    $('[data-more]', main).addEventListener('click', () => { shown += PAGE; draw(); });
  }
  $$('.chip', main).forEach((b) => b.addEventListener('click', () => {
    $$('.chip', main).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    filter = b.dataset.f; shown = PAGE; draw();
  }));
}

// ---------- members and access ----------
async function accessPage(main) {
  const [members, invites] = await Promise.all([S.be.members(), S.be.invites()]);
  S.members = members;
  const cols = [...SECTIONS];
  const toggle = (on, label, attrs, disabled) => `<button type="button" class="m-toggle" aria-pressed="${on}" aria-label="${esc(t(on ? 'allowed' : 'notAllowed', { s: label }))}" ${attrs}${disabled ? ' disabled' : ''}>${on ? '✓' : ''}</button>`;
  const sorted = [...members].sort((a, b) => (b.isBoard - a.isBoard) || L(a.name).localeCompare(L(b.name)));
  let html = head(esc(t('access')), esc(t('permHint')));
  if (members.length <= 1 && !invites.length) {
    html += `<section class="m-empty">${EMPTY_ART.team}<h2>${esc(t('onlyYou'))}</h2><p>${esc(t('onlyYouText'))}</p>
        <a class="btn btn-outline" href="#invite" data-jump>${esc(lang === 'ar' ? 'ادعُ عضوًا' : 'Invite a member')}</a></section>`;
  } else {
    html += `<section class="m-card m-table-card"><div class="m-table-wrap"><table class="m-table">
        <thead><tr><th scope="col">${esc(t('member'))}</th>${cols.map((c) => `<th scope="col">${esc(t('sec_' + c))}</th>`).join('')}<th scope="col">${esc(t('boardCol'))}</th><th scope="col"><span class="sr">${esc(t('remove'))}</span></th></tr></thead>
        <tbody>${sorted.map((m) => {
          const self = m.id === S.me.id;
          return `<tr data-uid="${esc(m.id)}">
              <th scope="row"><div class="m-who">${tagHtml(m)}${self ? `<span class="mono muted">${esc(t('you'))}</span>` : ''}</div><div class="mono muted m-mail" dir="ltr">${esc(m.email || '')}</div></th>
              ${cols.map((c) => `<td>${toggle(!!(m.isBoard || (m.perms && m.perms[c])), t('sec_' + c), `data-perm="${c}"`, m.isBoard)}</td>`).join('')}
              <td>${toggle(!!m.isBoard, t('boardCol'), 'data-board', self)}</td>
              <td>${self ? '' : `<button type="button" class="icon-btn" data-remove aria-label="${esc(t('remove'))} ${esc(L(m.name))}"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"/></svg></button>`}</td>
            </tr>`;
        }).join('')}</tbody></table></div></section>`;
  }
  // invite form
  html += `<section class="m-card" id="invite"><h2>${esc(t('inviteTitle'))}</h2><p class="muted">${esc(t('inviteHint'))}</p>
      <form class="m-invite" novalidate>
        <div class="field" data-k="email"><label for="inv-email">${esc(t('email'))} <span class="req" aria-hidden="true">*</span></label><input id="inv-email" name="email" type="email" dir="ltr" autocomplete="off"><span class="err" aria-live="polite"></span></div>
        <div class="pair">
          <div class="field"><label for="inv-ar">${esc(t('f_name'))} · ${esc(t('f_ar'))}</label><input type="text" id="inv-ar" name="name.ar" dir="rtl" lang="ar"></div>
          <div class="field"><label for="inv-en">${esc(t('f_name'))} · ${esc(t('f_en'))}</label><input type="text" id="inv-en" name="name.en" dir="ltr" lang="en"></div>
        </div>
        <fieldset class="m-fs"><legend>${esc(lang === 'ar' ? 'ما يستطيع تعديله' : 'What they can edit')}</legend>
          <div class="m-choices">${cols.map((c) => `<label class="m-choice"><input type="checkbox" name="perm" value="${c}"><span>${esc(t('sec_' + c))}</span></label>`).join('')}
          <label class="m-choice dark"><input type="checkbox" name="board"><span>${esc(t('makeBoard'))}</span></label></div>
        </fieldset>
        <div class="m-btnrow"><button class="btn btn-primary btn-sm" type="submit">${esc(t('inviteBtn'))}${tri()}</button></div>
        <p class="hint">${esc(t('inviteNote'))}</p>
      </form></section>`;
  if (invites.length) {
    html += `<section class="m-card"><h2>${esc(t('pending'))}</h2><div class="m-invites">${invites.map((i) => `<div class="m-inv" data-email="${esc(i.id)}">
        <span class="em" dir="ltr">${esc(i.id)}</span>
        <span class="muted">${i.isBoard ? esc(t('board')) : esc(SECTIONS.filter((c) => i.perms && i.perms[c]).map((c) => t('sec_' + c)).join('، ') || '—')}</span>
        <button type="button" class="btn btn-sm btn-outline" data-revoke>${esc(t('revoke'))}</button></div>`).join('')}</div></section>`;
  }
  main.innerHTML = html;

  const jump = $('[data-jump]', main);
  if (jump) jump.addEventListener('click', (e) => { e.preventDefault(); $('#inv-email').focus(); $('#invite').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  $$('[data-perm]', main).forEach((b) => b.addEventListener('click', async () => {
    const m = members.find((x) => x.id === b.closest('tr').dataset.uid);
    const perms = { ...Object.fromEntries(SECTIONS.map((c) => [c, false])), ...(m.perms || {}) };
    perms[b.dataset.perm] = !perms[b.dataset.perm];
    b.disabled = true;
    try { await S.be.updateMember(m.id, { perms }, entry('perm', 'access', m.name)); m.perms = perms; b.setAttribute('aria-pressed', String(perms[b.dataset.perm])); b.textContent = perms[b.dataset.perm] ? '✓' : ''; b.setAttribute('aria-label', t(perms[b.dataset.perm] ? 'allowed' : 'notAllowed', { s: t('sec_' + b.dataset.perm) })); }
    catch (e) { toast(errText(e), true); }
    b.disabled = false;
  }));
  $$('[data-board]', main).forEach((b) => b.addEventListener('click', async () => {
    const m = members.find((x) => x.id === b.closest('tr').dataset.uid);
    if (m.id === S.me.id) { toast(t('boardOnSelf'), true); return; }
    try { await S.be.updateMember(m.id, { isBoard: !m.isBoard }, entry('perm', 'access', m.name)); route(); } catch (e) { toast(errText(e), true); }
  }));
  $$('[data-remove]', main).forEach((b) => b.addEventListener('click', async () => {
    const m = members.find((x) => x.id === b.closest('tr').dataset.uid);
    if (!(await confirmBox(t('removeQ', { x: L(m.name) }), t('removeText'), t('remove')))) return;
    try { await S.be.removeMember(m.id, entry('removeMember', 'access', m.name)); toast(t('saved')); route(); } catch (e) { toast(errText(e), true); }
  }));
  $$('[data-revoke]', main).forEach((b) => b.addEventListener('click', async () => {
    const em = b.closest('.m-inv').dataset.email;
    try { await S.be.revokeInvite(em, entry('revoke', 'access', { ar: em, en: em })); toast(t('saved')); route(); } catch (e) { toast(errText(e), true); }
  }));
  $('.m-invite', main).addEventListener('submit', (e) => { e.preventDefault(); once(e.target, () => sendInvite(e.target)); });
  async function sendInvite(f) {
    const fd = new FormData(f);
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const err = f.querySelector('[data-k="email"] .err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = t('emailInvalid'); $('#inv-email').focus(); return; }
    if (members.some((m) => (m.email || '').toLowerCase() === email)) { err.textContent = t('alreadyMember'); return; }
    err.textContent = '';
    const isBoard = !!fd.get('board');
    const chosen = fd.getAll('perm');
    const perms = Object.fromEntries(SECTIONS.map((c) => [c, isBoard || chosen.includes(c)]));
    const name = { ar: String(fd.get('name.ar') || '').trim(), en: String(fd.get('name.en') || '').trim() };
    const data = { isBoard, perms };
    if (name.ar || name.en) { data.name = name; data.initials = initialsOf(name.ar || name.en); }
    try { await S.be.invite(email, data, entry('invite', 'access', { ar: email, en: email })); toast(t('invited')); route(); } catch (e2) { toast(errText(e2), true); }
  }
}

// ---------- site settings ----------
const SETTING_FIELDS = [
  ['instagram', 's_instagram', 'url'], ['tiktok', 's_tiktok', 'url'], ['linkedin', 's_linkedin', 'url'], ['email', 's_email', 'email'],
  ['podcastName', 's_podName', 'text'], ['podcastUrl', 's_podUrl', 'url'], ['joinUrl', 's_joinUrl', 'url'], ['submitUrl', 's_submitUrl', 'url']
];
async function settingsPage(main) {
  const s = await S.be.settings();
  main.innerHTML = head(esc(t('settings')), esc(lang === 'ar' ? 'روابط الحسابات والنماذج التي تظهر في الموقع. الحقل الفارغ يُخفى زرّه.' : 'The account and form links shown on the site. An empty field hides its button.')) +
    `<section class="m-card"><form class="m-settings" novalidate><div class="m-fields">
      ${SETTING_FIELDS.map(([k, l, ty]) => `<div class="field half" data-k="${k}"><label for="s-${k}">${esc(t(l))}</label><input id="s-${k}" name="${k}" type="${ty}" dir="${k === 'podcastName' ? 'auto' : 'ltr'}"${ty === 'url' ? ' placeholder="https://"' : ''} value="${esc(s[k] || '')}"><span class="err" aria-live="polite"></span></div>`).join('')}
      </div><div class="m-btnrow"><button type="submit" class="btn btn-primary btn-sm">${esc(t('save'))}${tri()}</button><span class="m-sig">${tagHtml(S.me, 'sm')}<span>${esc(t('sigNote'))}</span></span></div></form></section>`;
  $('.m-settings', main).addEventListener('submit', (e) => { e.preventDefault(); once(e.target, () => saveIt(e)); });
  async function saveIt(e) {
    const fd = new FormData(e.target); const data = {}; let bad = false;
    $$('.err', e.target).forEach((x) => { x.textContent = ''; });
    for (const [k, , ty] of SETTING_FIELDS) {
      const v = String(fd.get(k) || '').trim();
      if (ty === 'url' && v && !/^https?:\/\//i.test(v)) { e.target.querySelector(`[data-k="${k}"] .err`).textContent = t('linkInvalid'); bad = true; }
      if (ty === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { e.target.querySelector(`[data-k="${k}"] .err`).textContent = t('emailInvalid'); bad = true; }
      data[k] = v;
    }
    if (bad) return;
    try { await S.be.saveSettings(data, entry('settings', 'settings')); toast(t('saved')); } catch (err) { toast(errText(err), true); }
  }
}

// ---------- profile ----------
async function profilePage(main) {
  const m = S.me;
  const colors = Object.keys(TAG_COLORS);
  const sections = m.isBoard ? [t('board')] : SECTIONS.filter((c) => m.perms && m.perms[c]).map((c) => t('sec_' + c));
  main.innerHTML = head(esc(t('profile')), esc(t('profileHint'))) + `<section class="m-card"><form class="m-profile" novalidate>
      <div class="m-preview" aria-live="polite">${tagHtml(m, 'lg')}</div>
      <div class="m-fields">
        ${fieldHtml({ k: 'name', kind: 'pair', label: 'f_name', req: true }, m.name)}
        ${fieldHtml({ k: 'initials', kind: 'text', label: 'f_initials', half: true }, m.initials)}
        <fieldset class="m-fs half" data-k="color"><legend>${esc(t('f_color'))}</legend><div class="m-swatches">${colors.map((c) => `<label class="m-swatch" style="--c:${TAG_COLORS[c][0]}"><input type="radio" name="color" value="${c}"${c === m.color ? ' checked' : ''}><span class="sr">${esc(t('col_' + c))}</span></label>`).join('')}</div></fieldset>
      </div>
      <dl class="m-facts"><div><dt>${esc(t('email'))}</dt><dd dir="ltr">${esc(m.email || '')}</dd></div><div><dt>${esc(lang === 'ar' ? 'تعدّل' : 'You edit')}</dt><dd>${esc(sections.join('، ') || '—')}</dd></div></dl>
      <div class="m-btnrow"><button type="submit" class="btn btn-primary btn-sm">${esc(t('saveProfile'))}${tri()}</button><button type="button" class="btn btn-outline btn-sm" data-signout>${esc(t('signOut'))}</button></div>
    </form></section>`;
  const form = $('.m-profile', main);
  const preview = () => {
    const fd = new FormData(form);
    const name = { ar: fd.get('name.ar') || '', en: fd.get('name.en') || '' };
    $('.m-preview', form).innerHTML = tagHtml({ name, initials: String(fd.get('initials') || '').trim() || initialsOf(L(name)), color: fd.get('color') }, 'lg');
  };
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  $('[data-signout]', form).addEventListener('click', () => S.be.signOut());
  form.addEventListener('submit', (e) => { e.preventDefault(); once(form, saveProfile); });
  async function saveProfile() {
    const v = readForm(form, [{ k: 'name', kind: 'pair', req: true }, { k: 'initials', kind: 'text' }]);
    if (!v) return;
    const patch = { name: v.name, initials: v.initials || initialsOf(v.name.ar || v.name.en), color: new FormData(form).get('color') || 'blue' };
    try {
      await S.be.updateMember(m.id, patch, null);
      Object.assign(S.me, patch);
      const mm = memberById(m.id); if (mm) Object.assign(mm, patch);
      toast(t('saved')); renderShell(); route();
    } catch (err) { toast(errText(err), true); }
  }
}

// ---------- logo story (About page) ----------
async function storyPage(main) {
  const saved = await S.be.settings('story');
  const st = withDefaults(saved && (saved.title || saved.logo || saved.visible === false) ? saved : null);
  const stages = (window.MemarFilm && window.MemarFilm.STAGES) || DEFAULT_STORY.chapters.map((c, i) => ({ a: 0, name: c.title.en }));
  const clock = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const pairInputs = (name, v, area) => `<div class="pair">
      ${['ar', 'en'].map((lg) => `<div class="field"><label for="st-${name.replace(/\./g, '-')}-${lg}">${esc(t(lg === 'ar' ? 'f_ar' : 'f_en'))}</label>${area
        ? `<textarea id="st-${name.replace(/\./g, '-')}-${lg}" name="${name}.${lg}" dir="${lg === 'ar' ? 'rtl' : 'ltr'}" lang="${lg}" rows="2">${esc(v[lg] || '')}</textarea>`
        : `<input type="text" id="st-${name.replace(/\./g, '-')}-${lg}" name="${name}.${lg}" dir="${lg === 'ar' ? 'rtl' : 'ltr'}" lang="${lg}" value="${esc(v[lg] || '')}">`}</div>`).join('')}
    </div>`;
  main.innerHTML = head(esc(t('story')), esc(t('storyHint')), `<a class="btn btn-outline btn-sm" href="../about.html#story" target="_blank" rel="noopener">${esc(t('viewOnSite'))}</a>`) +
    `<section class="m-card"><form class="m-story" novalidate>
      <label class="m-switch"><input type="checkbox" name="visible"${st.visible ? ' checked' : ''}><span class="knob" aria-hidden="true"></span><span>${esc(t('storyShow'))}</span></label>
      <p class="m-note" data-hidden-note${st.visible ? ' hidden' : ''}>${esc(t('storyIsHidden'))}</p>
      <div class="m-fields">
        ${fieldHtml({ k: 'title', kind: 'pair', label: 'st_title', req: true }, st.title)}
        ${fieldHtml({ k: 'logo', kind: 'pairArea', label: 'st_logo', req: true, rows: 9, hint: t('paraHint') }, st.logo)}
        <fieldset class="m-fs"><legend>${esc(t('st_steps'))}</legend>
          ${st.steps.map((v, i) => `<div class="m-sub"><span class="mono">${esc(t('st_step', { n: num(i + 1) }))}</span>${pairInputs('steps.' + i, v)}</div>`).join('')}
        </fieldset>
        ${fieldHtml({ k: 'filmTitle', kind: 'pair', label: 'st_filmTitle', req: true }, st.filmTitle)}
        ${fieldHtml({ k: 'film', kind: 'pairArea', label: 'st_film', rows: 4, hint: t('paraHint') }, st.film)}
        <fieldset class="m-fs"><legend>${esc(t('st_chapters'))}</legend>
          ${st.chapters.map((c, i) => `<div class="m-sub"><span class="mono" dir="ltr">${clock(stages[i] ? stages[i].a : 0)} · ${esc(stages[i] ? stages[i].name : '')}</span>
            <span class="m-sublabel">${esc(t('st_chTitle'))}</span>${pairInputs('ch.' + i + '.title', c.title)}
            <span class="m-sublabel">${esc(t('st_chText'))}</span>${pairInputs('ch.' + i + '.text', c.text, true)}</div>`).join('')}
        </fieldset>
      </div>
      <div class="m-btnrow"><button type="submit" class="btn btn-primary btn-sm">${esc(t('save'))}${tri()}</button><button type="button" class="btn btn-outline btn-sm" data-restore>${esc(t('restoreText'))}</button>
        <span class="m-sig">${tagHtml(S.me, 'sm')}<span>${esc(t('sigNote'))}</span></span></div>
    </form></section>`;
  const form = $('.m-story', main);
  form.visible.addEventListener('change', () => { $('[data-hidden-note]', form).hidden = form.visible.checked; });
  const setVal = (name, v) => { const el = form.elements[name]; if (el) el.value = v || ''; };
  $('[data-restore]', form).addEventListener('click', () => {
    const d = DEFAULT_STORY;
    ['title', 'logo', 'filmTitle', 'film'].forEach((k) => { setVal(k + '.ar', d[k].ar); setVal(k + '.en', d[k].en); });
    d.steps.forEach((v, i) => { setVal(`steps.${i}.ar`, v.ar); setVal(`steps.${i}.en`, v.en); });
    d.chapters.forEach((c, i) => ['title', 'text'].forEach((k) => { setVal(`ch.${i}.${k}.ar`, c[k].ar); setVal(`ch.${i}.${k}.en`, c[k].en); }));
    toast(t('restored'));
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); once(form, saveStory); });
  async function saveStory() {
    const v = readForm(form, [{ k: 'title', kind: 'pair', req: true }, { k: 'logo', kind: 'pairArea', req: true }, { k: 'filmTitle', kind: 'pair', req: true }, { k: 'film', kind: 'pairArea' }]);
    if (!v) return;
    const fd = new FormData(form);
    const pair = (n) => ({ ar: String(fd.get(n + '.ar') || '').trim(), en: String(fd.get(n + '.en') || '').trim() });
    const data = {
      visible: form.visible.checked, ...v,
      steps: st.steps.map((_, i) => pair('steps.' + i)),
      chapters: st.chapters.map((_, i) => ({ title: pair(`ch.${i}.title`), text: pair(`ch.${i}.text`) }))
    };
    try { await S.be.saveSettings(data, entry('story', 'story'), 'story'); toast(t('saved')); } catch (err) { toast(errText(err), true); }
  }
}

// ---------- fonts and appearance (board only) ----------
const FONT_CHOICES = {
  arHead: ['Noto Kufi Arabic', 'Reem Kufi', 'Cairo', 'Tajawal', 'Almarai', 'Readex Pro', 'Alexandria', 'El Messiri', 'Changa', 'IBM Plex Sans Arabic', 'Amiri'],
  arBody: ['IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Cairo', 'Tajawal', 'Almarai', 'Readex Pro', 'Vazirmatn', 'Alexandria', 'Amiri'],
  enHead: ['Archivo', 'Bricolage Grotesque', 'Instrument Sans', 'Schibsted Grotesk', 'Sora', 'Manrope', 'Unbounded', 'Syne', 'Fraunces', 'IBM Plex Sans'],
  enBody: ['IBM Plex Sans', 'Inter', 'Instrument Sans', 'DM Sans', 'Manrope', 'Source Sans 3', 'Work Sans', 'Public Sans', 'Atkinson Hyperlegible'],
  mono: ['IBM Plex Mono', 'JetBrains Mono', 'DM Mono', 'Space Mono', 'Roboto Mono', 'Source Code Pro', 'Martian Mono']
};
const FONT_SAMPLES = {
  arHead: () => t('sampleArHead'), arBody: () => t('sampleArBody'),
  enHead: () => 'A student-led architecture team', enBody: () => 'Raising the level of student work by sharing expertise across levels and media.',
  mono: () => 'TUE 10 NOV · 18:00 · ISSUE 03'
};
async function lookPage(main) {
  const ML = window.MemarLook;
  const saved = await S.be.settings('look');
  const D = ML.DEFAULT_FONTS;
  const cur = { ...D, ...((saved && saved.fonts) || {}) };
  const theme = (saved && saved.theme) || 'light';
  const roles = Object.keys(D);
  main.innerHTML = head(esc(t('look')), esc(t('lookHint'))) +
    `<form class="m-look" novalidate>
      <section class="m-card"><div class="m-fonts">
        ${roles.map((k) => {
          const list = FONT_CHOICES[k];
          const other = !list.includes(cur[k]);
          return `<div class="m-font" data-role="${k}">
            <label for="lf-${k}">${esc(t('r_' + k))}</label>
            <select id="lf-${k}">${list.map((n) => `<option value="${esc(n)}"${n === cur[k] ? ' selected' : ''}>${esc(n)}${n === D[k] ? ' · ' + esc(t('identityFont')) : ''}</option>`).join('')}
              <option value="__other"${other ? ' selected' : ''}>${esc(t('otherFont'))}</option></select>
            <input type="text" id="lf-${k}-x" class="input" dir="ltr" placeholder="${esc(t('fontName'))}" aria-label="${esc(t('fontName'))}" value="${other ? esc(cur[k]) : ''}"${other ? '' : ' hidden'}>
            <div class="m-font-sample" dir="${k.startsWith('ar') ? 'rtl' : 'ltr'}" lang="${k.startsWith('ar') ? 'ar' : 'en'}">${esc(FONT_SAMPLES[k]())}</div>
            ${k.startsWith('ar') ? `<span class="hint">${esc(t('needArabic'))}</span>` : ''}
          </div>`;
        }).join('')}
      </div></section>
      <section class="m-card"><fieldset class="m-fs"><legend>${esc(t('defaultTheme'))}</legend>
        <div class="m-choices">${['light', 'dark', 'auto'].map((v) => `<label class="m-choice"><input type="radio" name="theme" value="${v}"${v === theme ? ' checked' : ''}><span>${esc(t('th_' + v))}</span></label>`).join('')}</div>
        <span class="hint">${esc(t('themeHint'))}</span></fieldset></section>
      <div class="m-btnrow"><button type="submit" class="btn btn-primary btn-sm">${esc(t('save'))}${tri()}</button><button type="button" class="btn btn-outline btn-sm" data-reset>${esc(t('resetLook'))}</button>
        <span class="m-sig">${tagHtml(S.me, 'sm')}<span>${esc(t('sigNote'))}</span></span></div>
    </form>`;
  const form = $('.m-look', main);
  const chosen = (k) => {
    const sel = $('#lf-' + k, form);
    return sel.value === '__other' ? ML.clean($('#lf-' + k + '-x', form).value) : sel.value;
  };
  const show = (k) => {
    const sel = $('#lf-' + k, form), x = $('#lf-' + k + '-x', form);
    x.hidden = sel.value !== '__other';
    const n = chosen(k) || D[k];
    ML.loadFont(n);
    const fallback = k.startsWith('ar') ? 'Tahoma, sans-serif' : k === 'mono' ? 'ui-monospace, monospace' : 'Arial, sans-serif';
    const sample = $(`[data-role="${k}"] .m-font-sample`, form);
    sample.style.fontFamily = `'${n}', ${fallback}`;
    sample.style.fontWeight = k.endsWith('Head') ? '800' : '400';
  };
  roles.forEach((k) => {
    $('#lf-' + k, form).addEventListener('change', () => { show(k); if ($('#lf-' + k, form).value === '__other') $('#lf-' + k + '-x', form).focus(); });
    $('#lf-' + k + '-x', form).addEventListener('input', () => show(k));
    show(k);
  });
  $('[data-reset]', form).addEventListener('click', () => { roles.forEach((k) => { $('#lf-' + k, form).value = D[k]; show(k); }); toast(t('lookReset')); });
  form.addEventListener('submit', (e) => { e.preventDefault(); once(form, saveLook); });
  async function saveLook() {
    const fonts = {};
    roles.forEach((k) => { fonts[k] = chosen(k) || D[k]; });
    const data = { fonts, theme: new FormData(form).get('theme') || 'light' };
    try {
      await S.be.saveSettings(data, entry('look', 'look'), 'look');
      ML.update(data);
      toast(t('saved'));
    } catch (err) { toast(errText(err), true); }
  }
}

// ---------- phone menus ----------
function groupPage(id) {
  return async (main) => {
    const gs = groups();
    let items = [];
    let title = '';
    if (id === 'more') {
      title = S.me.isBoard ? (lang === 'ar' ? 'الإدارة' : 'Admin') : t('more');
      gs.filter((g) => g.id === 'admin' || g.id === 'resources').forEach((g) => { items = items.concat(g.items); });
      items.push(['profile', t('profile')]);
    } else {
      const g = gs.find((x) => x.id === id);
      title = g ? g.label : '';
      items = g ? g.items : [];
    }
    main.innerHTML = head(esc(title), '') + `<nav class="m-biglinks">${items.map(([p, l]) => `<a href="#${p}">${esc(l)}${tri()}</a>`).join('')}</nav>` +
      (id === 'more' ? `<div class="m-btnrow" style="margin-top:20px"><a class="btn btn-outline btn-sm" href="../index.html">${esc(t('back'))}</a><a class="btn btn-outline btn-sm" href="?lang=${other}" data-lang lang="${other}">${esc(t('langFull'))}</a>${themeButton('btn btn-outline btn-sm', THEME_LABELS, true)}<button type="button" class="btn btn-outline btn-sm" data-signout>${esc(t('signOut'))}</button></div>` : '');
    bindLang(main);
    $$('[data-signout]', main).forEach((b) => b.addEventListener('click', () => S.be.signOut()));
  };
}

// the context the tools get
const ctx = {
  get be() { return S.be; }, get me() { return S.me; }, toast, can, tagHtml, errText,
  logExport: (title) => S.be.addLog(entry('export', 'tools', title)).catch((e) => console.error(e))
};

const ROUTES = {
  overview: { render: overview, title: () => t('overview') },
  'tools/announce': { need: 'tools', render: (el, p) => announce.mount(el, ctx, p), title: () => t('announce') },
  'tools/qr': { need: 'tools', render: (el) => tools.mountQr(el, ctx), title: () => t('qr') },
  'resources/brand': { render: (el) => tools.mountBrand(el, ctx), title: () => t('brand') },
  'content/events': { need: 'events', render: contentPage('events'), title: () => t('events') },
  'content/issues': { need: 'issues', render: contentPage('issues'), title: () => t('issues') },
  'content/episodes': { need: 'episodes', render: contentPage('episodes'), title: () => t('episodes') },
  'content/team': { need: 'team', render: contentPage('team'), title: () => t('team') },
  'admin/log': { need: 'log', render: logPage, title: () => t('log') },
  'admin/access': { need: 'access', render: accessPage, title: () => t('access') },
  'admin/settings': { need: 'settings', render: settingsPage, title: () => t('settings') },
  'admin/story': { need: 'settings', render: storyPage, title: () => t('story') },
  'admin/look': { need: 'settings', render: lookPage, title: () => t('look') },
  profile: { render: profilePage, title: () => t('profile') },
  'g/tools': { need: 'tools', render: groupPage('tools'), title: () => t('gTools') },
  'g/content': { render: groupPage('content'), title: () => t('gContent') },
  'g/more': { render: groupPage('more'), title: () => t('more') }
};

// ---------- start ----------
async function main() {
  applyLang();
  renderLoading();
  try { S.be = await backend(); } catch (e) { console.error(e); app.innerHTML = frame(`<h1>${esc(t('errLoad'))}</h1>`); bindLang(); return; }
  ['save', 'remove', 'saveSettings'].forEach((k) => {
    const f = S.be[k].bind(S.be);
    S.be[k] = async (...a) => { const r = await f(...a); clearCache(); return r; };
  });
  if (!isLive) {
    const n = document.createElement('aside'); n.className = 'demo-note'; n.setAttribute('aria-label', t('demoLabel'));
    n.textContent = t('demoNote');
    document.body.prepend(n);
  }
  try { S.linkState = await S.be.completeLink(); } catch (e) { console.error(e); toast(signInError(e), true); }
  // the board's fonts apply here too
  S.be.settings('look').then((look) => { if (window.MemarLook) window.MemarLook.update(look); }).catch(() => {});
  S.be.onAuth(async (user) => {
    S.user = user;
    if (!user) {
      S.me = null;
      if (S.linkState === 'need-email') renderNeedEmail(); else renderSignIn();
      return;
    }
    renderLoading();
    try {
      const r = await S.be.me();
      if (!r.member) { renderNotInvited(user); return; }
      S.me = { id: user.uid, ...r.member };
      try { S.members = await S.be.members(); } catch (e) { S.members = [S.me]; }
      renderShell();
      firstRoute = true;
      route();
    } catch (e) {
      console.error(e);
      renderNotInvited(user);
    }
  });
  addEventListener('hashchange', route);
}
main();
