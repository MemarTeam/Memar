// Firebase backend: Firestore for content, members and the edit history; Firebase Auth for sign-in.
// Loaded only when firebase-config.js has a config. Access rules live in firestore.rules — this file
// only makes the requests; Firebase refuses anything the rules don't allow.

const V = '10.12.2';
const SDK = `https://www.gstatic.com/firebasejs/${V}/`;
const LINK_KEY = 'memar-signin-email';

export async function create(config) {
  const [appMod, authMod, fs] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js')
  ]);
  const app = appMod.initializeApp(config);
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  const {
    collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, query, orderBy, limit: lim
  } = fs;

  let user = null;
  let meCache = null;

  const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
  const withId = (snap) => ({ id: snap.id, ...snap.data() });
  const email = () => (user && user.email ? user.email.toLowerCase() : '');

  // every change is written together with its line in the edit history, in one batch
  function logRef() { return doc(collection(db, 'log')); }
  function logDoc(entry) {
    const me = meCache;
    return { uid: user.uid, name: me.name, initials: me.initials, color: me.color, at: serverTimestamp(), ...entry };
  }

  return {
    kind: 'firebase',
    state: 'live',

    async list(col) {
      const snap = await getDocs(collection(db, col));
      return snap.docs.map(withId);
    },
    // settings/site holds links; settings/look the fonts and appearance; settings/story the About page's logo story
    async settings(id = 'site') {
      const snap = await getDoc(doc(db, 'settings', id));
      return snap.exists() ? snap.data() : {};
    },

    onAuth(cb) {
      return authMod.onAuthStateChanged(auth, (u) => {
        user = u; meCache = null;
        cb(u ? { uid: u.uid, email: u.email, name: u.displayName || '' } : null);
      });
    },
    async signInGoogle() {
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authMod.signInWithPopup(auth, provider);
    },
    async sendLink(address) {
      const url = location.href.split('#')[0].split('?')[0];
      await authMod.sendSignInLinkToEmail(auth, address, { url, handleCodeInApp: true });
      try { localStorage.setItem(LINK_KEY, address); } catch (e) { /* storage blocked */ }
    },
    // finishes an email-link sign-in if this page was opened from one. Returns 'need-email' when the
    // link was opened on another device and the address has to be typed again.
    async completeLink(typed) {
      if (!authMod.isSignInWithEmailLink(auth, location.href)) return null;
      let address = typed;
      if (!address) { try { address = localStorage.getItem(LINK_KEY); } catch (e) { /* storage blocked */ } }
      if (!address) return 'need-email';
      await authMod.signInWithEmailLink(auth, address, location.href);
      try { localStorage.removeItem(LINK_KEY); } catch (e) { /* storage blocked */ }
      history.replaceState(null, '', location.pathname);
      return 'done';
    },
    async signOut() { await authMod.signOut(auth); },

    // the signed-in person's member record; on their first visit, their invite becomes a member record
    async me() {
      if (!user) return { notInvited: true };
      const ref = doc(db, 'members', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) { meCache = { id: snap.id, ...snap.data() }; return { member: meCache }; }
      if (!email()) return { notInvited: true };
      let inv;
      try { inv = await getDoc(doc(db, 'invites', email())); } catch (e) { return { notInvited: true }; }
      if (!inv.exists()) return { notInvited: true };
      const i = inv.data();
      const display = user.displayName || email().split('@')[0];
      const name = i.name && (i.name.ar || i.name.en) ? i.name : { ar: display, en: display };
      const data = {
        email: email(), name, initials: i.initials || initials(name.ar || name.en), color: i.color || 'blue',
        isBoard: !!i.isBoard, perms: i.perms || {}, joinedAt: serverTimestamp()
      };
      const b = writeBatch(db);
      b.set(ref, data);
      b.delete(doc(db, 'invites', email()));
      meCache = { id: user.uid, ...data };
      b.set(logRef(), logDoc({ action: 'join', section: 'access', title: name }));
      await b.commit();
      meCache.joinedAt = new Date();
      return { member: meCache };
    },
    async members() {
      const snap = await getDocs(collection(db, 'members'));
      return snap.docs.map(withId);
    },
    async updateMember(uid, patch, logEntry) {
      const b = writeBatch(db);
      if (logEntry) {
        // the board changing someone's access: stamped, with its history line (firestore.rules checks both)
        const lr = logRef();
        b.update(doc(db, 'members', uid), { ...patch, updatedBy: user.uid, updatedAt: serverTimestamp(), lastLog: lr.id });
        b.set(lr, logDoc(logEntry));
      } else {
        b.update(doc(db, 'members', uid), patch);
      }
      await b.commit();
      if (uid === user.uid) Object.assign(meCache, patch);
    },
    async removeMember(uid, logEntry) {
      const b = writeBatch(db);
      b.delete(doc(db, 'members', uid));
      b.set(logRef(), logDoc(logEntry));
      await b.commit();
    },
    async invites() {
      const snap = await getDocs(collection(db, 'invites'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data(), at: toDate(d.data().at) }));
    },
    async invite(address, data, logEntry) {
      const b = writeBatch(db);
      const lr = logRef();
      b.set(doc(db, 'invites', String(address).trim().toLowerCase()), { ...data, invitedBy: user.uid, at: serverTimestamp(), lastLog: lr.id });
      b.set(lr, logDoc(logEntry));
      await b.commit();
    },
    async revokeInvite(address, logEntry) {
      const b = writeBatch(db);
      b.delete(doc(db, 'invites', address));
      b.set(logRef(), logDoc(logEntry));
      await b.commit();
    },

    async save(col, id, data, logEntry) {
      const ref = id ? doc(db, col, id) : doc(collection(db, col));
      const lr = logRef();
      const stamp = { updatedBy: user.uid, updatedAt: serverTimestamp(), lastLog: lr.id };
      const b = writeBatch(db);
      if (id) b.update(ref, { ...data, ...stamp });
      else b.set(ref, { ...data, createdBy: user.uid, ...stamp });
      b.set(lr, logDoc(logEntry));
      await b.commit();
      return ref.id;
    },
    async remove(col, id, logEntry) {
      const b = writeBatch(db);
      b.delete(doc(db, col, id));
      b.set(doc(db, 'log', `del_${col}_${id}`), logDoc(logEntry));   // a known id, so the rules can require it
      await b.commit();
    },
    async saveSettings(data, logEntry, id = 'site') {
      const lr = logRef();
      const b = writeBatch(db);
      b.set(doc(db, 'settings', id), { ...data, updatedBy: user.uid, updatedAt: serverTimestamp(), lastLog: lr.id }, { merge: true });
      b.set(lr, logDoc(logEntry));
      await b.commit();
    },
    async log(n = 200) {
      const snap = await getDocs(query(collection(db, 'log'), orderBy('at', 'desc'), lim(n)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data(), at: toDate(d.data().at) || new Date() }));
    },
    async addLog(entry) {
      const b = writeBatch(db);
      b.set(logRef(), logDoc(entry));
      await b.commit();
    }
  };
}

function initials(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  const f = (s) => [...s.replace(/^(ال)(?=..)/, '')][0].toUpperCase();
  const l = w.length > 1 ? [f(w[0]), f(w[w.length - 1])] : [f(w[0])];
  return l.join(/[؀-ۿ]/.test(l.join('')) ? '‌' : '');
}
