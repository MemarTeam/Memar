// Public site: draws the header, menu and footer, then the sections of the current page from the
// club's content. A section with no content is left out of the menu and the home page; opened
// directly, its page shows a designed "on its way" state instead.
import { lang, other, applyLang, setLang, L, t, day, month, weekday, time, num } from './i18n.js';
import { backend, isLive, EVENT_TYPES, splitEvents, byNumberDesc, byOrder, eventDate, safeUrl, safePhoto, readCache, writeCache, CACHE_MS, TEAM_CACHE } from './data.js';
import { esc, logo, tri, play, themeButton, bindTheme } from './ui.js';
import { renderStory } from './story.js';

const THEME_LABELS = { dark: t('darkMode'), light: t('lightMode') };

const page = document.body.dataset.page;
const $ = (s, r = document) => r.querySelector(s);
const ext = (u) => (u ? `href="${esc(u)}" target="_blank" rel="noopener"` : '');

// ---------- small drawings ----------
const burger = '<svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 2 H19 M6 12 H19"/></svg>';
const cross = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2 L14 14 M14 2 L2 14"/></svg>';

// ---------- menu ----------
const NAV_KEY = 'memar-nav';
const LINKS = [
  { id: 'home', href: 'index.html', always: true },
  { id: 'about', href: 'about.html', always: true },
  { id: 'events', href: 'events.html', needs: 'events' },
  { id: 'magazine', href: 'magazine.html', needs: 'issues' },
  { id: 'podcast', href: 'podcast.html', needs: 'episodes' },
  { id: 'join', href: 'join.html', always: true }
];
function readNav() { try { return JSON.parse(localStorage.getItem(NAV_KEY)) || {}; } catch (e) { return {}; } }
function writeNav(v) { try { localStorage.setItem(NAV_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

function navLinks(has) {
  return LINKS.filter((l) => l.always || has[l.needs]).map((l) => {
    const cur = l.id === page ? ' aria-current="page"' : '';
    return `<a href="${l.href}"${cur}>${tri()}<span>${esc(t(l.id))}</span></a>`;
  }).join('');
}

function socialLinks(s) {
  return [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn']]
    .filter(([k]) => safeUrl(s[k])).map(([k, n]) => `<a ${ext(safeUrl(s[k]))} lang="en">${n}</a>`).join('');
}

function header(has) {
  const el = $('#site-header');
  el.className = 'site-header';
  el.innerHTML = `<div class="wrap bar">
      <a class="brand" href="index.html">${logo(undefined, undefined, lang === 'ar' ? 'معمار — الرئيسية' : 'Memar — home')}</a>
      <nav class="nav" aria-label="${esc(t('navMain'))}">${navLinks(has)}</nav>
      <div class="hdr-actions">
        ${themeButton('pill-btn round full', THEME_LABELS)}
        <a class="pill-btn full" href="?lang=${other}" data-lang lang="${other}" aria-label="${esc(t('langLabel'))}">${esc(t('langShort'))}</a>
        <a class="pill-btn pill-ink full" href="members/">${esc(t('members'))}</a>
        <button type="button" class="pill-btn pill-ink menu-btn" aria-expanded="false" aria-controls="mobile-menu" aria-label="${esc(t('openMenu'))}">${burger}${esc(t('menu'))}</button>
      </div>
    </div>`;
  el.querySelector('.menu-btn').addEventListener('click', openMenu);
  el.querySelector('[data-lang]').addEventListener('click', (e) => { e.preventDefault(); setLang(other); });
  bindTheme(el, THEME_LABELS);
}

let lastSettings = {};
function mobileMenu(has, s) {
  let m = $('#mobile-menu');
  if (!m) { m = document.createElement('div'); m.id = 'mobile-menu'; m.className = 'mobile-menu'; m.hidden = true; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', t('menu')); document.body.appendChild(m); }
  const socials = socialLinks(s);
  m.innerHTML = `<div class="top">
      <a class="brand" href="index.html" style="width:112px">${logo('#F3F1EB', '#5996D9', lang === 'ar' ? 'معمار — الرئيسية' : 'Memar — home')}</a>
      <button type="button" class="pill-btn btn-ghost-light close" aria-label="${esc(t('closeMenu'))}">${cross}${esc(t('close'))}</button>
    </div>
    <nav class="links" aria-label="${esc(t('navPages'))}">${navLinks(has)}</nav>
    <div class="row">
      <a class="pill-btn btn-ghost-light" href="?lang=${other}" data-lang lang="${other}">${esc(t('langFull'))}</a>
      <a class="pill-btn btn-light" href="members/">${esc(t('members'))}</a>
    </div>
    <div class="row">${themeButton('pill-btn btn-ghost-light', THEME_LABELS, true)}</div>
    ${socials ? `<div class="follow"><span class="mono" style="font-size:13px;color:var(--blue-tint)">${esc(t('followUs'))}</span><div class="socials">${socials}</div></div>` : ''}`;
  m.querySelector('.close').addEventListener('click', closeMenu);
  m.querySelector('[data-lang]').addEventListener('click', (e) => { e.preventDefault(); setLang(other); });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    // keep Tab inside the open menu
    if (e.key === 'Tab') {
      const f = [...m.querySelectorAll('a[href], button:not([disabled])')];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  bindTheme(m, THEME_LABELS);
}
function openMenu() {
  const m = $('#mobile-menu'); if (!m) return;
  m.hidden = false; document.body.style.overflow = 'hidden';
  $('.menu-btn').setAttribute('aria-expanded', 'true');
  m.querySelector('.close').focus();
}
function closeMenu() {
  const m = $('#mobile-menu'); if (!m) return;
  m.hidden = true; document.body.style.overflow = '';
  const b = $('.menu-btn'); b.setAttribute('aria-expanded', 'false'); b.focus();
}

function footer(s) {
  const el = $('#site-footer');
  el.className = 'site-footer';
  const mail = safeUrl('mailto:' + (s.email || '')) && s.email ? `<a href="mailto:${esc(s.email)}" dir="ltr">${esc(s.email)}</a> · ` : '';
  el.innerHTML = `<div class="wrap bar">
      <div class="fine">${mail}${esc(t('footer'))}</div>
      <div class="socials">${socialLinks(s)}</div>
    </div>`;
}

function demoNote(state) {
  if (isLive) return;
  const n = document.createElement('aside');
  n.className = 'demo-note';
  n.setAttribute('aria-label', t('demoLabel'));
  const go = (q) => { const u = new URL(location.href); u.searchParams.set('demo', q); return esc(u.pathname.split('/').pop() + u.search); };
  n.innerHTML = `${esc(t('demoNote'))} <a href="${go(state === 'launch' ? 'full' : 'launch')}">${esc(t(state === 'launch' ? 'demoFull' : 'demoLaunch'))}</a>`;
  document.body.prepend(n);
}

// ---------- pieces ----------
// only the four known event types get a tag; anything else typed straight into the database is left out
const typeTag = (type, extra = '') => (EVENT_TYPES.includes(type) ? `<span class="tag tag-${esc(type)} ${extra}">${esc(t(type))}</span>` : '');
function when(e) { const d = eventDate(e); return `${weekday(d)} · ${time(d)}`; }

function ticket(e, isNext) {
  const d = eventDate(e);
  const reg = safeUrl(e.registerUrl);
  const where = [L(e.place), L(e.guest)].filter(Boolean).join(' · ');
  return `<article class="ticket${isNext ? ' is-next' : ''}" id="ev-${esc(e.id)}">
      <div class="stub">
        ${isNext ? `<span class="k">${esc(t('nextEvent'))}</span>` : ''}
        <b class="d">${esc(day(d))}</b>
        <span class="m">${esc(month(d))}</span>
        <span class="w">${esc(when(e))}</span>
      </div>
      <div class="perf" aria-hidden="true"></div>
      <div class="info">
        <div>${typeTag(e.type)}</div>
        <h3>${esc(L(e.title))}</h3>
        ${where ? `<div class="where">${esc(where)}</div>` : ''}
        ${L(e.summary) ? `<p class="sum">${esc(L(e.summary))}</p>` : ''}
        ${reg ? `<div class="actions"><a class="btn ${isNext ? 'btn-primary' : 'btn-outline'} btn-sm" ${ext(reg)}>${esc(t('register'))}${isNext ? tri() : ''}</a></div>` : ''}
      </div>
    </article>`;
}
function pastCard(e) {
  const d = eventDate(e);
  return `<article class="past-card" id="ev-${esc(e.id)}">
      <div class="date-dot"><b>${esc(day(d))}</b><span>${esc(month(d))}</span></div>
      <div class="body">${typeTag(e.type, 'tag-sm')}<div class="t">${esc(L(e.title))}</div></div>
    </article>`;
}

const monthLabel = (ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym || '')) return '';
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15))).toUpperCase();
};
const monthName = (ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym || '')) return '';
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-arab-ca-gregory' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
};
function cover(i, size = '') {
  const img = safeUrl(i.coverUrl);
  const c = { blue: 'c-blue', sand: 'c-sand' }[i.coverColor] || '';
  return `<div class="cover ${c} ${size}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `
      <div class="vg">VANGUARD</div>
      <div class="big">${esc(String(i.number || '').padStart(2, '0'))}</div>
      <div class="no"><span>ISSUE ${esc(String(i.number || '').padStart(2, '0'))}</span><span>${esc(monthLabel(i.month))}</span></div>`}</div>`;
}
function shelf(issues, s) {
  const submit = safeUrl(s.submitUrl);
  const items = issues.map((i, k) => `<a class="issue${k === 0 ? ' is-latest' : ''}" ${ext(safeUrl(i.pdfUrl))}>
      ${cover(i)}
      <span class="lbl">${tri()}<span>${k === 0 ? esc(t('latestIssue')) + ' · ' : ''}${esc(t('issue'))} ${esc(num(i.number, 2))}${L(i.title) ? ' · ' + esc(L(i.title)) : ''}</span></span>
    </a>`).join('');
  const next = `<div class="cover-next"><b>${esc(t('nextIssue'))}</b>${submit ? `<a class="link-line" ${ext(submit)}>${esc(t('submitWork'))}</a>` : ''}</div>`;
  return `<div class="shelf">${items}${next}</div>`;
}

function epLink(p, now) {
  const u = safeUrl(p.url);
  const n = `EP ${String(p.number || '').padStart(2, '0')}${p.duration ? ' · ' + p.duration : ''}`;
  const title = esc(L(p.title));
  const guest = L(p.guest) ? esc(L(p.guest)) : '';
  if (now) {
    return `<a class="ep now" ${ext(u)}><span class="play">${play(22, '#082F54')}</span>
        <span class="meta"><span class="n">NOW · ${esc(n)}</span><b>${title}</b>${guest ? `<span>${guest}</span>` : ''}</span></a>`;
  }
  return `<a class="ep" ${ext(u)}><span class="b"><b>${title}</b>${guest ? `<span class="g">${guest}</span>` : ''}</span><span class="n">${esc(n)}</span></a>`;
}
function podBand(eps, s, onPodcastPage) {
  const pu = safeUrl(s.podcastUrl);
  const listen = pu ? `<a class="btn btn-light" ${ext(pu)}>${esc(s.podcastName ? t('listenOn', { p: s.podcastName }) : t('listen'))}${tri()}</a>` : '';
  const all = !onPodcastPage && eps.length > 3 ? `<a class="btn btn-ghost-light" href="podcast.html">${esc(t('allEpisodes'))}</a>` : '';
  const shown = onPodcastPage ? eps.slice(0, 1) : eps.slice(0, 3);
  return `<section class="pod" aria-labelledby="pod-title">
      <div>
        <div class="mono" style="font-size:13px;color:var(--blue-tint)">PODCAST</div>
        <${onPodcastPage ? 'h1' : 'h2'} class="title" id="pod-title" lang="en">The Architecture Show</${onPodcastPage ? 'h1' : 'h2'}>
        <p>${esc(lang === 'ar' ? 'حوارات قصيرة مع الأساتذة والطلاب والخريجين ومعماريين من خارج الجامعة.' : 'Short conversations with professors, students, graduates and architects from outside the university.')}</p>
        ${listen || all ? `<div class="actions">${listen}${all}</div>` : ''}
      </div>
      <div class="eps">${shown.map((p, k) => epLink(p, k === 0)).join('')}</div>
    </section>`;
}

// the four activities, with a footer that says whether each has started
function whatWeDo(c, headTag = 'h2') {
  const has = { events: c.events.length > 0, designathon: c.events.some((e) => e.type === 'designathon'), issues: c.issues.length > 0, episodes: c.episodes.length > 0 };
  const ar = lang === 'ar';
  const soon = (txt, color, ink) => `<span class="tag tag-dashed" style="color:${color}"><span style="color:${ink}">${esc(txt)}</span></span>`;
  const go = (href, txt, light) => `<a class="link-line" href="${href}"${light ? ' style="color:var(--paper);border-color:var(--blue-light)"' : ''}>${esc(txt)}</a>`;
  return `<div class="what">
      <article class="wcard">
        <div class="mark" aria-hidden="true"><div style="width:96px;height:44px;border-radius:22px;background:var(--blue)"></div><div style="width:44px;height:44px;border-radius:22px;background:var(--blue-tint)"></div></div>
        <${headTag === 'h2' ? 'h3' : 'h3'}>${ar ? 'ورش ومحاضرات' : 'Workshops and talks'}</${headTag === 'h2' ? 'h3' : 'h3'}>
        <p>${ar ? 'لقاءات مع معماريين من مجالات مختلفة، وورش تبني مهارات يحتاجها الاستوديو.' : 'Meetings with architects from different fields, and workshops that build the skills the studio needs.'}</p>
        <div class="foot">${has.events ? go('events.html', t('seeEvents')) : soon(t('firstEventSoon'), 'var(--accent)', 'var(--accent)')}</div>
      </article>
      <article class="wcard">
        <div class="mark" aria-hidden="true"><div class="mono" style="width:56px;height:56px;border-radius:28px;background:var(--green);color:var(--paper);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600">${esc(num(48))}</div><div style="width:70px;height:44px;border-radius:22px;border:1.5px solid var(--green)"></div></div>
        <h3>${ar ? 'الديزايناثون' : 'Designathons'}</h3>
        <p>${ar ? 'مسابقات تصميم مكثفة لمدة ٤٨ ساعة بمشاركة طلاب من جامعات أخرى.' : 'Intense 48-hour design competitions with students from other universities.'}</p>
        <div class="foot">${has.designathon ? go('events.html', t('seeEvents')) : soon(t('soon'), 'var(--green-ink)', 'var(--green-ink)')}</div>
      </article>
      <article class="wcard">
        <div class="mark" aria-hidden="true" style="align-items:flex-end"><div style="width:40px;height:56px;border-radius:3px;background:var(--night)"></div><div style="width:40px;height:56px;border-radius:3px;border:1.5px dashed rgba(17,20,24,0.4)"></div></div>
        <h3>${ar ? 'مجلة <bdi lang="en">Vanguard</bdi>' : 'Vanguard magazine'}</h3>
        <p>${ar ? 'مجلة شهرية بالنصائح والمعرفة والمحتوى التفاعلي لرفع جودة أعمال الطلاب.' : 'A monthly magazine of tips, knowledge and interactive content to raise the level of student work.'}</p>
        <div class="foot">${has.issues ? go('magazine.html', t('seeIssues')) : soon(t('firstIssue'), 'var(--text)', 'var(--text)')}</div>
      </article>
      <article class="wcard is-night">
        <div class="mark" aria-hidden="true"><div style="width:56px;height:56px;border-radius:28px;background:var(--blue);display:flex;align-items:center;justify-content:center">${play(20, '#F3F1EB')}</div><div style="width:84px;height:44px;border-radius:22px;border:1.5px solid rgba(89,150,217,0.6)"></div></div>
        <h3 lang="en" dir="ltr" class="disp" style="text-align:start">The Architecture Show</h3>
        <p>${ar ? 'حوارات قصيرة مع الأساتذة والطلاب والخريجين ومعماريين من خارج الجامعة.' : 'Short conversations with professors, students, graduates and architects from outside the university.'}</p>
        <div class="foot">${has.episodes ? go('podcast.html', t('seeEps'), true) : soon(t('firstEp'), 'var(--blue-light)', 'var(--blue-tint)')}</div>
      </article>
    </div>`;
}

function followBand(s, night, text) {
  const links = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn']].filter(([k]) => safeUrl(s[k]));
  const btns = links.map(([k, n], i) => `<a class="btn btn-sm ${night ? (i === 0 ? 'btn-light' : 'btn-ghost-light') : (i === 0 ? 'btn-primary' : 'btn-outline')}" ${ext(safeUrl(s[k]))} lang="en">${n}</a>`).join('');
  const mail = !links.length && s.email ? `<a class="btn btn-sm ${night ? 'btn-light' : 'btn-primary'}" href="mailto:${esc(s.email)}" dir="ltr">${esc(s.email)}</a>` : '';
  return `<section class="band${night ? '' : ' is-light'}" aria-labelledby="follow-title">
      <div>
        <h2 id="follow-title">${esc(t('firstToKnow'))}</h2>
        <p>${esc(text || t('firstToKnowText'))}</p>
        ${btns || mail ? `<div class="actions">${btns || mail}</div>` : ''}
      </div>
      <div class="motif" aria-hidden="true">
        <div class="p" style="width:120px;background:var(--blue)"></div>
        <div class="p" style="width:84px;border:1.5px solid rgba(89,150,217,0.6)"></div>
        ${tri()}
        <div class="p" style="width:150px;border:2px dashed ${night ? 'var(--paper)' : 'rgba(17,20,24,0.45)'}"></div>
      </div>
    </section>`;
}
function joinBand(s) {
  const ar = lang === 'ar';
  return `<section class="band is-light" aria-labelledby="join-title">
      <div>
        <h2 id="join-title">${esc(t('joinUs'))}</h2>
        <p>${ar ? 'شارك في الفعاليات، أو اكتب للمجلة، أو تطوّع مع الفريق.' : 'Take part in events, write for the magazine, or volunteer with the team.'}</p>
        <div class="actions"><a class="btn btn-primary" href="join.html">${ar ? 'انضم الآن' : 'Join now'}${tri()}</a></div>
      </div>
      <div class="motif" aria-hidden="true">
        <div class="p" style="width:84px;background:var(--sand)"></div>
        <div class="p" style="width:120px;background:var(--blue)"></div>
        ${tri()}
      </div>
    </section>`;
}
function section(id, title, body, more) {
  return `<section class="wrap section" aria-labelledby="${id}">
      <div class="section-head"><h2 id="${id}">${title}</h2>${more || ''}</div>
      ${body}
    </section>`;
}
const wrapSec = (inner) => `<div class="wrap section">${inner}</div>`;

// ---------- pages ----------
function home(c, s) {
  const { upcoming } = splitEvents(c.events);
  const issues = [...c.issues].sort(byNumberDesc);
  const eps = [...c.episodes].sort(byNumberDesc);
  const next = upcoming[0];

  // hero buttons: the next event and the magazine once they exist, otherwise who we are and how to join
  const acts = [];
  if (next) acts.push(`<a class="btn btn-primary" href="events.html#ev-${esc(next.id)}">${esc(t('nextEvent'))}${tri()}</a>`);
  if (issues[0]) acts.push(`<a class="btn btn-outline" ${ext(safeUrl(issues[0].pdfUrl))}>${esc(t('readVanguard'))}</a>`);
  if (!acts.length) acts.push(`<a class="btn btn-primary" href="about.html">${esc(t('aboutUs'))}${tri()}</a>`, `<a class="btn btn-outline" href="join.html">${esc(t('joinUs'))}</a>`);
  else if (acts.length === 1) acts.push(`<a class="btn btn-outline" href="about.html">${esc(t('aboutUs'))}</a>`);
  $('#hero-actions').innerHTML = acts.join('');

  let out = '';
  // the latest of each, side by side
  const latest = [];
  if (next) {
    const d = eventDate(next);
    latest.push(`<a class="latest-card is-blue" href="events.html#ev-${esc(next.id)}">
        <div class="date-dot"><b>${esc(day(d))}</b><span>${esc(month(d))}</span></div>
        <div class="body"><span class="k">${esc(t('nextEvent'))}${EVENT_TYPES.includes(next.type) ? ' · ' + esc(t(next.type)) : ''}</span><span class="t">${esc(L(next.title))}</span></div>${tri()}</a>`);
  }
  if (issues[0]) {
    latest.push(`<a class="latest-card" ${ext(safeUrl(issues[0].pdfUrl))}>
        ${cover(issues[0], 'mini')}
        <div class="body"><span class="k"><bdi>Vanguard</bdi> · ${esc(t('issue'))} ${esc(num(issues[0].number, 2))}</span><span class="t">${esc(t('readLatest'))}</span></div>${tri()}</a>`);
  }
  if (eps[0]) {
    latest.push(`<a class="latest-card is-night" ${ext(safeUrl(eps[0].url))}>
        <span class="play-dot">${play(24, '#F3F1EB')}</span>
        <div class="body"><span class="k">${esc(t('podcast'))} · ${esc(t('episode'))} ${esc(num(eps[0].number, 2))}</span><span class="t">${esc(L(eps[0].title))}</span></div></a>`);
  }
  if (latest.length) out += `<div class="wrap" style="margin-top:20px"><div class="latest">${latest.join('')}</div></div>`;

  if (upcoming.length) {
    out += section('h-events', esc(t('events')), `<div class="tickets">${upcoming.slice(0, 2).map((e, k) => ticket(e, k === 0)).join('')}</div>`,
      `<a class="btn btn-outline btn-sm" href="events.html">${esc(t('allEvents'))}</a>`);
  }
  if (issues.length) {
    out += section('h-mag', lang === 'ar' ? 'مجلة <bdi lang="en">Vanguard</bdi>' : 'Vanguard', shelf(issues.slice(0, 4), s),
      issues.length > 4 ? `<a class="btn btn-outline btn-sm" href="magazine.html">${esc(t('seeIssues'))}</a>` : '');
  }
  const missing = !c.events.length || !c.issues.length || !c.episodes.length;
  if (missing) {
    out += section('h-what', esc(lang === 'ar' ? 'ماذا نقدّم' : 'What we do'), whatWeDo(c),
      `<p>${esc(lang === 'ar' ? 'أربعة أنشطة، تُفتح أقسامها في الموقع مع أول محتوى' : 'Four activities. Each gets its own page here once its first content is out.')}</p>`);
  }
  if (eps.length) out += wrapSec(podBand(eps, s, false));
  if (!upcoming.length) out += wrapSec(followBand(s, !eps.length, c.events.length ? t('followText') : null));
  else out += wrapSec(joinBand(s));
  $('#dyn').innerHTML = out;
  startFilm();
}

function eventsPage(c, s) {
  const { upcoming, past } = splitEvents(c.events);
  const insta = safeUrl(s.instagram);
  if (!upcoming.length && !past.length) {
    $('#page-head').hidden = true;
    $('#dyn').innerHTML = `<div class="wrap"><section class="empty grid-bg" style="margin-top:4px">
        <div>
          <div class="eyebrow">${esc(t('events'))}</div>
          <h1>${esc(t('noEvents'))}</h1>
          <p>${esc(t('noEventsText'))}</p>
          <div class="actions">
            ${insta ? `<a class="btn btn-primary" ${ext(insta)}>${esc(t('followInsta'))}${tri()}</a>` : ''}
            <a class="btn ${insta ? 'btn-outline' : 'btn-primary'}" href="join.html">${esc(t('joinUs'))}</a>
          </div>
          <p style="font-size:16px"><a class="link-line" href="about.html#what">${esc(t('whatEvents'))}</a></p>
        </div>
        <div class="visual ghost-ticket" aria-hidden="true">
          ${tri()}
          <div class="gt">
            <div class="s"><div class="gtint" style="width:40%;height:62px"></div><div class="gtint" style="width:50%;height:14px"></div></div>
            <div class="b"><div class="gdash" style="width:90px;height:34px"></div><div class="gbar" style="width:70%;height:18px"></div><div class="gbar" style="width:46%;height:12px;opacity:.7"></div><div style="width:120px;height:40px;border-radius:20px;background:rgba(30,106,182,0.18)"></div></div>
          </div>
        </div>
      </section></div>`;
    return;
  }
  const types = EVENT_TYPES.filter((ty) => c.events.some((e) => e.type === ty));
  let out = '';
  if (types.length > 1) {
    out += `<div class="wrap" style="margin-top:22px"><div class="filters" role="group" aria-label="${esc(t('f_type'))}">
        <button type="button" class="chip" aria-pressed="true" data-f="">${esc(lang === 'ar' ? 'الكل' : 'All')}</button>
        ${types.map((ty) => `<button type="button" class="chip" aria-pressed="false" data-f="${esc(ty)}">${esc(t(ty))}</button>`).join('')}
      </div></div>`;
  }
  out += `<div id="ev-lists"></div>`;
  $('#dyn').innerHTML = out;

  const draw = (f) => {
    const up = upcoming.filter((e) => !f || e.type === f);
    const pa = past.filter((e) => !f || e.type === f);
    let h = '';
    if (up.length) h += section('h-up', esc(t('upcoming')), `<div class="tickets">${up.map((e, k) => ticket(e, k === 0 && !f)).join('')}</div>`);
    else {
      h += `<div class="wrap section"><article class="soon-card">
          <div class="ring" aria-hidden="true">${tri()}</div>
          <div><span class="k">${esc(t('nextEvent'))}</span><b>${esc(lang === 'ar' ? 'تُعلن قريبًا' : 'Announced soon')}</b>
          ${insta ? `<a ${ext(insta)}>${esc(lang === 'ar' ? 'تابعنا لتعرف أولًا' : 'Follow us to hear first')}</a>` : ''}</div>
        </article></div>`;
    }
    if (pa.length) h += section('h-past', esc(t('past')), `<div class="past">${pa.map(pastCard).join('')}</div>`);
    $('#ev-lists').innerHTML = h;
  };
  draw('');
  document.querySelectorAll('.filters .chip').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.filters .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw(b.dataset.f);
  }));
  if (location.hash) { const target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView({ block: 'center' }); }
}

function magazinePage(c, s) {
  const issues = [...c.issues].sort(byNumberDesc);
  const submit = safeUrl(s.submitUrl);
  if (!issues.length) {
    $('#page-head').hidden = true;
    $('#dyn').innerHTML = `<div class="wrap"><section class="empty grid-bg" style="margin-top:4px">
        <div>
          <div class="eyebrow">${lang === 'ar' ? 'مجلة <bdi lang="en">Vanguard</bdi>' : 'Vanguard magazine'}</div>
          <h1>${esc(t('noIssues'))}</h1>
          <p>${esc(t('noIssuesText'))}</p>
          <div class="actions">
            ${submit ? `<a class="btn btn-primary" ${ext(submit)}>${esc(t('submitNext'))}${tri()}</a>` : ''}
            <a class="btn ${submit ? 'btn-outline' : 'btn-primary'}" href="join.html">${esc(t('joinUs'))}</a>
          </div>
        </div>
        <div class="visual ghost-shelf" aria-hidden="true">
          <div class="gc"><span class="mono">VANGUARD</span><span class="mono">${esc(num(1, 2))}</span></div>
          <div class="gc faint"></div>
          <div class="gc fainter"></div>
        </div>
      </section></div>`;
    return;
  }
  const latest = issues[0];
  $('#head-actions').innerHTML = `${safeUrl(latest.pdfUrl) ? `<a class="btn btn-primary" ${ext(safeUrl(latest.pdfUrl))}>${esc(t('readLatest'))}${tri()}</a>` : ''}
    ${submit ? `<a class="btn btn-outline" ${ext(submit)}>${esc(t('submitWork'))}</a>` : ''}`;
  let out = section('h-shelf', esc(lang === 'ar' ? 'كل الأعداد' : 'All issues'), shelf(issues, s));
  out += `<div class="wrap section"><div class="issue-list">${issues.map((i) => `<a class="issue-row" ${ext(safeUrl(i.pdfUrl))}>
      <span class="n mono">${esc(num(i.number, 2))}</span>
      <span class="b"><b>${esc(L(i.title) || t('issue') + ' ' + num(i.number, 2))}</b>${L(i.summary) ? `<span>${esc(L(i.summary))}</span>` : ''}</span>
      <span class="mono m">${esc(monthName(i.month))}</span>
    </a>`).join('')}</div></div>`;
  $('#dyn').innerHTML = out;
}

function podcastPage(c, s) {
  const eps = [...c.episodes].sort(byNumberDesc);
  const insta = safeUrl(s.instagram);
  if (!eps.length) {
    $('#dyn').innerHTML = `<div class="wrap"><section class="empty pod-empty" style="margin-top:4px">
        <div>
          <div class="eyebrow" lang="en">PODCAST · The Architecture Show</div>
          <h1>${esc(t('noEps'))}</h1>
          <p>${esc(t('noEpsText'))}</p>
          <div class="actions">${insta ? `<a class="btn btn-light" ${ext(insta)}>${esc(t('followInsta'))}${tri()}</a>` : ''}<a class="btn btn-ghost-light" href="join.html">${esc(t('joinUs'))}</a></div>
        </div>
        <div class="visual ghost-pod" aria-hidden="true">
          <div class="ring">${play(30, '#5996D9')}</div>
          <div class="bars"><div style="width:70%"></div><div style="width:52%"></div><div style="width:60%"></div></div>
        </div>
      </section></div>`;
    return;
  }
  let out = `<div class="wrap" style="margin-top:4px">${podBand(eps, s, true)}</div>`;
  if (eps.length > 1) {
    out += section('h-eps', esc(t('allEpisodes')), `<div class="ep-list">${eps.map((p) => `<a class="ep-row" ${ext(safeUrl(p.url))}>
        <span class="pd">${play(16, '#F3F1EB')}</span>
        <span class="b"><b>${esc(L(p.title))}</b>${L(p.guest) ? `<span>${esc(L(p.guest))}</span>` : ''}</span>
        <span class="mono n" lang="en">EP ${esc(String(p.number).padStart(2, '0'))}${p.duration ? ' · ' + esc(p.duration) : ''}</span>
      </a>`).join('')}</div>`);
  }
  $('#dyn').innerHTML = out;
}

function aboutPage(c, s) {
  $('#what-slot').innerHTML = whatWeDo(c);
  const team = [...c.team].sort(byOrder);
  if (team.length) {
    $('#team-slot').innerHTML = section('h-team', esc(t('team')), `<div class="team">${team.map((p) => `<div class="person">
        ${safePhoto(p.photo) ? `<img class="avatar" src="${esc(safePhoto(p.photo))}" alt="" width="64" height="64" loading="lazy">` : `<span class="avatar" aria-hidden="true">${esc(p.initials || initialsFrom(L(p.name)))}</span>`}
        <div><div class="n">${esc(L(p.name))}</div><div class="r">${esc(L(p.role))}</div></div>
      </div>`).join('')}</div>`);
  }
  $('#band-slot').innerHTML = wrapSec(joinBand(s));
}
function aboutStory(story) {
  const slot = $('#story-slot');
  if (slot) renderStory(slot, story);
  if (location.hash === '#story') { const el = document.getElementById('story'); if (el) el.scrollIntoView(); }
}
function initialsFrom(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  const f = (x) => [...x.replace(/^(ال)(?=..)/, '')][0].toUpperCase();
  const l = w.length > 1 ? [f(w[0]), f(w[w.length - 1])] : [f(w[0])];
  return l.join(/[؀-ۿ]/.test(l.join('')) ? '‌' : '');
}

function joinPage(c, s) {
  const ar = lang === 'ar';
  const joinU = safeUrl(s.joinUrl), submit = safeUrl(s.submitUrl);
  const mail = s.email ? `mailto:${s.email}` : '';
  $('#dyn').innerHTML = wrapSec(`<h2 class="sr">${esc(t('waysToJoin'))}</h2><div class="ways">
      <article class="way">
        <div class="mark" aria-hidden="true"><div style="width:84px;height:40px;border-radius:20px;background:var(--blue)"></div><div style="width:40px;height:40px;border-radius:20px;background:var(--blue-tint)"></div></div>
        <h3>${ar ? 'تطوّع مع الفريق' : 'Volunteer with the team'}</h3>
        <p>${ar ? 'نظّم الفعاليات معنا، أو صمّم، أو صوّر، أو حرّر. لا يُشترط مستوى دراسي معيّن.' : 'Help us organize events, design, photograph or edit. Students of every year are welcome.'}</p>
        <div class="foot">${joinU ? `<a class="btn btn-primary btn-sm" ${ext(joinU)}>${ar ? 'انضم الآن' : 'Join now'}${tri()}</a>` : mail ? `<a class="btn btn-primary btn-sm" href="${esc(mail)}">${ar ? 'راسلنا' : 'Email us'}${tri()}</a>` : ''}</div>
      </article>
      <article class="way">
        <div class="mark" aria-hidden="true" style="align-items:flex-end"><div style="width:30px;height:42px;border-radius:3px;background:var(--night)"></div><div style="width:30px;height:42px;border-radius:3px;border:1.5px dashed rgba(17,20,24,0.4)"></div></div>
        <h3>${ar ? 'اكتب للمجلة' : 'Write for the magazine'}</h3>
        <p>${ar ? 'أرسل مقالًا أو مشروعًا أو رسمًا أو صورة لعدد قادم من <bdi lang="en">Vanguard</bdi>.' : 'Send an article, a project, a drawing or a photo for a coming issue of Vanguard.'}</p>
        <div class="foot">${submit ? `<a class="btn btn-outline btn-sm" ${ext(submit)}>${esc(t('submitNext'))}</a>` : mail ? `<a class="btn btn-outline btn-sm" href="${esc(mail)}">${ar ? 'راسلنا' : 'Email us'}</a>` : ''}</div>
      </article>
      <article class="way">
        <div class="mark" aria-hidden="true"><div style="width:40px;height:40px;border-radius:20px;background:var(--sand)"></div><div style="width:84px;height:40px;border-radius:20px;border:1.5px solid var(--ink)"></div></div>
        <h3>${ar ? 'تعال إلى فعالية' : 'Come to an event'}</h3>
        <p>${ar ? 'فعالياتنا مفتوحة لطلاب العمارة. تابعنا لتعرف بموعد الفعالية القادمة.' : 'Our events are open to architecture students. Follow us to hear when the next one is.'}</p>
        <div class="foot">${c.events.length ? `<a class="btn btn-outline btn-sm" href="events.html">${esc(t('seeEvents'))}</a>` : safeUrl(s.instagram) ? `<a class="btn btn-outline btn-sm" ${ext(safeUrl(s.instagram))}>${esc(t('followInsta'))}</a>` : ''}</div>
      </article>
    </div>`);
  const contact = [];
  if (s.email) contact.push(`<a class="btn btn-light btn-sm" href="mailto:${esc(s.email)}" dir="ltr">${esc(s.email)}</a>`);
  [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn']].forEach(([k, n]) => { if (safeUrl(s[k])) contact.push(`<a class="btn btn-ghost-light btn-sm" ${ext(safeUrl(s[k]))} lang="en">${n}</a>`); });
  if (contact.length) {
    $('#dyn').insertAdjacentHTML('beforeend', wrapSec(`<section class="band" aria-labelledby="contact-title">
        <div><h2 id="contact-title">${ar ? 'تواصل معنا' : 'Get in touch'}</h2>
        <p>${ar ? 'لفكرة فعالية أو تعاون أو سؤال، راسلنا أو اكتب لنا على حساباتنا.' : 'For an event idea, a collaboration or a question, email us or message us on our accounts.'}</p>
        <div class="actions">${contact.join('')}</div></div>
        <div class="motif" aria-hidden="true"><div class="p" style="width:120px;background:var(--blue)"></div>${tri()}<div class="p" style="width:84px;border:1.5px solid rgba(89,150,217,0.6)"></div></div>
      </section>`));
  }
}

// ---------- the logo film in the hero ----------
function startFilm() {
  const box = $('.film-box'); const cv = box && box.querySelector('canvas');
  if (!cv || !window.MemarFilm) return;
  const F = window.MemarFilm, colors = F.GROUNDS.night;
  const ctx = cv.getContext('2d');
  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  const still = F.STAGES[7] ? F.STAGES[7].b - 0.05 : F.DURATION * 0.8;   // the finished logo
  let visible = true, t0 = null, raf = 0, W = 0, H = 0;
  const size = () => {
    const r = box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  };
  const draw = (tt) => F.render(ctx, tt, W, H, colors, { lines: false });
  size();
  if (reduce) { draw(still); addEventListener('resize', () => { size(); draw(still); }); return; }
  const loop = (now) => {
    if (t0 == null) t0 = now;
    draw(((now - t0) / 1000) % F.DURATION);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const resume = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; resume(); }).observe(box);
  document.addEventListener('visibilitychange', resume);
  addEventListener('resize', () => { size(); });
  raf = requestAnimationFrame(loop);
}

// ---------- when the content can't be loaded ----------
function offline() {
  const box = `<div class="wrap section"><section class="m-offline" role="alert">
      <h2>${esc(t('offlineTitle'))}</h2><p>${esc(t('offlineText'))}</p>
      <button type="button" class="btn btn-primary btn-sm" data-retry>${esc(t('retry'))}</button></section></div>`;
  const slot = $('#dyn') || $('#story-slot');
  if (slot) slot.innerHTML = box; else $('#main').insertAdjacentHTML('beforeend', box);
  const b = document.querySelector('[data-retry]'); if (b) b.addEventListener('click', () => location.reload());
  if (page === 'home') startFilm();
}
function staleNote() {
  const n = document.createElement('p');
  n.className = 'stale-note'; n.setAttribute('role', 'status'); n.textContent = t('staleNote');
  $('#main').prepend(n);
}

// ---------- start ----------
async function main() {
  applyLang();
  const cached = readNav();
  header(cached);
  mobileMenu(cached, {});
  let be, c, s, look, failed = false, stale = false;
  const cache = isLive ? readCache() : null;
  if (cache && Date.now() - cache.at < CACHE_MS) {
    ({ c, s, look } = cache.data);
  } else {
    try {
      be = await backend();
      const [events, issues, episodes, settings, lk, story] = await Promise.all([
        be.list('events'), be.list('issues'), be.list('episodes'), be.settings(),
        be.settings('look').catch(() => null), be.settings('story').catch(() => null)
      ]);
      c = { events, issues, episodes, team: [], story }; s = settings || {}; look = lk;
      if (isLive) writeCache({ c, s, look });
    } catch (e) {
      console.error(e);
      // no connection: the last saved copy if there is one, otherwise say so instead of showing empty pages
      if (cache) { ({ c, s, look } = cache.data); stale = true; }
      else { c = { events: [], issues: [], episodes: [], team: [] }; s = {}; failed = true; }
    }
  }
  // the team and its photos are read only for the About page
  if (page === 'about' && !failed) {
    const tc = isLive ? readCache(TEAM_CACHE) : null;
    if (tc && Date.now() - tc.at < CACHE_MS) c.team = tc.data;
    else {
      try { be = be || await backend(); c.team = await be.list('team'); if (isLive) writeCache(c.team, TEAM_CACHE); }
      catch (e) { console.error(e); c.team = tc ? tc.data : []; }
    }
  }
  // the board's fonts and default appearance; remembered so the next page opens with them already applied
  if (window.MemarLook && !failed) window.MemarLook.update(look);
  lastSettings = s;
  const has = failed ? readNav() : { events: c.events.length > 0, issues: c.issues.length > 0, episodes: c.episodes.length > 0 };
  if (!failed) writeNav(has);
  header(has);
  mobileMenu(has, s);
  footer(s);
  demoNote(be && be.state);
  if (failed) { offline(); document.body.classList.add('ready'); return; }
  if (stale) staleNote();
  if (page === 'about') aboutStory(c.story);
  ({ home, events: eventsPage, magazine: magazinePage, podcast: podcastPage, about: aboutPage, join: joinPage }[page] || (() => {}))(c, s);
  document.body.classList.add('ready');
}
main();
