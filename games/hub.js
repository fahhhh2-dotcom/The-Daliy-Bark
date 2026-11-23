/* My Game Arcade — home, game pages, badges, profile, sign-in, sounds and effects */
(() => {
  const $ = id => document.getElementById(id);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    json(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = n => { n = Math.floor(n || 0); return n >= 1e9 ? (n / 1e9).toFixed(1).replace(".0", "") + "B" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : n.toLocaleString(); };
  const count = o => o && typeof o === "object" ? Object.keys(o).length : 0;

  const GAMES = {
    fishing: { name: "Deep Blue Fishing", key: "deep-blue-fishing-v1", genre: "Fishing", desc: "Cast your line, reel in fish of every color, and explore the islands of the deep blue sea. Sell your catch, upgrade your rod and boat, fill your aquarium, and unlock new worlds like Lava Island and Ice Island.", how: "<b>Tap</b> to cast your line, wait for a bite, then reel it in. Sell fish at the shop to buy better gear." },
    graveyard: { name: "Graveyard Defense", key: "graveyardTD", genre: "Tower Defense", desc: "Hold off waves of zombies with vampires, monsters and the mighty Headless Horseman. Earn medals, spend them in the shop between waves, and unlock spookier defenders.", how: "<b>Place</b> monsters along the path to stop the zombies. <b>Upgrade</b> in the shop between waves." },
    runner: { name: "Sandwich Sprint 3D", key: "sandwichSprintSave", genre: "Endless Runner", desc: "Dash through the sandwich shop, dodge bread carts and drink coolers, and grab every cookie. Spend cookies on outfits, a cookie magnet, spring shoes and second chances.", how: "<b>Swipe ← →</b> to switch lanes, <b>↑</b> to jump, <b>↓</b> to slide. On a computer use the arrow keys." },
    bugs: { name: "Wild Woods Bug Catching", key: "wild-woods-bugs-v1", genre: "Bug Catching", desc: "Grab your net and explore five areas: Sunny Meadow, Lily Pond, Oak Forest, Steamy Jungle and Moonlit Woods. Catch butterflies, beetles, dragonflies and rare glowing bugs to fill your Bug Book.", how: "<b>Press and hold</b> on a bug to trap it in your net, and keep holding until the ring fills up." },
    "last-ember": { name: "Last Ember", key: "lastEmberSave", genre: "Survival · Co-op", desc: "Survive 99 nights in a realistic 3D forest with your friends. Pick a skin, hunt, craft gear, upgrade the fire to open up the forest, rescue 5 lost kids — and don't look away from the Watcher.", how: "<b>Gather</b> wood to keep the fire going, <b>craft</b> gear and bandages, and make a <b>Friend World</b> you and your friends can come back to any time. If you go down, a friend has 1 minute to heal you — or you become a ghost until sunrise." },
    space: { name: "Space Explorer", key: "spaceExplorerSave", genre: "Space · Learning", desc: "Watch all eight planets orbit the Sun, tap any planet to learn about it, see what you'd weigh on other worlds, and take the Space Quiz to beat your best score.", how: "<b>Tap</b> a planet or the Sun for facts. Try the <b>Quiz</b> tab to test what you know." }
  };
  const ORDER = ["fishing", "graveyard", "runner", "bugs", "last-ember", "space"];

  // pictures (ids made unique for every copy)
  let artN = 0;
  const art = g => (window.ARCADE_ART[g] || "").replace(/id="(\w+)"/g, (m, id) => `id="${id}_${artN}"`).replace(/url\(#(\w+)\)/g, (m, id) => `url(#${id}_${artN++})`);

  // ---------- read each game's save ----------
  function readStats() {
    const f = ls.json(GAMES.fishing.key), g = ls.json(GAMES.graveyard.key), r = ls.json(GAMES.runner.key), b = ls.json(GAMES.bugs.key);
    const gs = (g && g.stats) || {};
    let bestWave = 0; if (g && g.maps) for (const m in g.maps) bestWave = Math.max(bestWave, g.maps[m].best || 0, (g.maps[m].wave || 1) - 1);
    return {
      fishing: f && { money: f.money || 0, species: count(f.book), worlds: 1 + count(f.unlocked), aquarium: (f.aquarium || []).length },
      graveyard: g && { kills: gs.kills || 0, won: gs.won || 0, wave: Math.max(bestWave, gs.best || 0), medals: g.medals || 0, monsters: count(g.unlocked) },
      runner: r && { best: r.best || 0, bank: r.bank || 0, outfits: (r.owned || []).length },
      bugs: b && { money: b.money || 0, species: count(b.book), areas: (b.unlocked || []).filter(Boolean).length },
      "last-ember": (ls.get("lastEmberBest") !== null || ls.get("lastEmberSave") !== null) ? { best: +ls.get("lastEmberBest") || 0 } : null,
      space: (() => { const s = ls.json("spaceExplorerSave"); return s && { best: s.best || 0, quizzes: s.quizzes || 0, viewed: (s.viewed || []).length }; })()
    };
  }
  const statList = (g, S) => {
    const s = S[g]; if (!s) return null;
    return {
      fishing: [["Money", "$" + fmt(s.money)], ["Fish found", s.species], ["Worlds", s.worlds], ["In aquarium", s.aquarium]],
      graveyard: [["Zombies defeated", fmt(s.kills)], ["Best wave", s.wave], ["Medals", s.medals], ["Monsters", s.monsters]],
      runner: [["Best score", fmt(s.best)], ["Cookies", "🍪 " + fmt(s.bank)], ["Outfits", s.outfits]],
      bugs: [["Money", "$" + fmt(s.money)], ["Bugs found", s.species], ["Areas", s.areas + " / 5"]],
      "last-ember": [["Best nights", s.best], ["Goal", s.best >= 99 ? "🏆 Survived!" : "🔥 99 nights"]],
      space: [["Best quiz", s.best + " / 7"], ["Quizzes taken", s.quizzes], ["Worlds explored", s.viewed + " / 9"]]
    }[g];
  };

  // ---------- badges ----------
  const BADGES = [
    { id: "hello", g: null, ic: "👋", name: "Welcome!", how: "Play any game", ok: S => ORDER.some(g => S[g]) },
    { id: "f1", g: "fishing", ic: "🎣", name: "First Catch", how: "Catch a fish", ok: S => S.fishing && S.fishing.species >= 1 },
    { id: "f10", g: "fishing", ic: "🐠", name: "Fish Finder", how: "Find 10 kinds of fish", ok: S => S.fishing && S.fishing.species >= 10 },
    { id: "f25", g: "fishing", ic: "🦈", name: "Ocean Expert", how: "Find 25 kinds of fish", ok: S => S.fishing && S.fishing.species >= 25 },
    { id: "fm", g: "fishing", ic: "💰", name: "Fishing Tycoon", how: "Have $100K in Deep Blue Fishing", ok: S => S.fishing && S.fishing.money >= 1e5 },
    { id: "fw", g: "fishing", ic: "🌋", name: "Island Hopper", how: "Unlock a new world", ok: S => S.fishing && S.fishing.worlds >= 2 },
    { id: "g1", g: "graveyard", ic: "🧟", name: "Zombie Stopper", how: "Defeat 100 zombies", ok: S => S.graveyard && S.graveyard.kills >= 100 },
    { id: "g2", g: "graveyard", ic: "⚰️", name: "Graveyard Guard", how: "Defeat 1,000 zombies", ok: S => S.graveyard && S.graveyard.kills >= 1000 },
    { id: "gw", g: "graveyard", ic: "🌕", name: "Wave Warrior", how: "Reach wave 10", ok: S => S.graveyard && S.graveyard.wave >= 10 },
    { id: "gm", g: "graveyard", ic: "🎃", name: "Monster Army", how: "Unlock 5 monsters", ok: S => S.graveyard && S.graveyard.monsters >= 5 },
    { id: "r1", g: "runner", ic: "🏃", name: "Speedy", how: "Score 1,000 in Sandwich Sprint", ok: S => S.runner && S.runner.best >= 1000 },
    { id: "r2", g: "runner", ic: "⚡", name: "Lightning Legs", how: "Score 5,000 in Sandwich Sprint", ok: S => S.runner && S.runner.best >= 5000 },
    { id: "rc", g: "runner", ic: "🍪", name: "Cookie Monster", how: "Save up 200 cookies", ok: S => S.runner && S.runner.bank >= 200 },
    { id: "ro", g: "runner", ic: "👕", name: "Dressed Up", how: "Own 3 outfits", ok: S => S.runner && S.runner.outfits >= 3 },
    { id: "b1", g: "bugs", ic: "🐞", name: "Bug Spotter", how: "Catch a bug", ok: S => S.bugs && S.bugs.species >= 1 },
    { id: "b10", g: "bugs", ic: "🦋", name: "Bug Expert", how: "Find 10 kinds of bugs", ok: S => S.bugs && S.bugs.species >= 10 },
    { id: "ba", g: "bugs", ic: "🌲", name: "Explorer", how: "Unlock a new forest area", ok: S => S.bugs && S.bugs.areas >= 2 },
    { id: "e1", g: "last-ember", ic: "🔥", name: "Keep It Lit", how: "Survive 5 nights in Last Ember", ok: S => S["last-ember"] && S["last-ember"].best >= 5 },
    { id: "e2", g: "last-ember", ic: "🐺", name: "Wolf Fighter", how: "Survive 25 nights in Last Ember", ok: S => S["last-ember"] && S["last-ember"].best >= 25 },
    { id: "e3", g: "last-ember", ic: "🌲", name: "99 Nights", how: "Survive all 99 nights", ok: S => S["last-ember"] && S["last-ember"].best >= 99 },
    { id: "s1", g: "space", ic: "🪐", name: "Stargazer", how: "Learn about 5 worlds in Space Explorer", ok: S => S.space && S.space.viewed >= 5 },
    { id: "s2", g: "space", ic: "🚀", name: "Space Cadet", how: "Score 5 or more on the Space Quiz", ok: S => S.space && S.space.best >= 5 },
    { id: "s3", g: "space", ic: "🧑‍🚀", name: "Mission Control", how: "Get a perfect Space Quiz", ok: S => S.space && S.space.best >= 7 },
    { id: "all", g: null, ic: "🕹️", name: "Arcade Explorer", how: "Play all 6 games", ok: S => ORDER.every(g => S[g]) },
    { id: "day", g: null, ic: "⭐", name: "Daily Player", how: "Play the Game of the Day", ok: () => ls.get("arcade_gotd_played") === today() },
    { id: "lucky", g: null, ic: "🎲", name: "Feeling Lucky", how: "Use Surprise Me", ok: () => !!ls.get("arcade_surprised") }
  ];
  const LEVELS = ["Arcade Rookie", "Button Masher", "High Scorer", "Game Hero", "Arcade Pro", "Arcade Champion", "Arcade Legend"];
  const gotBadges = S => BADGES.filter(b => { try { return !!b.ok(S); } catch (e) { return false; } }).map(b => b.id);
  const badgeHTML = (b, has) => `<div class="badge ${has ? "got" : ""}" data-b="${b.id}"><div class="ic">${b.ic}</div><b>${b.name}</b><small>${has ? "Unlocked!" : b.how}</small></div>`;

  // ---------- plays, favorites, game of the day ----------
  const plays = () => ls.json("arcade_plays") || {};
  const favs = () => ls.json("arcade_favs") || [];
  function today() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  const dayNum = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  const gotd = ORDER[dayNum % ORDER.length];
  function launch(g) {
    const p = plays(); p[g] = (p[g] || 0) + 1; ls.set("arcade_plays", JSON.stringify(p));
    ls.set("arcade_last", g); ls.set("arcade_recent", JSON.stringify([g, ...(ls.json("arcade_recent") || []).filter(x => x !== g)].slice(0, 8)));
    if (g === gotd) ls.set("arcade_gotd_played", today());
    sfx("go");
  }

  // ---------- tiles ----------
  function tile(g, S, opts = {}) {
    const st = S[g], p = plays()[g] || 0;
    let meta = p ? `<span>▶ ${p} play${p === 1 ? "" : "s"}</span>` : `<span>🆕 New</span>`;
    if (st) { const l = statList(g, S)[0]; meta += `<span>${esc(l[1])}</span>`; }
    const prog = opts.progress ? `<div class="bar"><i style="width:${Math.min(100, 15 + (gotBadges(S).filter(id => (BADGES.find(b => b.id === id) || {}).g === g).length / BADGES.filter(b => b.g === g).length) * 85)}%"></i></div>` : "";
    return `<div class="tile" data-g="${g}"><div class="thumb">${art(g)}${g === gotd ? '<span class="tag">⭐ TODAY</span>' : ""}${prog}</div><b>${GAMES[g].name}</b><div class="meta">${meta}</div></div>`;
  }
  document.addEventListener("click", e => {
    const t = e.target.closest(".tile[data-g]"); if (t) { sfx("tap"); location.hash = "game-" + t.dataset.g; return; }
    const bd = e.target.closest(".badge[data-b]");
    if (bd) { const b = BADGES.find(x => x.id === bd.dataset.b); sfx("tap"); popup(bd.classList.contains("got") ? `${b.ic} ${b.name}: you got it!` : `${b.ic} ${b.name}: ${b.how}`); }
  });

  // ---------- views ----------
  let S = readStats();
  function paintHome() {
    const recent = (ls.json("arcade_recent") || []).filter(g => GAMES[g]);
    $("contWrap").hidden = !recent.length;
    $("contRow").innerHTML = recent.map(g => tile(g, S, { progress: true })).join("");
    $("recRow").innerHTML = ORDER.map(g => tile(g, S)).join("");
    const G = GAMES[gotd];
    $("feature").innerHTML = `<div class="bg">${art(gotd)}</div><div class="shade"></div><div class="txt"><small>⭐ GAME OF THE DAY</small><h3>${G.name}</h3><p>${G.desc.split(". ")[0]}.</p><a class="play" href="${gotd}/" data-go="${gotd}"><svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5v15l13-7.5z"/></svg> Play</a></div>`;
    $("feature").onclick = e => { if (!e.target.closest(".play")) location.hash = "game-" + gotd; };
    const ids = gotBadges(S), got = BADGES.filter(b => ids.includes(b.id)), next = BADGES.filter(b => !ids.includes(b.id));
    $("badgeRow").innerHTML = [...got, ...next].slice(0, 10).map(b => `<div class="tile" style="cursor:default">${badgeHTML(b, ids.includes(b.id))}</div>`).join("");
  }
  function paintGames(q) {
    const list = ORDER.filter(g => !q || (GAMES[g].name + " " + GAMES[g].genre).toLowerCase().includes(q.toLowerCase()));
    $("gamesTitle").textContent = q ? `Results for "${q}"` : "All Games";
    $("allRow").innerHTML = list.length ? list.map(g => tile(g, S)).join("") : `<div class="empty" style="grid-column:1/-1">No games match "${esc(q)}"</div>`;
  }
  let curGame = null;
  function paintGame(g) {
    curGame = g; const G = GAMES[g];
    $("gArt").innerHTML = art(g);
    $("gName").textContent = G.name; $("gGenre").textContent = G.genre;
    $("gPlay").href = g + "/"; $("gPlay").dataset.go = g;
    $("gPlays").textContent = plays()[g] || 0;
    const ids = gotBadges(S), mine = BADGES.filter(b => b.g === g);
    $("gBadges").textContent = `${mine.filter(b => ids.includes(b.id)).length}/${mine.length}`;
    const fav = favs().includes(g);
    $("gFav").innerHTML = `<span>${fav ? "💛" : "🤍"}</span>${fav ? "Favorited" : "Favorite"}`; $("gFav").classList.toggle("on", fav);
    $("gDesc").textContent = G.desc;
    const sl = statList(g, S);
    $("gStats").innerHTML = sl ? sl.map(([l, v]) => `<div class="stat"><small>${l}</small><b>${esc(v)}</b></div>`).join("") : `<div class="empty" style="grid-column:1/-1">🆕 You haven't played yet. Press Play to start!</div>`;
    $("gHow").innerHTML = "🎮 " + G.how;
    $("gBadgeGrid").innerHTML = mine.map(b => badgeHTML(b, ids.includes(b.id))).join("");
    $("moreRow").innerHTML = ORDER.filter(x => x !== g).map(x => tile(x, S)).join("");
    setTab("about");
  }
  $("gFav").onclick = () => { let f = favs(); f = f.includes(curGame) ? f.filter(x => x !== curGame) : [...f, curGame]; ls.set("arcade_favs", JSON.stringify(f)); sfx("tap"); paintGame(curGame); lastKey = ""; };
  function setTab(t) { document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t)); $("t-about").hidden = t !== "about"; $("t-gbadges").hidden = t !== "gbadges"; }
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { sfx("tap"); setTab(b.dataset.tab); });
  $("backBtn").onclick = () => { history.length > 1 ? history.back() : (location.hash = "home"); };

  function paintBadges() {
    const ids = gotBadges(S);
    $("bgrid").innerHTML = BADGES.map(b => badgeHTML(b, ids.includes(b.id))).join("");
    $("badgeCount").textContent = `${ids.length} / ${BADGES.length}`;
  }
  function paintProfile() {
    const f = favs();
    $("favRow").innerHTML = f.length ? f.map(g => tile(g, S)).join("") : `<div class="empty" style="grid-column:1/-1">Tap 🤍 Favorite on a game to add it here.</div>`;
  }

  // ---------- level, points, who ----------
  function paintMe() {
    const ids = gotBadges(S), n = ids.length;
    const lv = Math.min(LEVELS.length - 1, Math.floor(n / 3)), into = n - lv * 3, max = lv === LEVELS.length - 1;
    $("lvName").textContent = LEVELS[lv]; $("lvNum").textContent = "Level " + (lv + 1);
    $("xpFill").style.width = (max ? 100 : (into / 3) * 100) + "%";
    $("lvNext").textContent = max ? "You maxed out the arcade! 🏆" : `${3 - into} more badge${3 - into === 1 ? "" : "s"} to reach ${LEVELS[lv + 1]}`;
    const totalPlays = Object.values(plays()).reduce((a, b) => a + b, 0), pts = n * 100 + totalPlays * 5;
    $("ptsN").textContent = fmt(pts);
    const u = window.Arcade && Arcade.user;
    const name = u ? (u.displayName || (u.email || "Player").split("@")[0]) : "Guest";
    const init = name[0].toUpperCase();
    ["acct", "sideAv", "helloAv", "profAv"].forEach(id => $(id).textContent = u ? init : "?");
    $("sideName").textContent = name; $("sideLv").textContent = `Level ${lv + 1} · ${LEVELS[lv]}`;
    const h = new Date().getHours();
    $("helloTxt").textContent = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (u ? ", " + name + "!" : "!");
    $("helloSub").textContent = u ? "☁️ Your progress is saving to your account" : "Sign in to save your progress on every device";
    $("profName").textContent = name; $("profSub").textContent = u ? "Signed in as " + (u.email || name) : "Not signed in. Your progress only saves on this device.";
    $("pLv").textContent = lv + 1; $("pBadges").textContent = n; $("pPlays").textContent = totalPlays; $("pPts").textContent = fmt(pts);
    $("profSign").textContent = u ? "Sign out" : "Sign in";
    $("signTxt").textContent = u ? "Signed in ✓" : "Sign in to save";
  }

  // ---------- router ----------
  const navOf = v => v === "game" ? "games" : v;
  let lastView = null, lastKey = "", booted = false;
  function route(fromNav) {
    const h = location.hash.slice(1) || "home";
    let v = h, g = null;
    if (h.startsWith("game-") && GAMES[h.slice(5)]) { v = "game"; g = h.slice(5); }
    if (!["home", "games", "game", "badges", "profile"].includes(v)) v = "home";
    const key = h + "|" + JSON.stringify(S) + "|" + (window.Arcade && Arcade.user ? Arcade.user.uid : "");
    if (!fromNav && key === lastKey) return;   // nothing changed: don't redraw (stops flicker)
    lastKey = key; const changedPage = lastView !== h; lastView = h;
    document.querySelectorAll(".view").forEach(s => s.hidden = s.id !== "v-" + v);
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === navOf(v)));
    if (v === "home") paintHome(); else if (v === "games") paintGames($("q").value.trim()); else if (v === "game") paintGame(g); else if (v === "badges") paintBadges(); else paintProfile();
    document.body.classList.remove("menu");
    if (fromNav && changedPage) scrollTo(0, 0);
  }
  addEventListener("hashchange", () => route(true));
  $("q").addEventListener("input", () => { if (location.hash !== "#games") location.hash = "games"; else paintGames($("q").value.trim()); });

  // menu (phones)
  $("burger").onclick = () => document.body.classList.toggle("menu");
  $("scrim").onclick = () => document.body.classList.remove("menu");
  $("meBox").onclick = () => location.hash = "profile";
  $("pts").onclick = () => popup("🪙 Arcade points: 100 for every badge, 5 for every game you play.");

  // launching a game
  document.addEventListener("click", e => { const a = e.target.closest("a[data-go]"); if (a) launch(a.dataset.go); });

  // ---------- surprise me ----------
  function surprise() {
    ls.set("arcade_surprised", "1"); document.body.classList.remove("menu");
    const pick = ORDER[Math.floor(Math.random() * ORDER.length)];
    $("slot").hidden = false;
    let i = 0; const steps = 16 + ORDER.indexOf(pick);
    const spin = () => {
      const g = ORDER[i % ORDER.length];
      $("slotName").textContent = GAMES[g].name; sfx("tick", 300 + (i % 4) * 80);
      if (i >= steps && g === pick) { sfx("win"); confetti(); setTimeout(() => { launch(pick); location.href = pick + "/"; }, 900); return; }
      i++; setTimeout(spin, 50 + i * i * .9);
    };
    spin();
  }
  $("surprise").onclick = surprise; $("surprise2").onclick = surprise;

  // ---------- sign in ----------
  let mode = "in";
  const msg = (t, ok) => { $("mMsg").textContent = t || ""; $("mMsg").className = "msg" + (ok ? " ok" : ""); };
  const busy = b => { $("mGo").disabled = $("mGoogle").disabled = b; };
  function paintMode() {
    $("mTitle").textContent = mode === "in" ? "Sign in" : "Make an account";
    $("mGo").textContent = mode === "in" ? "Sign in" : "Make my account";
    $("mSwap").textContent = mode === "in" ? "New here? Make an account" : "Have an account? Sign in";
    $("mPw").autocomplete = mode === "in" ? "current-password" : "new-password"; msg("");
  }
  const openM = () => { document.body.classList.remove("menu"); $("modal").hidden = false; };
  const closeM = () => { $("modal").hidden = true; msg(""); busy(false); };
  $("acct").onclick = openM; $("signBtn").onclick = openM;
  $("profSign").onclick = async () => { if (Arcade.user) { await Arcade.signOut(); popup("Signed out"); } else openM(); };
  $("mClose").onclick = closeM; $("mDone").onclick = closeM;
  $("modal").onclick = e => { if (e.target.id === "modal") closeM(); };
  $("mSwap").onclick = () => { mode = mode === "in" ? "up" : "in"; paintMode(); };
  $("mForm").onsubmit = async e => {
    e.preventDefault();
    const email = $("mEmail").value.trim(), pw = $("mPw").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Type a real email, like you@gmail.com");
    if (mode === "up" && pw.length < 6) return msg("Make your password at least 6 letters or numbers.");
    busy(true); msg("Signing you in…", true);
    try { mode === "up" ? await Arcade.signUp(email, pw) : await Arcade.signIn(email, pw); }
    catch (ex) { busy(false); msg(Arcade.nice(ex)); }
  };
  $("mGoogle").onclick = async () => { busy(true); msg(""); try { await Arcade.google(); } catch (ex) { busy(false); msg(Arcade.nice(ex)); } };
  $("mForgot").onclick = async () => {
    const email = $("mEmail").value.trim();
    if (!email) return msg('Type your email first, then tap "Forgot password?"');
    try { await Arcade.reset(email); msg("Check " + email + " for a link to make a new password.", true); } catch (ex) { msg(Arcade.nice(ex)); }
  };
  $("mOutBtn").onclick = async () => { await Arcade.signOut(); closeM(); };

  // ---------- sounds ----------
  let muted = ls.get("arcade_muted") === "1", actx = null;
  const paintSnd = () => $("snd").textContent = muted ? "🔇" : "🔊";
  $("snd").onclick = () => { muted = !muted; ls.set("arcade_muted", muted ? "1" : "0"); paintSnd(); sfx("tap"); };
  paintSnd();
  function sfx(type, f) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const notes = { tap: [[660, .05]], tick: [[f || 440, .04]], go: [[523, .08], [784, .12]], win: [[523, .1], [659, .1], [784, .1], [1046, .25]] }[type] || [[440, .05]];
      let t = actx.currentTime;
      notes.forEach(([hz, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "square"; o.frequency.value = hz; g.gain.setValueAtTime(.04, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d); t += d * .9; });
    } catch (e) {}
  }

  // ---------- popup + confetti ----------
  let popT;
  function popup(t) { const p = $("pop"); p.textContent = t; p.classList.add("show"); clearTimeout(popT); popT = setTimeout(() => p.classList.remove("show"), 2800); }
  const cv = $("confetti"), cx = cv.getContext("2d"); let bits = [], raf = 0;
  function confetti() {
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ffc83d", "#3fc679", "#3d6bff", "#ff6fa8", "#fff"];
    for (let i = 0; i < 140; i++) bits.push({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], life: 120 });
    if (!raf) loop();
  }
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height); bits = bits.filter(b => b.life-- > 0);
    bits.forEach(b => { b.vy += .4; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr; cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c; cx.globalAlpha = Math.min(1, b.life / 30); cx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cx.restore(); });
    raf = bits.length ? requestAnimationFrame(loop) : 0; if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  // ---------- refresh everything ----------
  function celebrate() {
    const ids = gotBadges(S), seen = ls.json("arcade_badges_seen") || [];
    const fresh = BADGES.filter(b => ids.includes(b.id) && !seen.includes(b.id));
    if (fresh.length) setTimeout(() => { confetti(); sfx("win"); popup(`🏅 New badge${fresh.length > 1 ? "s" : ""}: ${fresh.map(b => b.ic + " " + b.name).join(", ")}`); }, 600);
    ls.set("arcade_badges_seen", JSON.stringify(ids));
  }
  function refresh() { S = readStats(); paintMe(); route(false); celebrate(); }
  if (window.Arcade) Arcade.onChange(u => {
    busy(false); $("mOut").hidden = !!u; $("mIn").hidden = !u;
    if (u) { $("mWho").textContent = "Signed in as " + (u.email || u.displayName); msg(""); }
    if (booted) refresh();
  });
  addEventListener("pageshow", e => { if (e.persisted) refresh(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { S = readStats(); paintMe(); celebrate(); } });
  paintMode(); refresh(); booted = true;
})();
