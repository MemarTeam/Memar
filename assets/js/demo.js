// Demo backend: the same calls as fb.js, kept in this browser's storage with example data.
// It also applies the same access rules as firestore.rules, so the demo behaves like the real site.
// ?demo=launch shows the site as it will look on day one; ?demo=full fills it with example content.

const KEY = 'memar-demo-v1';
const USER_KEY = 'memar-demo-user';

const day = 864e5;
function at(daysFromNow, hour, minute = 0) {
  // a Saudi-time date, N days from today
  const now = new Date(Date.now() + 3 * 3600e3);   // now in UTC+3
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow, hour - 3, minute));
  return d.toISOString().replace('.000Z', 'Z');
}
function ym(monthsAgo) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - monthsAgo);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
const ALL = { events: true, issues: true, episodes: true, team: true, tools: true };
const NONE = { events: false, issues: false, episodes: false, team: false, tools: false };

const SETTINGS = {
  instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/', linkedin: 'https://www.linkedin.com/',
  email: 'memar@example.com', podcastName: 'Spotify', podcastUrl: 'https://open.spotify.com/',
  joinUrl: 'https://forms.google.com/', submitUrl: 'https://forms.google.com/'
};

function m(id, ar, en, initials, color, isBoard, perms, email) {
  return { id, name: { ar, en }, initials, color, isBoard, perms, email, joinedAt: Date.now() - 20 * day };
}

function seed(state) {
  const me = m('m1', 'عضو ١', 'Member 1', 'ع١', 'blue', true, ALL, 'board@example.com');
  if (state === 'launch') {
    return { state, events: [], issues: [], episodes: [], team: [], settings: { ...SETTINGS, podcastUrl: '', podcastName: '' }, members: [me], invites: [], log: [] };
  }
  const stamp = (uid, ago) => ({ createdBy: uid, updatedBy: uid, updatedAt: Date.now() - ago });
  return {
    state: 'full',
    events: [
      { id: 'e1', type: 'workshop', title: { ar: 'الواجهات البارامترية', en: 'Parametric Facades' }, start: at(3, 18), place: { ar: 'استوديو التصميم، مبنى ٥', en: 'Design Studio, Building 5' }, guest: { ar: 'مع معماري ضيف', en: 'with a guest architect' }, summary: { ar: 'ورشة عملية نصمم فيها واجهة بارامترية من الفكرة حتى النموذج. أحضر حاسوبك. المقاعد محدودة.', en: 'A hands-on workshop designing a parametric facade from idea to model. Bring your laptop. Seats are limited.' }, registerUrl: 'https://forms.google.com/', ...stamp('m2', 0.1 * day) },
      { id: 'e2', type: 'designathon', title: { ar: 'ديزايناثون ٤٨ ساعة', en: '48-hour Designathon' }, start: at(15, 10), place: { ar: 'قاعة العرض، مبنى ٥', en: 'Exhibition Hall, Building 5' }, guest: { ar: 'بمشاركة طلاب من جامعات أخرى', en: 'with students from other universities' }, summary: { ar: 'فرق من أربعة طلاب، موقع حقيقي، وثمانٍ وأربعون ساعة لتقديم الفكرة أمام لجنة تحكيم.', en: 'Teams of four, a real site, and forty-eight hours to present an idea to a jury.' }, registerUrl: 'https://forms.google.com/', ...stamp('m1', 2 * day) },
      { id: 'e3', type: 'talk', title: { ar: 'العمارة والمناخ في نجد', en: 'Architecture and Climate in Najd' }, start: at(-18, 18), place: { ar: 'المدرج الرئيسي', en: 'Main Auditorium' }, summary: { ar: '', en: '' }, registerUrl: '', ...stamp('m2', 20 * day) },
      { id: 'e4', type: 'visit', title: { ar: 'زيارة موقع مشروع قيد الإنشاء', en: 'Visit to a building site' }, start: at(-40, 9), place: { ar: 'خارج الحرم', en: 'Off campus' }, summary: { ar: '', en: '' }, registerUrl: '', ...stamp('m1', 42 * day) }
    ],
    issues: [
      { id: 'i3', number: 3, title: { ar: 'الضوء في الاستوديو', en: 'Light in the Studio' }, month: ym(0), summary: { ar: 'كيف نقرأ الضوء الطبيعي ونرسمه، مع نصائح للوحات العرض.', en: 'Reading and drawing daylight, with tips for presentation boards.' }, pdfUrl: 'https://drive.google.com/', coverUrl: '', coverColor: 'night', ...stamp('m4', 1 * day) },
      { id: 'i2', number: 2, title: { ar: 'المواد', en: 'Materials' }, month: ym(1), summary: { ar: '', en: '' }, pdfUrl: 'https://drive.google.com/', coverUrl: '', coverColor: 'blue', ...stamp('m4', 31 * day) },
      { id: 'i1', number: 1, title: { ar: 'البداية', en: 'Beginnings' }, month: ym(2), summary: { ar: '', en: '' }, pdfUrl: 'https://drive.google.com/', coverUrl: '', coverColor: 'sand', ...stamp('m1', 61 * day) }
    ],
    episodes: [
      { id: 'p4', number: 4, title: { ar: 'من الاستوديو إلى الموقع', en: 'From Studio to Site' }, guest: { ar: 'خريج من القسم', en: 'a graduate of the department' }, url: 'https://open.spotify.com/', duration: '32:10', date: at(-4, 12).slice(0, 10), ...stamp('m3', 0.2 * day) },
      { id: 'p3', number: 3, title: { ar: 'كيف نختار مشروع التخرج', en: 'Choosing a Graduation Project' }, guest: { ar: 'أستاذة في القسم', en: 'a professor in the department' }, url: 'https://open.spotify.com/', duration: '27:45', date: at(-18, 12).slice(0, 10), ...stamp('m3', 19 * day) },
      { id: 'p2', number: 2, title: { ar: 'العمل في مكتب معماري', en: 'Working at an Architecture Office' }, guest: { ar: 'معماري ضيف', en: 'a guest architect' }, url: 'https://open.spotify.com/', duration: '29:02', date: at(-32, 12).slice(0, 10), ...stamp('m3', 33 * day) },
      { id: 'p1', number: 1, title: { ar: 'لماذا العمارة؟', en: 'Why Architecture?' }, guest: { ar: 'طلاب من السنة الأولى', en: 'first-year students' }, url: 'https://open.spotify.com/', duration: '24:30', date: at(-46, 12).slice(0, 10), ...stamp('m1', 47 * day) }
    ],
    team: [
      { id: 't1', name: { ar: 'عضو ١', en: 'Member 1' }, role: { ar: 'رئيس الفريق', en: 'Team lead' }, order: 1, initials: 'ع١', ...stamp('m1', 20 * day) },
      { id: 't2', name: { ar: 'عضو ٢', en: 'Member 2' }, role: { ar: 'الفعاليات', en: 'Events' }, order: 2, initials: 'ع٢', ...stamp('m1', 20 * day) },
      { id: 't3', name: { ar: 'عضو ٣', en: 'Member 3' }, role: { ar: 'البودكاست', en: 'Podcast' }, order: 3, initials: 'ع٣', ...stamp('m1', 20 * day) },
      { id: 't4', name: { ar: 'عضو ٤', en: 'Member 4' }, role: { ar: 'تحرير المجلة', en: 'Magazine editor' }, order: 4, initials: 'ع٤', ...stamp('m1', 20 * day) }
    ],
    settings: { ...SETTINGS },
    members: [
      me,
      m('m2', 'عضو ٢', 'Member 2', 'ع٢', 'green', false, { ...NONE, events: true, tools: true }, 'member2@example.com'),
      m('m3', 'عضو ٣', 'Member 3', 'ع٣', 'clay', false, { ...NONE, episodes: true, tools: true }, 'member3@example.com'),
      m('m4', 'عضو ٤', 'Member 4', 'ع٤', 'graphite', false, { ...NONE, issues: true }, 'member4@example.com')
    ],
    invites: [{ id: 'new.member@example.com', isBoard: false, perms: { ...NONE, team: true }, invitedBy: 'm1', at: Date.now() - day }],
    log: [
      L('m2', 'create', 'events', { ar: 'الواجهات البارامترية', en: 'Parametric Facades' }, 0.1 * day),
      L('m3', 'update', 'episodes', { ar: 'من الاستوديو إلى الموقع', en: 'From Studio to Site' }, 0.2 * day),
      L('m1', 'perm', 'access', { ar: 'عضو ٤', en: 'Member 4' }, 0.9 * day),
      L('m4', 'update', 'issues', { ar: 'الضوء في الاستوديو', en: 'Light in the Studio' }, 1 * day),
      L('m2', 'export', 'tools', { ar: 'الواجهات البارامترية', en: 'Parametric Facades' }, 1.1 * day),
      L('m1', 'create', 'events', { ar: 'ديزايناثون ٤٨ ساعة', en: '48-hour Designathon' }, 2 * day)
    ]
  };
  function L(uid, action, section, title, ago) {
    const who = { m1: ['عضو ١', 'Member 1', 'ع١', 'blue'], m2: ['عضو ٢', 'Member 2', 'ع٢', 'green'], m3: ['عضو ٣', 'Member 3', 'ع٣', 'clay'], m4: ['عضو ٤', 'Member 4', 'ع٤', 'graphite'] }[uid];
    return { id: 'l' + Math.random().toString(36).slice(2), uid, name: { ar: who[0], en: who[1] }, initials: who[2], color: who[3], action, section, title, at: Date.now() - ago };
  }
}

function read() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* storage blocked */ }
  return null;
}
let mem = null;   // used when storage is blocked
function load() {
  if (mem) return mem;
  return read() || (mem = seed('full'));
}
function store(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); mem = null; } catch (e) { mem = db; }
}

function denied() { const e = new Error('permission-denied'); e.code = 'permission-denied'; return e; }
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
const newId = () => Math.random().toString(36).slice(2, 10);

export function create() {
  // ?demo=launch or ?demo=full resets the example data
  try {
    const url = new URL(location.href);
    const q = url.searchParams.get('demo');
    if (q === 'launch' || q === 'full') {
      store(seed(q));
      try { sessionStorage.removeItem(USER_KEY); } catch (e) { /* storage blocked */ }
      url.searchParams.delete('demo');
      history.replaceState(null, '', url.toString());
    }
  } catch (e) { /* ignore */ }
  if (!read()) store(seed('full'));

  let user = null;
  try { const u = sessionStorage.getItem(USER_KEY); if (u) user = JSON.parse(u); } catch (e) { /* storage blocked */ }
  const listeners = new Set();
  const emit = () => listeners.forEach((cb) => cb(user));

  function member(db) { return user ? db.members.find((x) => x.id === user.uid) || null : null; }
  function can(db, section) {
    const me = member(db);
    if (!me) return false;
    if (section === 'settings' || section === 'access' || section === 'log') return !!me.isBoard;
    return !!(me.isBoard || (me.perms && me.perms[section]));
  }
  function addLog(db, entry) {
    const me = member(db);
    db.log.unshift({ id: 'l' + newId(), uid: me.id, name: me.name, initials: me.initials, color: me.color, at: Date.now(), ...entry });
    if (db.log.length > 1000) db.log.length = 1000;
  }

  return {
    kind: 'demo',
    get state() { return load().state; },

    // ---- public content ----
    async list(col) { await pause(60); return clone(load()[col] || []); },
    // settings/site holds links; settings/look the fonts and appearance; settings/story the About page's logo story
    async settings(id = 'site') { await pause(30); const db = load(); return clone(id === 'site' ? db.settings || {} : (db.docs && db.docs[id]) || {}); },

    // ---- sign-in ----
    onAuth(cb) { listeners.add(cb); setTimeout(() => cb(user), 0); return () => listeners.delete(cb); },
    async demoSignIn(uid) {
      const db = load();
      const mm = db.members.find((x) => x.id === uid);
      if (!mm) throw denied();
      user = { uid, email: mm.email, name: mm.name.ar };
      try { sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* storage blocked */ }
      emit();
    },
    async signInGoogle() { throw Object.assign(new Error('demo'), { code: 'demo' }); },
    async sendLink() { throw Object.assign(new Error('demo'), { code: 'demo' }); },
    async completeLink() { return null; },
    async signOut() {
      user = null;
      try { sessionStorage.removeItem(USER_KEY); } catch (e) { /* storage blocked */ }
      emit();
    },

    // ---- members ----
    async me() { await pause(80); const mm = member(load()); return mm ? { member: clone(mm) } : { notInvited: true }; },
    async members() { const db = load(); if (!member(db)) throw denied(); return clone(db.members); },
    async updateMember(uid, patch, logEntry) {
      const db = load(); const me = member(db); if (!me) throw denied();
      const target = db.members.find((x) => x.id === uid); if (!target) throw denied();
      const adminKeys = ['isBoard', 'perms', 'email'];
      if (!me.isBoard && (uid !== me.id || Object.keys(patch).some((k) => adminKeys.includes(k)))) throw denied();
      Object.assign(target, clone(patch));
      if (logEntry) addLog(db, logEntry);
      store(db); await pause(120);
    },
    async removeMember(uid, logEntry) {
      const db = load(); const me = member(db); if (!me || !me.isBoard || uid === me.id) throw denied();
      db.members = db.members.filter((x) => x.id !== uid);
      addLog(db, logEntry); store(db); await pause(120);
    },
    async invites() { const db = load(); if (!can(db, 'access')) throw denied(); return clone(db.invites); },
    async invite(email, data, logEntry) {
      const db = load(); if (!can(db, 'access')) throw denied();
      const id = String(email).trim().toLowerCase();
      db.invites = db.invites.filter((x) => x.id !== id);
      db.invites.unshift({ id, ...clone(data), invitedBy: user.uid, at: Date.now() });
      addLog(db, logEntry); store(db); await pause(150);
    },
    async revokeInvite(email, logEntry) {
      const db = load(); if (!can(db, 'access')) throw denied();
      db.invites = db.invites.filter((x) => x.id !== email);
      addLog(db, logEntry); store(db); await pause(120);
    },

    // ---- content ----
    async save(col, id, data, logEntry) {
      const db = load(); if (!can(db, col)) throw denied();
      const list = db[col];
      const stampNow = { updatedBy: user.uid, updatedAt: Date.now() };
      if (id) {
        const i = list.findIndex((x) => x.id === id); if (i < 0) throw denied();
        list[i] = { ...list[i], ...clone(data), ...stampNow };
      } else {
        id = newId();
        list.push({ id, ...clone(data), createdBy: user.uid, ...stampNow });
      }
      addLog(db, logEntry); store(db); await pause(180);
      return id;
    },
    async remove(col, id, logEntry) {
      const db = load(); if (!can(db, col)) throw denied();
      db[col] = db[col].filter((x) => x.id !== id);
      addLog(db, logEntry); store(db); await pause(150);
    },
    async saveSettings(data, logEntry, id = 'site') {
      const db = load(); if (!can(db, 'settings')) throw denied();
      const stamped = { ...clone(data), updatedBy: user.uid, updatedAt: Date.now() };
      if (id === 'site') db.settings = { ...db.settings, ...stamped };
      else { db.docs = db.docs || {}; db.docs[id] = { ...(db.docs[id] || {}), ...stamped }; }
      addLog(db, logEntry); store(db); await pause(150);
    },
    async log() { const db = load(); if (!can(db, 'log')) throw denied(); return clone(db.log).map((x) => ({ ...x, at: new Date(x.at) })); },
    async addLog(entry) { const db = load(); if (!member(db)) throw denied(); addLog(db, entry); store(db); }
  };
}
