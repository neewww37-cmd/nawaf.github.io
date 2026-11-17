import { firebaseConfig } from './firebase-config.js';
const G = 'https://www.gstatic.com/firebasejs/10.12.2/';
const resolve = window.__tmResolve;
const SOCIAL = { google: true, apple: false, facebook: false }; // فعّل آبل وفيسبوك بعد إعدادهم في Firebase
const $ = (s) => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) { if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]); else if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); }
  kids.forEach((c) => e.append(c));
  return e;
}
const css = document.createElement('style');
css.textContent = `.tm-ov{position:fixed;inset:0;z-index:99;background:rgba(20,18,43,.72);display:grid;place-items:center;padding:16px}
.tm-box{background:var(--surface);color:var(--ink);border:2px solid var(--line);border-radius:22px;padding:20px;width:min(380px,100%);display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow)}
.tm-box h2{margin:0;font-family:var(--font-display)} .tm-box input{padding:11px 14px;border-radius:14px;border:2px solid var(--line);background:var(--bg);color:var(--ink);font:inherit}
.tm-sb{display:flex;justify-content:center;gap:8px;padding:14px;border-radius:16px;border:2px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-size:17px;font-weight:700;cursor:pointer}.tm-facebook{color:#1877F2}.tm-google{}
.tm-err{color:var(--bad);font-size:14px;min-height:20px;margin:0}`;
document.head.append(css);
const ERR = { 'auth/invalid-credential': 'الإيميل أو كلمة المرور غير صحيحة', 'auth/email-already-in-use': 'هذا الإيميل مسجّل من قبل', 'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)', 'auth/invalid-email': 'الإيميل غير صحيح', 'auth/popup-closed-by-user': 'أُغلقت نافذة الدخول', 'auth/requires-recent-login': 'سجّل خروج ثم ادخل من جديد وأعد المحاولة' };
const errText = (e) => (e && e.info) || ERR[e && e.code] || 'تعذّر تنفيذ الطلب، جرّب مرة ثانية';

(async () => {
  let A, D, auth, db;
  try {
    const cfg = firebaseConfig;
    if (!cfg.apiKey || cfg.apiKey.startsWith('YOUR')) throw new Error('config');
    const [m1, m2, m3] = await Promise.all([import(G + 'firebase-app.js'), import(G + 'firebase-auth.js'), import(G + 'firebase-database.js')]);
    A = m2; D = m3; auth = A.getAuth(m1.initializeApp(cfg)); auth.languageCode = 'ar'; db = D.getDatabase(m1.getApp());
  } catch (e) { resolve(null); $('#acctBtn') && ($('#acctBtn').hidden = true); return; }

  const FA = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins.FirebaseAuthentication : null;
  async function social(kind) {
    if (FA) {
      if (kind === 'google') { const r = await FA.signInWithGoogle(); return A.signInWithCredential(auth, A.GoogleAuthProvider.credential(r.credential.idToken)); }
      if (kind === 'apple') { const r = await FA.signInWithApple(); return A.signInWithCredential(auth, new A.OAuthProvider('apple.com').credential({ idToken: r.credential.idToken, rawNonce: r.credential.nonce })); }
      const r = await FA.signInWithFacebook(); return A.signInWithCredential(auth, A.FacebookAuthProvider.credential(r.credential.accessToken));
    }
    const p = kind === 'apple' ? new A.OAuthProvider('apple.com') : kind === 'google' ? new A.GoogleAuthProvider() : new A.FacebookAuthProvider();
    try { return await A.signInWithPopup(auth, p); }
    catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await A.signInWithRedirect(auth, p); return new Promise(() => {}); } throw e; }
  }

  function authSheet(allowGuest) {
    return new Promise((done) => {
      const err = h('p', { class: 'tm-err', role: 'status' });
      const btn = (k, label, icon) => h('button', { class: 'tm-sb tm-' + k, type: 'button', on: { click: async () => { err.textContent = ''; try { await social(k); ov.remove(); done(true); } catch (e) { err.textContent = errText(e); } } } }, icon + '  ' + label);
      const list = [];
      if (SOCIAL.apple) list.push(btn('apple', 'الاستمرار باستخدام Apple', ''));
      if (SOCIAL.google) list.push(btn('google', 'الاستمرار باستخدام Google', 'G'));
      if (SOCIAL.facebook) list.push(btn('facebook', 'الاستمرار باستخدام Facebook', 'f'));
      const ov = h('div', { class: 'tm-ov' }, h('div', { class: 'tm-box', style: 'text-align:center' },
        h('div', { style: 'font-size:56px;line-height:1' }, '🏆'), h('h2', {}, 'أهلين وسهلين'),
        h('p', { style: 'margin:0 0 6px;color:var(--ink2)' }, 'سجّل دخولك بحسابك للعب أونلاين مع أصدقائك'),
        ...list, err,
        h('button', { class: 'btn quiet', type: 'button', on: { click: () => { ov.remove(); done(false); } } }, allowGuest ? 'العب بدون حساب (بدون أونلاين)' : 'إغلاق')));
      document.body.append(ov);
    });
  }

  await A.getRedirectResult(auth).catch(() => {});
  let user = await new Promise((r) => A.onAuthStateChanged(auth, r, () => r(null)));
  if (!user) { const ok = await authSheet(true); if (!ok) { resolve(null); wireGuest(); return; } user = auth.currentUser; }
  const uid = user.uid;
  const name = (user.displayName || (user.email || '').split('@')[0] || 'لاعب').slice(0, 14);
  const color = 'hsl(' + ([...uid].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)) + ' 60% 45%)';
  D.set(D.ref(db, 'users/' + uid + '/name'), name).catch(() => {});

  // blocked players are hidden from every room and lobby
  let blocked = {};
  D.onValue(D.ref(db, 'users/' + uid + '/blocked'), (s) => { blocked = s.val() || {}; });

  const safe = (n) => String(n).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  const roomApi = {
    async join(rname) {
      const rref = D.ref(db, 'rooms/' + safe(rname)), me = D.child(rref, uid), mp = D.child(me, 'p');
      let cache = {}; const subs = new Set(), conns = new Set(); const last = { n: name };
      await D.set(me, { p: last }); D.onDisconnect(me).remove();
      const un1 = D.onValue(rref, (s) => { cache = s.val() || {}; subs.forEach((f) => { try { f(); } catch (e) {} }); });
      let firstConn = true;
      const un2 = D.onValue(D.ref(db, '.info/connected'), (sn) => {
        const on = !!sn.val(); conns.forEach((f) => { try { f(on); } catch (e) {} });
        if (on && !firstConn) { D.set(me, { p: last }).catch(() => {}); D.onDisconnect(me).remove(); } // come back after a network drop
        firstConn = false;
      });
      return {
        peers: () => Object.entries(cache).filter(([id, v]) => v && v.p && !blocked[id]).map(([id, v]) => ({ id, isMe: id === uid, presence: v.p })),
        onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
        onConnection(fn) { conns.add(fn); return () => conns.delete(fn); },
        presence: (patch) => { for (const k in patch) { const v = patch[k]; if (v === null) delete last[k]; else if (!(typeof v === 'object' && v['.sv'])) last[k] = v; } return D.update(mp, patch); },
        async leave() { un1(); un2(); subs.clear(); conns.clear(); try { await D.remove(me); } catch (e) {} }
      };
    }
  };

  /* ---------- keep stats & badges in the account (last write wins) ---------- */
  const SYNC = ['tm_stats', 'tm_board', 'tm_bz'], cref = D.ref(db, 'users/' + uid + '/data');
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let pushT = null;
  async function pushNow() {
    try { const k = {}; SYNC.forEach((x) => { const v = lsGet(x); if (v != null) k[x] = v; }); const ts = +lsGet('tm_mod_ts') || Date.now(); await D.set(cref, { ts, k }); lsSet('tm_sync_ts', String(ts)); } catch (e) {}
  }
  window.tmCloudDirty = () => { clearTimeout(pushT); pushT = setTimeout(pushNow, 4000); };
  const lastUid = lsGet('tm_sync_uid');
  if (lastUid && lastUid !== uid) { SYNC.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} }); try { localStorage.removeItem('tm_mod_ts'); } catch (e) {} }
  lsSet('tm_sync_uid', uid);
  try {
    const c = (await D.get(cref)).val(), mod = +lsGet('tm_mod_ts') || 0;
    if (c && c.k && c.ts > mod) { SYNC.forEach((k) => { if (typeof c.k[k] === 'string') lsSet(k, c.k[k]); }); lsSet('tm_mod_ts', String(c.ts)); lsSet('tm_sync_ts', String(c.ts)); location.reload(); return; }
    if (!c || c.ts < mod) pushNow();
  } catch (e) {}
  resolve({ room: roomApi, user: { me: async () => ({ id: uid, name, color }), id: async () => uid } });


  /* ---------- friends: code, requests, friends list, online dot, game invites ---------- */
  const dbr = (q) => D.ref(db, q);
  const FR = {
    code: null,
    async myCode() {
      if (FR.code) return FR.code;
      const sn = await D.get(dbr('users/' + uid + '/code')); if (sn.exists()) return (FR.code = sn.val());
      const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      for (let t = 0; t < 8; t++) {
        const c = Array.from({ length: 6 }, () => AL[Math.floor(Math.random() * AL.length)]).join('');
        try { await D.set(dbr('codes/' + c), uid); await D.set(dbr('users/' + uid + '/code'), c); return (FR.code = c); } catch (e) {}
      }
      throw new Error('code');
    },
    async add(code) {
      const sn = await D.get(dbr('codes/' + String(code).trim().toUpperCase())); if (!sn.exists()) throw { info: 'ما لقينا لاعب بهذا الرمز' };
      const to = sn.val(); if (to === uid) throw { info: 'هذا رمزك أنت' };
      if ((await D.get(dbr('users/' + uid + '/friends/' + to))).exists()) throw { info: 'هو صديقك من قبل' };
      await D.set(dbr('friendReq/' + to + '/' + uid), { name, t: Date.now() });
    },
    onRequests(cb) { return D.onValue(dbr('friendReq/' + uid), (sn) => cb(Object.entries(sn.val() || {}).filter(([id]) => !blocked[id]).map(([id, r]) => ({ id, name: String(r.name || 'لاعب').slice(0, 14) })))); },
    async accept(id, rname) { await D.set(dbr('users/' + uid + '/friends/' + id), { name: String(rname || 'لاعب').slice(0, 14) }); await D.set(dbr('friendAcc/' + id + '/' + uid), { name }); await D.remove(dbr('friendReq/' + uid + '/' + id)); },
    decline: (id) => D.remove(dbr('friendReq/' + uid + '/' + id)),
    remove: (id) => D.remove(dbr('users/' + uid + '/friends/' + id)),
    onFriends(cb) {
      let offs = [];
      const un = D.onValue(dbr('users/' + uid + '/friends'), (sn) => {
        offs.forEach((f) => f()); offs = [];
        const list = Object.entries(sn.val() || {}).map(([id, f]) => ({ id, name: String(f.name || 'لاعب').slice(0, 14), online: false }));
        list.forEach((f) => offs.push(D.onValue(dbr('online/' + f.id), (o) => { f.online = o.exists(); cb(list.slice()); })));
        cb(list.slice());
      });
      return () => { un(); offs.forEach((f) => f()); };
    },
    invite: (id, code) => D.set(dbr('invites/' + id + '/' + uid), { code, name, t: Date.now() }),
    clearInvite: (id) => D.remove(dbr('invites/' + uid + '/' + id))
  };
  window.tmFriends = FR;
  // online dot for friends
  D.onValue(dbr('.info/connected'), (sn) => { if (sn.val()) { D.onDisconnect(dbr('online/' + uid)).remove(); D.set(dbr('online/' + uid), true); } });
  // the other side of an accepted request: record the new friend
  D.onValue(dbr('friendAcc/' + uid), (sn) => Object.entries(sn.val() || {}).forEach(async ([id, a]) => { try { await D.set(dbr('users/' + uid + '/friends/' + id), { name: String((a && a.name) || 'لاعب').slice(0, 14) }); await D.remove(dbr('friendAcc/' + uid + '/' + id)); } catch (e) {} }));
  // incoming game invites (from friends only; rules enforce it)
  const ib = h('div', { style: 'position:fixed;top:10px;left:10px;right:10px;z-index:98;display:none' });
  document.body.append(ib);
  D.onValue(dbr('invites/' + uid), (sn) => {
    ib.textContent = ''; ib.style.display = 'none';
    const inv = Object.entries(sn.val() || {}).filter(([id, i]) => !blocked[id] && i && Date.now() - i.t < 180000)[0]; if (!inv) return;
    const [id, i] = inv;
    ib.style.display = 'block';
    ib.append(h('div', { class: 'tm-box', style: 'flex-direction:row;align-items:center;justify-content:space-between' },
      h('span', {}, String(i.name || 'صديق').slice(0, 14) + ' يدعوك للعب'),
      h('span', { style: 'display:flex;gap:8px' },
        h('button', { class: 'btn small', type: 'button', on: { click: () => { FR.clearInvite(id); if (window.tmJoin) window.tmJoin(String(i.code)); } } }, 'قبول'),
        h('button', { class: 'btn small quiet', type: 'button', on: { click: () => FR.clearInvite(id) } }, 'رفض'))));
  });

  async function reauth() {
    if (FA) { const r = await FA.signInWithGoogle(); await A.reauthenticateWithCredential(auth.currentUser, A.GoogleAuthProvider.credential(r.credential.idToken)); }
    else await A.reauthenticateWithPopup(auth.currentUser, new A.GoogleAuthProvider());
  }
  window.tmReport = async (id, n) => { if (!id || !confirm('إبلاغ عن اللاعب ' + (n || '') + '؟')) return; try { await D.set(D.push(D.ref(db, 'reports')), { by: uid, against: id, at: D.serverTimestamp() }); alert('وصلنا بلاغك، شكراً.'); } catch (e) { alert(errText(e)); } };
  window.tmBlock = async (id, n) => { if (!id || !confirm('حظر ' + (n || 'اللاعب') + '؟ ما راح يظهر لك مرة ثانية.')) return; try { await D.set(D.ref(db, 'users/' + uid + '/blocked/' + id), true); return true; } catch (e) { alert(errText(e)); return false; } };

  $('#acctBtn').addEventListener('click', () => {
    const msg = h('p', { class: 'tm-err' });
    const ov = h('div', { class: 'tm-ov' }, h('div', { class: 'tm-box' }, h('h2', {}, name), h('p', { style: 'margin:0;color:var(--ink2)', dir: 'ltr' }, user.email || ''), msg,
      h('button', { class: 'btn', type: 'button', on: { click: async () => { await A.signOut(auth); location.reload(); } } }, 'تسجيل الخروج'),
      h('button', { class: 'btn', type: 'button', style: 'border-color:var(--bad)', on: { click: async () => {
        if (!confirm('سيُحذف حسابك وبياناتك نهائياً. متأكد؟')) return;
        try { await reauth(); const cs = await D.get(dbr('users/' + uid + '/code')), mc = cs.exists() ? cs.val() : null; await Promise.allSettled([mc && D.remove(dbr('codes/' + mc)), D.remove(dbr('online/' + uid)), D.remove(dbr('invites/' + uid)), D.remove(dbr('friendReq/' + uid)), D.remove(dbr('friendAcc/' + uid))]); await D.remove(D.ref(db, 'users/' + uid)); await A.deleteUser(auth.currentUser); location.reload(); } catch (e) { msg.textContent = errText(e); }
      } } }, 'حذف حسابي'),
      h('button', { class: 'btn quiet', type: 'button', on: { click: () => ov.remove() } }, 'إغلاق')));
    document.body.append(ov);
  });

  function wireGuest() { $('#acctBtn').addEventListener('click', async () => { if (await authSheet(false)) location.reload(); }); }
})();
