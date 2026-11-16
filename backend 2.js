import { firebaseConfig } from './firebase-config.js';
const G = 'https://www.gstatic.com/firebasejs/10.12.2/';
const resolve = window.__tmResolve;
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
      if (kind === 'apple') { const r = await FA.signInWithApple(); return A.signInWithCredential(auth, new A.OAuthProvider('apple.com').credential({ idToken: r.credential.idToken, rawNonce: r.credential.nonce })); }
      const r = await FA.signInWithFacebook(); return A.signInWithCredential(auth, A.FacebookAuthProvider.credential(r.credential.accessToken));
    }
    return A.signInWithPopup(auth, kind === 'apple' ? new A.OAuthProvider('apple.com') : new A.FacebookAuthProvider());
  }

  function authSheet(allowGuest) {
    return new Promise((done) => {
      let mode = 'in';
      const err = h('p', { class: 'tm-err', role: 'status' });
      const nm = h('input', { type: 'text', placeholder: 'اسمك في اللعبة', maxlength: '14', autocomplete: 'nickname' });
      const em = h('input', { type: 'email', placeholder: 'الإيميل', autocomplete: 'email', dir: 'ltr' });
      const pw = h('input', { type: 'password', placeholder: 'كلمة المرور', autocomplete: 'current-password', dir: 'ltr' });
      const title = h('h2'), main = h('button', { class: 'btn primary', type: 'button' }), sw = h('button', { class: 'btn quiet', type: 'button' }), fg = h('button', { class: 'btn quiet', type: 'button' }, 'نسيت كلمة المرور');
      const paint = (msg) => {
        title.textContent = mode === 'in' ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
        main.textContent = mode === 'in' ? 'دخول' : 'إنشاء الحساب';
        sw.textContent = mode === 'in' ? 'ما عندك حساب؟ أنشئ حساب جديد' : 'عندي حساب، رجوع للدخول';
        nm.style.display = mode === 'in' ? 'none' : ''; fg.style.display = mode === 'in' ? '' : 'none';
        pw.setAttribute('autocomplete', mode === 'in' ? 'current-password' : 'new-password'); err.textContent = msg || '';
      };
      const finish = () => { ov.remove(); done(true); };
      main.addEventListener('click', async () => {
        err.textContent = '';
        try {
          if (mode === 'in') await A.signInWithEmailAndPassword(auth, em.value.trim(), pw.value);
          else { const c = await A.createUserWithEmailAndPassword(auth, em.value.trim(), pw.value); const n = nm.value.trim(); if (n) await A.updateProfile(c.user, { displayName: n.slice(0, 14) }); }
          finish();
        } catch (e) {
          if (mode === 'in' && (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found')) { mode = 'up'; paint('ما لقينا حساب بهذا الإيميل، أنشئ حساب جديد. وإذا عندك حساب وكلمة المرور غلط، ارجع للدخول.'); }
          else if (mode === 'up' && e.code === 'auth/email-already-in-use') { mode = 'in'; paint('هذا الإيميل مسجّل عندنا، أدخل كلمة المرور.'); }
          else err.textContent = errText(e);
        }
      });
      sw.addEventListener('click', () => { mode = mode === 'in' ? 'up' : 'in'; paint(); });
      fg.addEventListener('click', async () => { try { await A.sendPasswordResetEmail(auth, em.value.trim()); err.textContent = 'أرسلنا رابط تغيير كلمة المرور لإيميلك.'; } catch (e) { err.textContent = errText(e); } });
      const soc = (k) => async () => { err.textContent = ''; try { await social(k); finish(); } catch (e) { err.textContent = errText(e); } };
      const ov = h('div', { class: 'tm-ov' }, h('div', { class: 'tm-box' }, title, nm, em, pw, err, main, sw, fg,
        h('button', { class: 'btn', type: 'button', on: { click: soc('apple') } }, 'الدخول بحساب آبل'),
        h('button', { class: 'btn', type: 'button', on: { click: soc('facebook') } }, 'الدخول بفيسبوك'),
        h('button', { class: 'btn quiet', type: 'button', on: { click: () => { ov.remove(); done(false); } } }, allowGuest ? 'العب بدون حساب (بدون أونلاين)' : 'إغلاق')));
      paint(); document.body.append(ov);
    });
  }

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
      let cache = {}; const subs = new Set(), conns = new Set();
      await D.set(me, { p: { n: name } }); D.onDisconnect(me).remove();
      const un1 = D.onValue(rref, (s) => { cache = s.val() || {}; subs.forEach((f) => { try { f(); } catch (e) {} }); });
      const un2 = D.onValue(D.ref(db, '.info/connected'), (s) => conns.forEach((f) => { try { f(!!s.val()); } catch (e) {} }));
      return {
        peers: () => Object.entries(cache).filter(([id, v]) => v && v.p && !blocked[id]).map(([id, v]) => ({ id, isMe: id === uid, presence: v.p })),
        onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
        onConnection(fn) { conns.add(fn); return () => conns.delete(fn); },
        presence: (patch) => D.update(mp, patch),
        async leave() { un1(); un2(); subs.clear(); conns.clear(); try { await D.remove(me); } catch (e) {} }
      };
    }
  };
  resolve({ room: roomApi, user: { me: async () => ({ id: uid, name, color }), id: async () => uid } });

  window.tmReport = async (id, n) => { if (!id || !confirm('إبلاغ عن اللاعب ' + (n || '') + '؟')) return; try { await D.set(D.push(D.ref(db, 'reports')), { by: uid, against: id, at: D.serverTimestamp() }); alert('وصلنا بلاغك، شكراً.'); } catch (e) { alert(errText(e)); } };
  window.tmBlock = async (id, n) => { if (!id || !confirm('حظر ' + (n || 'اللاعب') + '؟ ما راح يظهر لك مرة ثانية.')) return; try { await D.set(D.ref(db, 'users/' + uid + '/blocked/' + id), true); } catch (e) { alert(errText(e)); } };

  $('#acctBtn').addEventListener('click', () => {
    const msg = h('p', { class: 'tm-err' });
    const ov = h('div', { class: 'tm-ov' }, h('div', { class: 'tm-box' }, h('h2', {}, name), h('p', { style: 'margin:0;color:var(--ink2)', dir: 'ltr' }, user.email || ''), msg,
      h('button', { class: 'btn', type: 'button', on: { click: async () => { await A.signOut(auth); location.reload(); } } }, 'تسجيل الخروج'),
      h('button', { class: 'btn', type: 'button', style: 'border-color:var(--bad)', on: { click: async () => {
        if (!confirm('سيُحذف حسابك وبياناتك نهائياً. متأكد؟')) return;
        try { await D.remove(D.ref(db, 'users/' + uid)); await A.deleteUser(auth.currentUser); location.reload(); } catch (e) { msg.textContent = errText(e); }
      } } }, 'حذف حسابي'),
      h('button', { class: 'btn quiet', type: 'button', on: { click: () => ov.remove() } }, 'إغلاق')));
    document.body.append(ov);
  });

  function wireGuest() { $('#acctBtn').addEventListener('click', async () => { if (await authSheet(false)) location.reload(); }); }
})();
