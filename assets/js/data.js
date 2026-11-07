// One way in to the club's content, whether it lives in Firebase or, for the demo, in this browser.
// Every page imports from here, never from fb.js or demo.js directly.
import { firebaseConfig } from './firebase-config.js';

export const isLive = !!(firebaseConfig && firebaseConfig.apiKey);

// The public pages keep a copy of the content for two minutes, so moving between pages doesn't re-read
// everything from Firebase (it keeps the free daily limit far away), and so a dropped connection still
// shows the last copy. Saving anything in the members' area clears it.
const CACHE_KEY = 'memar-content-cache';
// the team (with its photos) is only needed on the About page, so it has its own copy
export const TEAM_CACHE = 'memar-team-cache';
export function readCache(key = CACHE_KEY) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
export function writeCache(data, key = CACHE_KEY) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* storage full or blocked */ } }
export function clearCache() { try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(TEAM_CACHE); } catch (e) { /* storage blocked */ } }
export const CACHE_MS = 2 * 60 * 1000;

let pending = null;
export function backend() {
  if (!pending) {
    pending = isLive
      ? import('./fb.js').then((m) => m.create(firebaseConfig))
      : import('./demo.js').then((m) => m.create());
  }
  return pending;
}

// the sections members can be given access to; board members can do all of these plus settings and access
export const SECTIONS = ['events', 'issues', 'episodes', 'team', 'tools'];
export const CONTENT = ['events', 'issues', 'episodes', 'team'];
export const EVENT_TYPES = ['workshop', 'designathon', 'talk', 'visit'];

// member tag colours: [solid, tint]
export const TAG_COLORS = {
  blue: ['#1E6AB6', '#DCE9F9'],
  green: ['#267450', '#DEF1E5'],
  clay: ['#A85334', '#F1DED4'],
  night: ['#082F54', '#D6E0EB'],
  graphite: ['#51565B', '#E7ECF2'],
  ink: ['#111418', '#E2E1DC']
};

// Event times are written and shown in Saudi time, whatever the visitor's clock says.
export const SITE_OFFSET = '+03:00';
export const SITE_TZ = 'Asia/Riyadh';
export function eventDate(e) { return e && e.start ? new Date(e.start) : null; }

// an event counts as upcoming until three hours after it starts
export function splitEvents(list) {
  const now = Date.now();
  const withDate = list.filter((e) => eventDate(e) && !isNaN(eventDate(e)));
  const upcoming = withDate.filter((e) => eventDate(e).getTime() + 3 * 3600e3 > now)
    .sort((a, b) => eventDate(a) - eventDate(b));
  const past = withDate.filter((e) => eventDate(e).getTime() + 3 * 3600e3 <= now)
    .sort((a, b) => eventDate(b) - eventDate(a));
  return { upcoming, past };
}
export const byNumberDesc = (a, b) => (Number(b.number) || 0) - (Number(a.number) || 0);
export const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);

// initials for a tag or avatar. Arabic letters would join into a word, so a zero-width non-joiner keeps them apart.
export function initialsOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = (w) => {
    const c = [...w.replace(/^(ال)(?=..)/, '')][0] || '';
    return c.toUpperCase();
  };
  const letters = words.length > 1 ? [first(words[0]), first(words[words.length - 1])] : [first(words[0])];
  const arabic = /[؀-ۿ]/.test(letters.join(''));
  return letters.join(arabic ? '‌' : '');
}

// a team photo is a small picture stored with its entry: only an image held as data is accepted
export function safePhoto(u) {
  const s = String(u || '');
  return s.length < 300000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
}

// a person can hold several positions, written one per line
export function lines(s) {
  return String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

export function safeUrl(u) {
  const s = String(u || '').trim();
  return /^(https?:|mailto:)/i.test(s) ? s : '';
}
