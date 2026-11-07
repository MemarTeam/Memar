// The words on the public pages that the board can change (members' area → Page text).
// The original words live in i18n.js; the page files carry the same words, marked data-t="key", so a page
// reads well before any script runs. A saved change is kept in /settings/text as { copy: { key: { ar, en } } }
// and replaces the original wherever the key is used.
import { STR, t } from './i18n.js';

// [key, label [ar, en], also shown on [ar, en]]
export const COPY = [
  { id: 'home', name: ['الرئيسية', 'Home'], href: 'index.html', items: [
    ['heroEyebrow', ['السطر فوق العنوان', 'Line above the title']],
    ['heroTitle', ['العنوان', 'Title']],
    ['heroLede', ['النص تحت العنوان', 'Text under the title']],
    ['firstToKnow', ['عنوان شريط المتابعة (حين لا فعالية قادمة)', 'Follow band title (when no event is coming up)']],
    ['firstToKnowText', ['نص شريط المتابعة قبل أول فعالية', 'Follow band text, before the first event']],
    ['followText', ['نص شريط المتابعة بعد ذلك', 'Follow band text, after that']]
  ] },
  { id: 'what', name: ['ماذا نقدّم', 'What we do'], href: 'about.html#what', items: [
    ['whatTitle', ['العنوان', 'Title'], ['الرئيسية ومن نحن', 'Home and About']],
    ['whatLede', ['السطر بجانب العنوان', 'Line beside the title'], ['الرئيسية', 'Home']],
    ['wWorkT', ['الورش والمحاضرات: العنوان', 'Workshops and talks: title']],
    ['wWork', ['الورش والمحاضرات: النص', 'Workshops and talks: text']],
    ['wDesignT', ['الديزايناثون: العنوان', 'Designathons: title']],
    ['wDesign', ['الديزايناثون: النص', 'Designathons: text']]
  ] },
  { id: 'about', name: ['من نحن', 'About'], href: 'about.html', items: [
    ['aboutEyebrow', ['السطر فوق العنوان', 'Line above the title']],
    ['aboutTitle', ['العنوان', 'Title']],
    ['aboutLede', ['النص تحت العنوان', 'Text under the title']],
    ['aboutP1', ['الفقرة الأولى', 'First paragraph']],
    ['aboutP2', ['الفقرة الثانية', 'Second paragraph']],
    ['goal1T', ['الهدف ١: العنوان', 'Goal 1: title']], ['goal1', ['الهدف ١: النص', 'Goal 1: text']],
    ['goal2T', ['الهدف ٢: العنوان', 'Goal 2: title']], ['goal2', ['الهدف ٢: النص', 'Goal 2: text']],
    ['goal3T', ['الهدف ٣: العنوان', 'Goal 3: title']], ['goal3', ['الهدف ٣: النص', 'Goal 3: text']],
    ['goal4T', ['الهدف ٤: العنوان', 'Goal 4: title']], ['goal4', ['الهدف ٤: النص', 'Goal 4: text']]
  ] },
  { id: 'events', name: ['الفعاليات', 'Events'], href: 'events.html', items: [
    ['eventsEyebrow', ['السطر فوق العنوان', 'Line above the title']],
    ['eventsHead', ['العنوان', 'Title']],
    ['eventsLede', ['النص تحت العنوان', 'Text under the title']],
    ['noEvents', ['العنوان حين لا توجد فعاليات', 'Title when there are no events']],
    ['noEventsText', ['النص حين لا توجد فعاليات', 'Text when there are no events']]
  ] },
  { id: 'magazine', name: ['المجلة', 'Magazine'], href: 'magazine.html', items: [
    ['magEyebrow', ['السطر فوق العنوان', 'Line above the title']],
    ['magLede', ['النص تحت العنوان', 'Text under the title'], ['«ماذا نقدّم»', '“What we do”']],
    ['noIssues', ['العنوان قبل العدد الأول', 'Title before the first issue']],
    ['noIssuesText', ['النص قبل العدد الأول', 'Text before the first issue']]
  ] },
  { id: 'podcast', name: ['البودكاست', 'Podcast'], href: 'podcast.html', items: [
    ['podLede', ['التعريف بالبودكاست', 'About the podcast'], ['الرئيسية و«ماذا نقدّم»', 'Home and “What we do”']],
    ['noEps', ['العنوان قبل الحلقة الأولى', 'Title before the first episode']],
    ['noEpsText', ['النص قبل الحلقة الأولى', 'Text before the first episode']]
  ] },
  { id: 'join', name: ['انضم إلينا', 'Join us'], href: 'join.html', items: [
    ['joinEyebrow', ['السطر فوق العنوان', 'Line above the title']],
    ['joinTitle', ['العنوان', 'Title']],
    ['joinLede', ['النص تحت العنوان', 'Text under the title'], ['شريط الانضمام في الرئيسية ومن نحن', 'the Join band on Home and About']],
    ['wayVolT', ['التطوع: العنوان', 'Volunteer: title']], ['wayVol', ['التطوع: النص', 'Volunteer: text']],
    ['wayWriteT', ['الكتابة للمجلة: العنوان', 'Write for the magazine: title']], ['wayWrite', ['الكتابة للمجلة: النص', 'Write for the magazine: text']],
    ['wayComeT', ['حضور فعالية: العنوان', 'Come to an event: title']], ['wayCome', ['حضور فعالية: النص', 'Come to an event: text']],
    ['contactT', ['التواصل: العنوان', 'Get in touch: title']], ['contact', ['التواصل: النص', 'Get in touch: text']]
  ] },
  { id: 'footer', name: ['أسفل الصفحات', 'Footer'], href: 'index.html#site-footer', items: [
    ['footer', ['السطر أسفل كل صفحة', 'Line at the bottom of every page']]
  ] }
];
export const COPY_KEYS = COPY.flatMap((g) => g.items.map((i) => i[0]));

// the original words, before any change is applied
export const ORIGINAL = { ar: {}, en: {} };
COPY_KEYS.forEach((k) => { ORIGINAL.ar[k] = STR.ar[k]; ORIGINAL.en[k] = STR.en[k]; });

const MAX = 600;
const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX) : '');

// keeps only known keys and real text, so a saved document can't put anything else on the pages
export function tidy(over) {
  const out = {};
  if (!over || typeof over !== 'object') return out;
  COPY_KEYS.forEach((k) => {
    const v = over[k];
    if (!v || typeof v !== 'object') return;
    const e = {};
    ['ar', 'en'].forEach((lg) => { const s = clean(v[lg]); if (s && s !== ORIGINAL[lg][k]) e[lg] = s; });
    if (e.ar || e.en) out[k] = e;
  });
  return out;
}

// puts the board's words in place of the originals (and the originals back where a change was removed)
export function useCopy(over) {
  const o = tidy(over);
  COPY_KEYS.forEach((k) => {
    STR.ar[k] = (o[k] && o[k].ar) || ORIGINAL.ar[k];
    STR.en[k] = (o[k] && o[k].en) || ORIGINAL.en[k];
  });
}

// the words written into the page files
export function applyStatic(root = document) {
  root.querySelectorAll('[data-t]').forEach((el) => {
    const k = el.dataset.t;
    if (COPY_KEYS.includes(k)) el.textContent = t(k);
  });
}

// the last words seen, so a returning visitor's page opens with them
const KEY = 'memar-copy';
export function readCopy() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
export function writeCopy(over) {
  try {
    const o = tidy(over);
    if (Object.keys(o).length) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY);
  } catch (e) { /* storage blocked */ }
}
