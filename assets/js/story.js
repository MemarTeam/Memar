// The logo story on the About page: the idea behind the logo, three stills from the logo film, and the film
// itself with its nine chapters. The words are stored in settings/story and edited by the board; until they
// edit them, the text below is used. The film's chapter times come from the film itself.
import { lang, L, t } from './i18n.js';
import { esc } from './ui.js';

export const DEFAULT_STORY = {
  visible: true,
  title: { ar: 'قصة الشعار', en: 'The story of the logo' },
  logo: {
    ar: 'يبدأ كل حرف في شعار معمار مربعًا. خمسة مربعات متشابهة تقف على خط واحد، ويُقصّ من كل منها جزء صغير فيصير حرفًا من حروف MEMAR. الأصل واحد، والقَصّة وحدها تعطي كل حرف شخصيته.\n\nهكذا نرى الفريق: طلاب من مستويات مختلفة يبدؤون من المكان نفسه، ولكلٍّ منهم دوره في الكلمة.\n\nوالجزء المقصوص من حرف E هو المثلث الأزرق، اللون الوحيد في الشعار. يشير إلى الأمام، ويعني الحركة والنشاط وما يحدث الآن، ولذلك لا نستعمله في الموقع إلا لما يحدث الآن: الفعالية القادمة، والعدد الأحدث، وزر التسجيل.',
    en: 'Every letter in the Memar logo starts as a square. Five matching squares stand on one line, and a small cut turns each one into a letter: M, E, M, A, R. They share one origin; the cut alone gives each letter its character.\n\nThat is how we see the team: students from different years who start from the same place, each with a part to play in the word.\n\nThe piece cut from the E is the blue triangle, the only colour in the logo. It points forward and stands for movement, activity and what is happening now, so on this site it marks only what is happening now: the next event, the latest issue, the register button.'
  },
  steps: [
    { ar: 'مربع واحد للجميع', en: 'One square for everyone' },
    { ar: 'قَصّة صغيرة تعطيه شخصيته', en: 'A small cut gives it character' },
    { ar: 'والمقصوص يصير علامة النشاط', en: 'The cut-out piece becomes the mark of activity' }
  ],
  filmTitle: { ar: 'فيلم الشعار: «معًا»', en: 'The logo film: Together' },
  film: {
    ar: 'يحكي الفيلم الفكرة نفسها في أربع وثلاثين ثانية، ثم يعود إلى بدايته ويتكرر: من قطعة وحيدة تبحث عن شكلها، إلى فريق يقف على خط واحد، ثم إلى البداية من جديد.',
    en: 'The film tells the same idea in thirty-four seconds, then returns to where it began and plays again: from a single piece looking for its shape, to a team standing on one line, and back to the start.'
  },
  chapters: [
    { title: { ar: 'وحيد', en: 'Alone' }, text: { ar: 'قطعة واحدة تجرّب أشكالًا كثيرة ولا تستقر على واحد منها.', en: 'One piece tries on many shapes and settles on none.' } },
    { title: { ar: 'كلٌّ وحده', en: 'Everyone alone' }, text: { ar: 'تظهر قطع كثيرة، كل واحدة تدور حول نفسها.', en: 'Many pieces appear, each turning on its own.' } },
    { title: { ar: 'إدراك', en: 'Realizing' }, text: { ar: 'تكتشف القطع أنها في أصلها مربعات متشابهة.', en: 'The pieces find they are all the same square underneath.' } },
    { title: { ar: 'اكتشاف', en: 'Discovering' }, text: { ar: 'تقترب من بعضها وتبدأ الحركة معًا.', en: 'They draw closer and start to move together.' } },
    { title: { ar: 'انسجام', en: 'Harmony' }, text: { ar: 'دائرة واحدة بإيقاع واحد.', en: 'One circle, one rhythm.' } },
    { title: { ar: 'معًا', en: 'Together' }, text: { ar: 'تخرج بالترتيب وتصطف على خط واحد، كلٌّ في مكان حرفه.', en: 'They leave in order and line up, each in the place of its letter.' } },
    { title: { ar: 'معنى', en: 'Meaning' }, text: { ar: 'يُقصّ من كل مربع جزؤه فيصير حرفًا.', en: 'Each square loses its piece and becomes a letter.' } },
    { title: { ar: 'نشاط', en: 'Activity' }, text: { ar: 'يعود المثلث إلى مكانه ويصير أزرق.', en: 'The triangle returns to its place and turns blue.' } },
    { title: { ar: 'عودة إلى واحد', en: 'Back to one' }, text: { ar: 'يمضي المثلث إلى الأمام، ويعود الحرف الأول مربعًا.', en: 'The triangle moves on, and the first letter becomes a square again.' } }
  ]
};

// the moments the three stills are taken from: five squares in a row, the cut, the finished logo
export const STEP_TIMES = [22.6, 25.3, 28.3];

const clone = (o) => JSON.parse(JSON.stringify(o));
// fill any gaps in a saved story with the defaults, so a half-filled save still shows a whole section
export function withDefaults(saved) {
  const s = clone(DEFAULT_STORY);
  if (!saved) return s;
  const pick = (v, d) => (v && (v.ar || v.en) ? { ar: v.ar || '', en: v.en || '' } : d);
  s.visible = saved.visible !== false;
  ['title', 'logo', 'filmTitle', 'film'].forEach((k) => { s[k] = pick(saved[k], s[k]); });
  s.steps = s.steps.map((d, i) => pick(saved.steps && saved.steps[i], d));
  s.chapters = s.chapters.map((d, i) => {
    const c = (saved.chapters && saved.chapters[i]) || {};
    return { title: pick(c.title, d.title), text: pick(c.text, d.text) };
  });
  return s;
}

const paras = (txt) => String(txt || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function renderStory(slot, saved) {
  const F = window.MemarFilm;
  const s = withDefaults(saved);
  if (!s.visible || !F) { slot.innerHTML = ''; return; }
  const stages = F.STAGES;
  slot.innerHTML = `<section class="wrap section story" id="story" aria-labelledby="story-title">
      <div class="section-head"><h2 id="story-title">${esc(L(s.title))}</h2></div>
      <div class="story-logo">
        <div class="prose">${paras(L(s.logo))}</div>
        <ol class="story-steps">${s.steps.map((st, i) => `<li><canvas data-step="${i}" aria-hidden="true"></canvas><span>${esc(L(st))}</span></li>`).join('')}</ol>
      </div>
      <div class="story-film">
        <div class="story-player">
          <div class="film-box"><canvas aria-hidden="true"></canvas></div>
          <div class="story-controls">
            <button type="button" class="btn btn-sm btn-outline" data-play></button>
            <div class="story-bar" aria-hidden="true"><i></i></div>
            <span class="mono" dir="ltr" data-time>0:00</span>
          </div>
        </div>
        <div class="story-text">
          <h3>${esc(L(s.filmTitle))}</h3>
          <div class="prose small">${paras(L(s.film))}</div>
          <ol class="chapters">${stages.map((st, i) => {
            const c = s.chapters[i] || { title: { en: st.name }, text: {} };
            return `<li><button type="button" data-ch="${i}"><span class="mono t" dir="ltr">${clock(st.a)}</span><span class="c"><b>${esc(L(c.title))}</b><span>${esc(L(c.text))}</span></span></button></li>`;
          }).join('')}</ol>
        </div>
      </div>
    </section>`;

  // ----- the three stills, drawn from the film in the page's colours -----
  const css = getComputedStyle(document.documentElement);
  const ground = () => ({ bg: css.getPropertyValue('--surface').trim() || '#FFFFFF', shape: css.getPropertyValue('--text').trim() || '#111418', tri: css.getPropertyValue('--logo-tri').trim() || '#1E6AB6' });
  const stills = [...slot.querySelectorAll('[data-step]')];
  function drawStills() {
    const g = ground();
    stills.forEach((cv) => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr));
      // the film frames the logo for a wide screen; drawing it 1.3× wider and keeping the middle fills a small card
      const W = Math.round(cv.width * 1.3), H = Math.round(W * 9 / 16);
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      F.render(off.getContext('2d'), STEP_TIMES[+cv.dataset.step], W, H, g, { lines: false });
      const ctx = cv.getContext('2d');
      ctx.fillStyle = g.bg; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(off, Math.round((W - cv.width) / 2), Math.round((H - cv.height) / 2), cv.width, cv.height, 0, 0, cv.width, cv.height);
    });
  }

  // ----- the film with its chapters -----
  const box = slot.querySelector('.film-box'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const playBtn = slot.querySelector('[data-play]'), timeEl = slot.querySelector('[data-time]'), bar = slot.querySelector('.story-bar i');
  const chBtns = [...slot.querySelectorAll('[data-ch]')];
  let reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  let time = reduce ? stages[7].b - 0.05 : 0, playing = !reduce, visible = false, raf = 0, last = null, cur = -1;
  const colors = F.GROUNDS.night;
  function size() {
    const r = box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw() {
    size();
    F.render(ctx, time, cv.width, cv.height, colors, { lines: false });
    timeEl.textContent = clock(time);
    bar.style.width = (time / F.DURATION * 100).toFixed(2) + '%';
    let k = 0; stages.forEach((st, i) => { if (time >= st.a) k = i; });
    if (k !== cur) { cur = k; chBtns.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'))); }
  }
  function label() {
    playBtn.innerHTML = playing
      ? `<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true" fill="currentColor"><rect x="2" y="1" width="3.5" height="12"/><rect x="8.5" y="1" width="3.5" height="12"/></svg>${esc(t('pause'))}`
      : `<svg viewBox="0 0 48 96" width="7" height="14" aria-hidden="true" fill="currentColor"><path d="M0 0 L48 48 L0 96 Z"/></svg>${esc(t('play'))}`;
  }
  function tick(now) {
    raf = 0;
    if (playing && last != null) time = (time + (now - last) / 1000) % F.DURATION;
    last = now;
    draw();
    if (playing && visible && !document.hidden) raf = requestAnimationFrame(tick);
    else last = null;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  playBtn.addEventListener('click', () => { playing = !playing; label(); last = null; kick(); });
  chBtns.forEach((b, i) => b.addEventListener('click', () => {
    time = stages[i].a + 0.01;
    if (reduce) { time = (stages[i].a + stages[i].b) / 2; playing = false; }
    else { playing = true; }
    label(); last = null; kick();
  }));
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; last = null; if (visible) kick(); }).observe(box);
  else visible = true;
  document.addEventListener('visibilitychange', () => { last = null; kick(); });
  addEventListener('resize', () => { drawStills(); kick(); });
  addEventListener('memar-theme', () => { drawStills(); });
  label();
  draw();
  drawStills();
}
