// Connects the app to Firebase: login, cloud database (works offline), and file saving on the phone.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { firebaseConfig } from './firebase-config.js';

const configured = firebaseConfig && firebaseConfig.apiKey && !/PASTE/.test(firebaseConfig.apiKey);
let auth = null, fs = null, uid = null, base = null, who = '';
// Shared team space: everyone added under Team works on the same PGs, enquiries and dealers.
export const OWNER_EMAIL = 'sukoonniwas@gmail.com';
const ORG = ['orgs', 'sukoon'];

if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) });
}

/* A small database layer with the same shape the screens already use:
   db.collection(name).doc(id).set / update / delete, and collection.onSnapshot. */
function makeDb(path) {
  const stamp = d => ({ ...d, updatedBy: who });
  return {
    collection(name) {
      const c = collection(fs, ...path, name);
      return {
        doc(id) {
          const r = id ? doc(c, id) : doc(c);
          return { id: r.id, set: d => setDoc(r, stamp(d)), update: d => updateDoc(r, stamp(d)), delete: () => deleteDoc(r),
            get: async () => { const d = await getDoc(r); return { exists: d.exists(), data: () => d.data() }; } };
        },
        onSnapshot(next, err) {
          return onSnapshot(c,
            s => next({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }),
            e => err && err({ code: e.code, message: e.message }));
        },
      };
    },
  };
}

export async function importBackup(j) {
  if (!fs || !uid || !base) throw new Error('signed out');
  const rows = [
    ...j.pgs.map(r => ['pgs', r]),
    ...j.inquiries.map(r => ['inquiries', r]),
    ...(Array.isArray(j.dealers) ? j.dealers : []).map(r => ['dealers', r]),
  ].filter(([, r]) => r && r.id && r.data && typeof r.data === 'object');
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(fs);
    rows.slice(i, i + 400).forEach(([col, r]) => batch.set(doc(fs, ...base, col, String(r.id)), r.data));
    await batch.commit();
  }
  return { pgs: rows.filter(r => r[0] === 'pgs').length, inq: rows.filter(r => r[0] === 'inquiries').length, deal: rows.filter(r => r[0] === 'dealers').length };
}

/* Saving files: on the phone, write the file and open the share sheet
   (save to Files, Drive, WhatsApp, email…). In a browser, download it. */
export const downloads = {
  async save({ filename, data }) {
    if (Capacitor.isNativePlatform()) {
      const w = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
      try {
        await Share.share({ title: filename, url: w.uri, dialogTitle: 'Save or send ' + filename });
      } catch (e) {
        if (/cancel/i.test(String(e && e.message))) throw { code: 'declined' };
        throw e;
      }
      return { status: 'saved' };
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain;charset=utf-8' }));
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    return { status: 'saved' };
  },
};

export function signOutUser() { if (auth) signOut(auth); }

/* ---------- team ---------- */
const COLS = ['pgs', 'inquiries', 'dealers', 'settings', 'proofs'];
// Copy the owner's earlier private data into the shared team space, once.
async function migrateOwnerData(userId) {
  const flag = doc(fs, ...ORG, 'settings', 'migration');
  const f = await getDoc(flag);
  if (f.exists() && f.data().done) return;
  let n = 0;
  for (const col of COLS) {
    const snap = await getDocs(collection(fs, 'users', userId, col));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += (col === 'proofs' ? 1 : 300)) {
      const batch = writeBatch(fs);
      docs.slice(i, i + (col === 'proofs' ? 1 : 300)).forEach(d => { batch.set(doc(fs, ...ORG, col, d.id), d.data()); n++; });
      await batch.commit();
    }
  }
  await setDoc(flag, { done: true, copied: n, at: Date.now(), by: who });
}
// Decide where this person's data lives. Team members share one space.
async function chooseSpace(user) {
  const email = String(user.email || '').toLowerCase();
  const isOwner = email === OWNER_EMAIL;
  try {
    if (isOwner) {
      await setDoc(doc(fs, ...ORG, 'members', email), { email, name: 'Owner', role: 'owner', addedAt: Date.now() }, { merge: true });
      await migrateOwnerData(user.uid);
      return { path: ORG, team: true, isOwner };
    }
    const m = await getDoc(doc(fs, ...ORG, 'members', email));
    if (m.exists()) return { path: ORG, team: true, isOwner };
    return { notMember: true };
  } catch (e) {
    if (e && e.code === 'permission-denied') {
      // Rules not updated yet: the owner keeps working in the private space; others must wait.
      if (isOwner) return { path: ['users', user.uid], team: false, isOwner, rulesOld: true };
      return { notMember: true };
    }
    throw e;
  }
}

/* ---------- login screen ---------- */
const $ = id => document.getElementById(id);
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address looks wrong.',
  'auth/user-not-found': 'No account with this email. Tap “Create account”.',
  'auth/wrong-password': 'Wrong password.',
  'auth/email-already-in-use': 'An account already exists. Tap “Sign in”.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/network-request-failed': 'No internet. Connect and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/operation-not-allowed': 'Turn on Email/Password in Firebase → Authentication → Sign-in method.',
  'auth/configuration-not-found': 'Login is not set up yet. In Firebase, open Authentication, tap Get started, then turn on Email/Password.',
  'auth/admin-restricted-operation': 'New accounts are blocked. In Firebase → Authentication → Settings, allow user sign-up.',
};
const msg = e => AUTH_ERRORS[e && e.code] || `Something went wrong (${(e && e.code) || 'unknown error'}). Try again.`;

export function initAuth({ onSignedIn, onSignedOut }) {
  const box = $('auth');
  if (!configured) {
    $('auth-form').hidden = true;
    $('auth-msg').textContent = 'App not connected yet: add your Firebase settings to src/firebase-config.js.';
    box.hidden = false;
    return;
  }
  let mode = 'signin';
  const setMode = m => {
    mode = m;
    $('auth-title').textContent = m === 'signin' ? 'Sign in' : 'Create your account';
    $('auth-go').textContent = m === 'signin' ? 'Sign in' : 'Create account';
    $('auth-switch').textContent = m === 'signin' ? 'First time? Create account' : 'Have an account? Sign in';
    $('auth-pass').autocomplete = m === 'signin' ? 'current-password' : 'new-password';
    $('auth-msg').textContent = '';
  };
  setMode('signin');
  $('auth-switch').onclick = () => setMode(mode === 'signin' ? 'signup' : 'signin');
  $('auth-forgot').onclick = async () => {
    const email = $('auth-email').value.trim();
    if (!email) { $('auth-msg').textContent = 'Type your email first, then tap “Forgot password”.'; return; }
    try { await sendPasswordResetEmail(auth, email); $('auth-msg').textContent = 'Password reset email sent. Check your inbox.'; }
    catch (e) { $('auth-msg').textContent = msg(e); }
  };
  $('auth-form').onsubmit = async e => {
    e.preventDefault();
    const email = $('auth-email').value.trim(), pass = $('auth-pass').value;
    const label = $('auth-go').textContent;
    $('auth-go').disabled = true; $('auth-go').textContent = 'Please wait…'; $('auth-msg').textContent = '';
    const slow = setTimeout(() => { $('auth-msg').textContent = 'Still trying… check your internet connection.'; }, 15000);
    try {
      if (mode === 'signin') await signInWithEmailAndPassword(auth, email, pass);
      else await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { $('auth-msg').textContent = msg(err); }
    finally { clearTimeout(slow); $('auth-go').disabled = false; $('auth-go').textContent = label; }
  };
  onAuthStateChanged(auth, async user => {
    if (user) {
      uid = user.uid; who = String(user.email || '').toLowerCase();
      $('auth-msg').textContent = 'Opening…';
      try {
        const sp = await chooseSpace(user);
        if (sp.notMember) {
          $('auth-msg').innerHTML = `You're signed in as <b>${who}</b>, but you're not on the Sukoon team yet. Ask the owner to add this email under <b>Dashboard → Team</b>, then tap Try again.`
            + `<br><button type="button" class="btn" id="auth-retry" style="margin-top:8px">Try again</button> <button type="button" class="btn" id="auth-out" style="margin-top:8px">Sign out</button>`;
          $('auth-retry').onclick = () => location.reload();
          $('auth-out').onclick = () => signOut(auth);
          box.hidden = false; return;
        }
        base = sp.path; box.hidden = true; $('auth-msg').textContent = '';
        onSignedIn(makeDb(sp.path), user.email, sp);
      }
      catch (e) { box.hidden = false; $('auth-msg').textContent = 'Signed in, but the app could not open: ' + ((e && e.message) || e); }
    }
    else { uid = null; base = null; who = ''; box.hidden = false; $('auth-pass').value = ''; onSignedOut(); }
  });
}
