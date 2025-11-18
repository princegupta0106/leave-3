// Firebase Auth integration (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your Firebase configuration (from user snippet)
const firebaseConfig = {
  apiKey: "AIzaSyCJKk-G9mt1BcWHgPlAGgKFV4zBwIlXHbU",
  authDomain: "goalwise-54afb.firebaseapp.com",
  projectId: "goalwise-54afb",
  storageBucket: "goalwise-54afb.firebasestorage.app",
  messagingSenderId: "723714622857",
  appId: "1:723714622857:web:13cef7fc4b6b233e908d58",
  measurementId: "G-NJ2T1JSZDH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById('firebaseLoginBtn');
const userNameSpan = document.getElementById('authUserName');

function safeGet(id) {
  return document.getElementById(id) || null;
}

async function doSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Sign-in error', err);
    alert('Sign-in failed: ' + (err.message || err));
  }
}

async function doSignOut() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign-out error', err);
    alert('Sign-out failed: ' + (err.message || err));
  }
}

if (loginBtn) {
  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (auth.currentUser) {
      doSignOut();
    } else {
      doSignIn();
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Show user info
    userNameSpan.textContent = user.displayName || user.email || '';
    if (loginBtn) loginBtn.textContent = 'Sign out';

    // Auto-fill form fields if present
    const parentName = safeGet('parentName');
    const mobile = safeGet('mobile');
    const place = safeGet('place');
    const date = safeGet('date');

    if (parentName && user.displayName) parentName.value = user.displayName;
    if (mobile && user.phoneNumber) {
      // Normalize phone number to digits only (may include +country)
      const digits = user.phoneNumber.replace(/\D/g, '');
      // If 10 digits, use directly, else leave as-is
      mobile.value = digits;
    }
    if (date) date.valueAsDate = new Date();

    // Provide a small hint to the user
    const filled = [];
    if (user.displayName) filled.push('name');
    if (user.phoneNumber) filled.push('mobile');
    if (filled.length) {
      console.info('Auto-filled fields:', filled.join(', '));
    }
    // Try loading stored user data (last saved form + signature) from Firestore
    (async () => {
      try {
        const docRef = doc(db, 'user_leave', user.email);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          // Fill form fields if present
          const fields = ['studentName','studentId','bhawan','leaveFrom','leaveTo','parentName','place','date','mobile'];
          for (const f of fields) {
            const el = safeGet(f);
            if (el && data[f]) {
              // For date inputs, set value directly if it's an ISO date
              if (el.type === 'date') {
                try { el.value = data[f]; } catch(e) {}
              } else {
                el.value = data[f];
              }
            }
          }

          // If signature stored as data URL, set it via window setter if available
          if (data.signatureDataUrl && window.setSignatureImageData) {
            try { window.setSignatureImageData(data.signatureDataUrl); } catch (e) { console.warn(e); }
          }
        }
      } catch (e) {
        console.error('Failed to load user_leave data:', e);
      }
    })();
  } else {
    userNameSpan.textContent = '';
    if (loginBtn) loginBtn.textContent = 'Log in';
  }
});

// Firestore helpers: save and load user leave data
async function saveUserLeaveData(email, data) {
  if (!email) throw new Error('Missing email');
  try {
    const docRef = doc(db, 'user_leave', email);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (e) {
    console.error('Error saving user_leave data', e);
    throw e;
  }
}

async function loadUserLeaveData(email) {
  if (!email) return null;
  try {
    const docRef = doc(db, 'user_leave', email);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('Error loading user_leave data', e);
    return null;
  }
}

// Expose helper functions to window for use in other scripts
window.firebaseSaveUserLeaveData = saveUserLeaveData;
window.firebaseLoadUserLeaveData = loadUserLeaveData;
window.firebaseGetCurrentUser = () => auth.currentUser || null;

// Note: sign-in with popup requires a secure context (http(s)). If you're testing
// locally, run a simple HTTP server (e.g. `npx http-server` or `python -m http.server`).
