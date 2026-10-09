// Connects the app to Firebase: login, cloud database (works offline), and file saving on the phone.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { firebaseConfig } from './firebase-config.js';

const configured = firebaseConfig && firebaseConfig.apiKey && !/PASTE/.test(firebaseConfig.apiKey);
let auth = null, fs = null, uid = null;

if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) });
}

/* A small database layer with the same shape the screens already use:
   db.collection(name).doc(id).set / update / delete, and collection.onSnapshot. */
function makeDb(userId) {
  return {
    collection(name) {
      const c = collection(fs, 'users', userId, name);
      return {
        doc(id) {
          const r = id ? doc(c, id) : doc(c);
          return { id: r.id, set: d => setDoc(r, d), update: d => updateDoc(r, d), delete: () => deleteDoc(r) };
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
  if (!fs || !uid) throw new Error('signed out');
  const rows = [
    ...j.pgs.map(r => ['pgs', r]),
    ...j.inquiries.map(r => ['inquiries', r]),
  ].filter(([, r]) => r && r.id && r.data && typeof r.data === 'object');
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(fs);
    rows.slice(i, i + 400).forEach(([col, r]) => batch.set(doc(fs, 'users', uid, col, String(r.id)), r.data));
    await batch.commit();
  }
  return { pgs: rows.filter(r => r[0] === 'pgs').length, inq: rows.filter(r => r[0] === 'inquiries').length };
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
  'auth/operation-not-allowed': 'Turn on Email/Password in Firebase → Authentication.',
};
const msg = e => AUTH_ERRORS[e && e.code] || 'Something went wrong. Try again.';

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
    $('auth-go').disabled = true; $('auth-msg').textContent = '';
    try {
      if (mode === 'signin') await signInWithEmailAndPassword(auth, email, pass);
      else await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { $('auth-msg').textContent = msg(err); }
    finally { $('auth-go').disabled = false; }
  };
  onAuthStateChanged(auth, user => {
    if (user) { uid = user.uid; box.hidden = true; onSignedIn(makeDb(user.uid), user.email); }
    else { uid = null; box.hidden = false; $('auth-pass').value = ''; onSignedOut(); }
  });
}
