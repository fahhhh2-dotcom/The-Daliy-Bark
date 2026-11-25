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
    "wild-woods-bugs-v1",                // Wild Woods Bug Catching
    "lastEmberSave", "lastEmberBest", "lastEmberWorlds",   // Last Ember: game, best, Friend Worlds
    "lastEmberName", "lastEmberSkin", "lastEmberTone", "lastEmberSens", "lastEmberOnline",   // Last Ember: name, skin, settings
    "nebulaBest",                        // Nebula Blaster
    "phoneTycoon",                       // Phone Factory Tycoon
    "peakFinderBest",                    // Peak Finder
    "sq9-best-abc", "sq9-best-clock", "sq9-best-gap", "sq9-best-hangman", "sq9-best-hear", "sq9-best-match", "sq9-best-mix", "sq9-best-scramble", "sq9-best-spot",   // Spelling Quest
    "arcade_avatar", "arcade_wallet",    // Arcade avatar + coins
    "melonLabStats",                     // Melon Lab
    "spaceSusStats", "susName", "susColor",  // Space Suspects
    "skyDropStats", "royaleName",        // Sky Drop Royale
    "backroomsStats", "backrooms-best", "backrooms-gfx",   // The Backrooms
    "hollowPinesSlot0", "hollowPinesSlot1", "hollowPinesSlot2", "hollowPinesCh2_0", "hollowPinesCh2_1", "hollowPinesCh2_2", "hollowPinesCh3_0", "hollowPinesCh3_1", "hollowPinesCh3_2", "hollowPinesGear_0", "hollowPinesGear_1", "hollowPinesGear_2", "hollowPinesSettings", "hollowPinesStats"   // Hollow Pines saves + Chapter 2 progress
  ];
  const META = "arcade_sync_times";
  const IS_HUB = !!window.ARCADE_HUB;

  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const getMeta = () => { try { return JSON.parse(LS.getItem(META)) || {}; } catch (e) { return {}; } };
  const putMeta = m => { try { rawSet.call(LS, META, JSON.stringify(m)); } catch (e) {} };

  let F = null, user = null, synced = false, pending = new Set(), timer = null;
  const listeners = [], statusFns = [];
  // where saves live: "arcade/{uid}" (its own spot), or the older users/{uid}.arcade field as a backup
  let where = "arcade";
  let status = { state: "off", msg: "" };
  const setStatus = (state, msg) => { status = { state, msg: msg || "" }; statusFns.forEach(fn => { try { fn(status); } catch (e) {} }); };
  const code = e => (e && (e.code || e.name)) || "unknown";
  const emit = () => listeners.forEach(fn => { try { fn(user); } catch (e) {} });

  // notice when a game saves, and send it to the account a moment later
  function touched(key) {
    if (!LS || !KEYS.includes(key) || !user || !synced) return;
    const m = getMeta(); m[key] = Date.now(); putMeta(m);
    pending.add(key); clearTimeout(timer); timer = setTimeout(flush, 1500);
  }
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === LS) touched(k); };
  Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === LS) touched(k); };

  async function writeTo(spot, keys, m) {
    const data = {}; keys.forEach(k => { data[k.replace(/\./g, "_")] = { v: LS.getItem(k), t: m[k] || Date.now() }; });
    if (spot === "arcade") await F.fs.setDoc(F.fs.doc(F.db, "arcade", user.uid), { email: user.email || "", updated: Date.now(), saves: data }, { merge: true });
    else await F.fs.setDoc(F.fs.doc(F.db, "users", user.uid), { arcade: data }, { merge: true });
  }
  async function flush() {
    if (!F || !user || !pending.size) return;
    const keys = [...pending]; pending.clear();
    const m = getMeta();
    setStatus("saving");
    try { await writeTo(where, keys, m); setStatus("saved"); return; }
    catch (e) {
      if (where === "arcade") {
        try { await writeTo("users", keys, m); where = "users"; setStatus("saved"); return; } catch (e2) { e = e2; }
      }
      keys.forEach(k => pending.add(k));
      console.warn("Arcade save failed", e);
      setStatus("error", code(e).includes("permission") ? "Your account can't save game data yet. The database rules need one change." : "Couldn't save to your account (" + code(e) + "). Trying again soon.");
      clearTimeout(timer); timer = setTimeout(flush, 15000);
    }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  addEventListener("pagehide", flush);

  // first sync after signing in: the newer save wins (your account's save beats progress made while signed out)
  async function syncDown() {
    setStatus("saving");
    let cloud = {}, ok = false, lastErr = null;
    const merge = obj => { for (const k in (obj || {})) if (!cloud[k] || (obj[k] && obj[k].t > cloud[k].t)) cloud[k] = obj[k]; };
    try { const s = await F.fs.getDoc(F.fs.doc(F.db, "arcade", user.uid)); ok = true; if (s.exists()) merge(s.data().saves); }
    catch (e) { lastErr = e; where = "users"; }
    try { const s = await F.fs.getDoc(F.fs.doc(F.db, "users", user.uid)); ok = true; if (s.exists()) merge(s.data().arcade); }
    catch (e) { lastErr = lastErr || e; }
    if (!ok) { console.warn("Arcade load failed", lastErr); synced = true; setStatus("error", "Couldn't load your saved games (" + code(lastErr) + ")."); return; }
    const m = getMeta(); let changed = false;
    KEYS.forEach(k => {
      const c = cloud[k.replace(/\./g, "_")], L = LS.getItem(k), lt = m[k] || 0;
      if (c && c.t >= lt) {
        if (c.v !== L) { c.v == null ? rawRemove.call(LS, k) : rawSet.call(LS, k, c.v); changed = true; }
        m[k] = c.t;
      } else if (L != null) { if (!m[k]) m[k] = Date.now(); pending.add(k); }
    });
    putMeta(m); synced = true;
    if (pending.size) flush(); else setStatus("saved");
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
      if (u) await syncDown(); else { synced = true; setStatus("off"); }
      emit();
    });
    return F;
  })().catch(e => { console.warn("Arcade accounts unavailable", e); return null; });

  // Google refuses to sign in from browsers built into apps (Instagram, TikTok, Snapchat, Facebook…)
  const IN_APP = /FBAN|FBAV|Instagram|Snapchat|TikTok|musical_ly|BytedanceWebview|Line\/|; wv\)|GSA\//i.test(navigator.userAgent || "");
  async function need() { const f = await ready; if (!f) throw { code: "auth/blocked-network" }; return f; }

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
    if (c.includes("popup-blocked")) return "Your browser blocked the Google sign-in window. Allow pop-ups for this site, then tap the button again.";
    if (c.includes("operation-not-supported") || c.includes("web-storage-unsupported") || c.includes("in-app")) return "Google sign-in doesn't work inside this app's browser. Open the page in Chrome or Safari — or use email below.";
    if (c.includes("blocked-network")) return "Sign-in is blocked on this internet (school Wi-Fi often blocks it). Try home Wi-Fi, or play without signing in.";
    if (c.includes("admin-restricted") || c.includes("user-disabled")) return "This Google account isn't allowed to sign in here (school accounts are often blocked). Try a personal Google account or email.";
    if (c.includes("cancelled-popup")) return "";
    if (c.includes("operation-not-allowed")) return "Email sign-in is turned off in Firebase. Turn on Email/Password under Authentication → Sign-in method.";
    if (c.includes("referer") || c.includes("api-key-not-valid") || c.includes("unauthorized-domain")) return "This website isn't allowed to use sign-in yet. Add thedailybark.dog in Firebase.";
    if (c.includes("missing-password")) return "Type your password.";
    return "Sign-in didn't work" + (c ? " (" + c.replace("auth/", "") + ")" : "") + ". Try again, or use email.";
  }

  window.Arcade = {
    ready,
    get user() { return user; },
    onChange(fn) { listeners.push(fn); fn(user); },
    onStatus(fn) { statusFns.push(fn); fn(status); },
    get status() { return status; },
    saveNow() { KEYS.forEach(k => { if (LS.getItem(k) != null) pending.add(k); }); return flush(); },
    nice,
    async signIn(email, pw) { const f = await need(); return f.au.signInWithEmailAndPassword(f.auth, email, pw); },
    async signUp(email, pw) { const f = await need(); return f.au.createUserWithEmailAndPassword(f.auth, email, pw); },
    async reset(email) { const f = await need(); return f.au.sendPasswordResetEmail(f.auth, email); },
    inAppBrowser: IN_APP,
    async google() {
      if (IN_APP) throw { code: "auth/in-app-browser" };
      const f = await need(), p = new f.au.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      // Pop-up only: the redirect fallback breaks in today's browsers (the sign-in page lives on another domain),
      // which made people land back on the page still signed out.
      return f.au.signInWithPopup(f.auth, p);
    },
    async signOut() { await flush(); const f = await ready; try { sessionStorage.removeItem("arcade_reloaded"); } catch (e) {} return f.au.signOut(f.auth); }
  };

  // ---------- 🏠 back-to-arcade button on every game page (drag it if it's in the way) ----------
  if (!IS_HUB) {
    const addBack = () => {
      if (window.ARCADE_NO_BACK || document.getElementById("arcadeBack")) return;
      const b = document.createElement("button");
      b.id = "arcadeBack"; b.type = "button"; b.setAttribute("aria-label", "Back to the arcade"); b.title = "Back to the arcade";
      b.innerHTML = '<span style="font-size:15px;line-height:1">‹</span><span style="font-size:17px;line-height:1">🏠</span>';
      b.style.cssText = "position:fixed;z-index:2147483000;left:8px;top:50%;height:40px;padding:0 10px;border-radius:20px;border:2px solid rgba(255,255,255,.35);" +
        "background:rgba(0,0,0,.5);color:#fff;display:flex;align-items:center;gap:4px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none";
      const KEY = "arcade_back_pos_" + location.pathname.split("/").filter(Boolean).pop();
      try { const p = JSON.parse(localStorage.getItem(KEY)); if (p) { b.style.left = p.x + "px"; b.style.top = p.y + "px"; } } catch (e) {}
      let down = null, moved = false;
      const stop = e => { e.stopPropagation(); };
      ["touchstart", "touchmove", "touchend", "mousedown", "mouseup", "click", "keydown"].forEach(t => b.addEventListener(t, stop));
      b.addEventListener("pointerdown", e => {
        e.stopPropagation(); e.preventDefault(); moved = false;
        const r = b.getBoundingClientRect(); down = { dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY };
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
      });
      b.addEventListener("pointermove", e => {
        if (!down) return; e.stopPropagation();
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true;
        if (!moved) return;
        const x = Math.max(0, Math.min(innerWidth - b.offsetWidth, e.clientX - down.dx)), y = Math.max(0, Math.min(innerHeight - b.offsetHeight, e.clientY - down.dy));
        b.style.left = x + "px"; b.style.top = y + "px";
      });
      b.addEventListener("pointerup", async e => {
        e.stopPropagation(); if (!down) return; down = null;
        if (moved) { try { localStorage.setItem(KEY, JSON.stringify({ x: parseInt(b.style.left), y: parseInt(b.style.top) })); } catch (_) {} return; }
        b.style.opacity = ".6";
        try { await Promise.race([flush(), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
        location.href = new URL("../", location.href).href;
      });
      (document.body || document.documentElement).appendChild(b);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addBack); else addBack();
  }
})();
