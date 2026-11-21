/* My Game Arcade — accounts + cloud saves.
   Uses the same Firebase project as SkyCast. Every game page includes this file.
   When you're signed in, each game's save is copied to your account (users/{uid}.arcade)
   and loaded back on any device you sign in on. */
(function () {
  const FB_CONFIG = {
    apiKey: "AIzaSyCZWdgqgqt04-8olhaB0aLDqtYM0BQZ8_A",
    authDomain: "celestial-now-514716-d4.firebaseapp.com",
    projectId: "celestial-now-514716-d4",
    storageBucket: "celestial-now-514716-d4.firebasestorage.app",
    messagingSenderId: "22824472007",
    appId: "1:22824472007:web:da68fec7c7776bb764dde2"
  };
  const FBV = "https://www.gstatic.com/firebasejs/10.12.2/";

  // the save slots of every game
  const KEYS = [
    "deep-blue-fishing-v1", "dbf-sfx",   // Deep Blue Fishing
    "graveyardTD",                       // Graveyard Defense
    "sandwichSprintSave",                // Sandwich Sprint 3D
    "wild-woods-bugs-v1"                 // Wild Woods Bug Catching
  ];
  const META = "arcade_sync_times";
  const IS_HUB = !!window.ARCADE_HUB;

  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const getMeta = () => { try { return JSON.parse(LS.getItem(META)) || {}; } catch (e) { return {}; } };
  const putMeta = m => { try { rawSet.call(LS, META, JSON.stringify(m)); } catch (e) {} };

  let F = null, user = null, synced = false, pending = new Set(), timer = null;
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(user); } catch (e) {} });

  // notice when a game saves, and send it to the account a moment later
  function touched(key) {
    if (!LS || !KEYS.includes(key) || !user || !synced) return;
    const m = getMeta(); m[key] = Date.now(); putMeta(m);
    pending.add(key); clearTimeout(timer); timer = setTimeout(flush, 1500);
  }
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === LS) touched(k); };
  Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === LS) touched(k); };

  async function flush() {
    if (!F || !user || !pending.size) return;
    const keys = [...pending]; pending.clear();
    const m = getMeta(), upd = {};
    keys.forEach(k => { upd["arcade." + k.replace(/\./g, "_")] = { v: LS.getItem(k), t: m[k] || Date.now() }; });
    try { await F.fs.updateDoc(F.fs.doc(F.db, "users", user.uid), upd); }
    catch (e) {
      // doc might not exist yet
      const arcade = {}; keys.forEach(k => arcade[k.replace(/\./g, "_")] = upd["arcade." + k.replace(/\./g, "_")]);
      try { await F.fs.setDoc(F.fs.doc(F.db, "users", user.uid), { email: user.email || "", arcade }, { merge: true }); }
      catch (e2) { keys.forEach(k => pending.add(k)); console.warn("Arcade save failed", e2); }
    }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  addEventListener("pagehide", flush);

  // first sync after signing in: the newer save wins (your account's save beats progress made while signed out)
  async function syncDown() {
    let cloud = {};
    try {
      const snap = await F.fs.getDoc(F.fs.doc(F.db, "users", user.uid));
      cloud = (snap.exists() && snap.data().arcade) || {};
    } catch (e) { console.warn("Arcade load failed", e); synced = true; return; }
    const m = getMeta(); let changed = false;
    KEYS.forEach(k => {
      const c = cloud[k.replace(/\./g, "_")], L = LS.getItem(k), lt = m[k] || 0;
      if (c && c.t >= lt) {
        if (c.v !== L) { c.v == null ? rawRemove.call(LS, k) : rawSet.call(LS, k, c.v); changed = true; }
        m[k] = c.t;
      } else if (L != null) { if (!m[k]) m[k] = Date.now(); pending.add(k); }
    });
    putMeta(m); synced = true;
    if (pending.size) flush();
    if (changed && !IS_HUB) {
      // reload once so the game opens your account's save
      let once = false; try { once = sessionStorage.getItem("arcade_reloaded") === user.uid; } catch (e) {}
      if (!once) { try { sessionStorage.setItem("arcade_reloaded", user.uid); } catch (e) {} location.reload(); }
    }
  }

  const ready = (async () => {
    const [a, au, fs] = await Promise.all([import(FBV + "firebase-app.js"), import(FBV + "firebase-auth.js"), import(FBV + "firebase-firestore.js")]);
    const app = a.initializeApp(FB_CONFIG);
    F = { au, fs, auth: au.getAuth(app), db: fs.getFirestore(app) };
    try { await au.getRedirectResult(F.auth); } catch (e) {}
    au.onAuthStateChanged(F.auth, async u => {
      user = u; synced = false;
      if (u) await syncDown(); else synced = true;
      emit();
    });
    return F;
  })().catch(e => { console.warn("Arcade accounts unavailable", e); return null; });

  function nice(ex) {
    const c = (ex && ex.code) || "";
    if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "That email or password isn't right.";
    if (c.includes("email-already-in-use")) return "That email already has an account. Tap \"Sign in\" instead.";
    if (c.includes("weak-password")) return "Make your password at least 6 letters or numbers.";
    if (c.includes("invalid-email")) return "Type a real email, like you@gmail.com";
    if (c.includes("unauthorized-domain")) return "Google sign-in isn't turned on for this website yet. Use email and password for now.";
    if (c.includes("popup-closed")) return "Sign-in window closed. Try again.";
    if (c.includes("network")) return "No internet. Check your connection.";
    if (c.includes("too-many-requests")) return "Too many tries. Wait a minute and try again.";
    return "Something went wrong. Try again.";
  }

  window.Arcade = {
    ready,
    get user() { return user; },
    onChange(fn) { listeners.push(fn); fn(user); },
    nice,
    async signIn(email, pw) { const f = await ready; return f.au.signInWithEmailAndPassword(f.auth, email, pw); },
    async signUp(email, pw) { const f = await ready; return f.au.createUserWithEmailAndPassword(f.auth, email, pw); },
    async reset(email) { const f = await ready; return f.au.sendPasswordResetEmail(f.auth, email); },
    async google() {
      const f = await ready, p = new f.au.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try { return await f.au.signInWithPopup(f.auth, p); }
      catch (ex) {
        if (ex.code === "auth/popup-blocked" || ex.code === "auth/operation-not-supported-in-this-environment") return f.au.signInWithRedirect(f.auth, p);
        throw ex;
      }
    },
    async signOut() { await flush(); const f = await ready; try { sessionStorage.removeItem("arcade_reloaded"); } catch (e) {} return f.au.signOut(f.auth); }
  };
})();
