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
    nebula: { name: "Nebula Blaster", key: "nebulaBest", genre: "Space Shooter", desc: "Blast asteroids, zigzag saucers and dive-bombing alien ships in a glowing neon nebula. Grab triple shot, shields, extra lives and bombs, build up combos, and survive a giant boss every 5 waves.", how: "<b>Arrow keys / WASD</b> to fly (it fires by itself). <b>Space</b> drops a bomb. On a phone, <b>drag your finger</b> to fly and <b>double-tap</b> for a bomb." },
    tycoon: { name: "Phone Factory Tycoon", key: "phoneTycoon", genre: "Tycoon", desc: "Start a phone company in a garage. Design phones, build them on the assembly line, set your prices, hire workers, research new tech like 5G and folding screens, and grow into a phone empire worth $1,000,000.", how: "<b>Design</b> a phone and save it, <b>click the parts in order</b> to build it, then set a fair price so shoppers buy it." },
    peaks: { name: "Peak Finder", key: "peakFinderBest", genre: "Geography", desc: "Find the biggest mountains and mountain ranges of North and South America on the map, from Denali to Aconcagua and the Andes. Study the map first, then go for 3 stars on every place.", how: "<b>Tap the dot</b> where the mountain is. Stuck? Use a <b>hint</b>, or try <b>Study the map</b> first." },
    sus: { name: "Space Suspects", key: "spaceSusStats", genre: "Hide & Find · Online", desc: "Fix the space station with your crew of jelly-bots… but someone is a sneaky Saboteur! Do task mini-games, report bodies, call emergency meetings, chat and vote out the suspect. Play against bots, or host a game and friends join with a code.", how: "<b>WASD</b> or the <b>joystick</b> to move. <b>USE</b> at a ! to do a task. Saboteurs <b>ZAP</b> crew when nobody's looking. <b>REPORT</b> bodies, then vote!" },
    melon: { name: "Melon Lab Sandbox", key: "melonLabStats", genre: "Physics Sandbox · Online", desc: "A physics playground like Melon Playground. Drop in floppy melon, pumpkin and lemon people, then throw them, smash them with the hammer, shoot them with cartoon guns, cut off arms and legs, blow them up with TNT, or try out syringes like Acid, Immortal and Giant Rage. Play as your own guy, and host a lab so friends can join you online.", how: "<b>Pick</b> something from the bottom bar and <b>tap</b> to drop it in. <b>🎮 Play</b> to be a guy (A/D to walk, W to jump, F to punch). <b>👥 Online</b> to host or join a friend's lab." },
    spelling: { name: "Spelling Quest", key: "sq9-best-mix", genre: "Spelling", desc: "Practice your spelling words with 9 different mini-games: hangman, word scramble, hear-and-spell, match, fill the gap, beat the clock and more. Try to set a best score in every mode.", how: "<b>Pick a game mode</b>, listen to the word and spell it. Every mode keeps your best score." }
  };
  const ORDER = ["sus", "melon", "fishing", "graveyard", "runner", "bugs", "last-ember", "nebula", "tycoon", "peaks", "spelling"];
  const NEW_GAMES = ["sus", "melon", "nebula", "tycoon", "peaks", "spelling"];

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
      nebula: ls.get("nebulaBest") !== null ? { best: +ls.get("nebulaBest") || 0 } : null,
      tycoon: (() => { const t = ls.json("phoneTycoon"); return t && t.company ? { money: t.money || 0, sold: t.sold || 0, day: t.day || 1, models: (t.models || []).length, research: count(t.unlocked) } : null; })(),
      peaks: ls.get("peakFinderBest") !== null ? { stars: +ls.get("peakFinderBest") || 0 } : null,
      sus: (() => { const m = ls.json("spaceSusStats"); return m && m.games ? { games: m.games || 0, wins: m.wins || 0, impWins: m.impWins || 0, tasks: m.tasks || 0, zaps: m.zaps || 0 } : null; })(),
      melon: (() => { const m = ls.json("melonLabStats"); return m && { spawned: m.spawned || 0, booms: m.booms || 0, kos: m.kos || 0 }; })(),
      spelling: (() => { const modes = ["abc","clock","gap","hangman","hear","match","mix","scramble","spot"]; let played = 0, best = 0; modes.forEach(m => { const v = parseFloat(ls.get("sq9-best-" + m)); if (!isNaN(v)) { played++; best = Math.max(best, v); } }); return played ? { modes: played, best } : null; })()
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
      nebula: [["High score", fmt(s.best)]],
      tycoon: [["Money", "$" + fmt(s.money)], ["Phones sold", fmt(s.sold)], ["Day", s.day], ["Research", s.research + " / 6"]],
      peaks: [["Best stars", s.stars + " / 24"]],
      sus: [["Games", s.games], ["Wins", s.wins], ["Tasks done", s.tasks], ["Saboteur wins", s.impWins]],
      melon: [["Things made", fmt(s.spawned)], ["Explosions", fmt(s.booms)], ["Knock-outs", fmt(s.kos)]],
      spelling: [["Modes played", s.modes + " / 9"], ["Top score", fmt(s.best)]]
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
    { id: "n1", g: "nebula", ic: "🚀", name: "Space Ace", how: "Score 5,000 in Nebula Blaster", ok: S => S.nebula && S.nebula.best >= 5000 },
    { id: "n2", g: "nebula", ic: "👾", name: "Boss Buster", how: "Score 25,000 in Nebula Blaster", ok: S => S.nebula && S.nebula.best >= 25000 },
    { id: "t1", g: "tycoon", ic: "📱", name: "First Sale", how: "Sell a phone in Phone Factory Tycoon", ok: S => S.tycoon && S.tycoon.sold >= 1 },
    { id: "t2", g: "tycoon", ic: "🏢", name: "Big Business", how: "Have $100K in Phone Factory Tycoon", ok: S => S.tycoon && S.tycoon.money >= 1e5 },
    { id: "t3", g: "tycoon", ic: "👑", name: "Phone Empire", how: "Reach $1 million in Phone Factory Tycoon", ok: S => S.tycoon && S.tycoon.money >= 1e6 },
    { id: "p1", g: "peaks", ic: "🏔️", name: "Mountain Master", how: "Get 20+ stars in Peak Finder", ok: S => S.peaks && S.peaks.stars >= 20 },
    { id: "m1", g: "melon", ic: "🍉", name: "Mad Scientist", how: "Make 50 things in Melon Lab", ok: S => S.melon && S.melon.spawned >= 50 },
    { id: "m2", g: "melon", ic: "💥", name: "Demolition Crew", how: "Set off 25 explosions in Melon Lab", ok: S => S.melon && S.melon.booms >= 25 },
    { id: "m3", g: "melon", ic: "🥊", name: "Fruit Fighter", how: "Knock out 10 fruit people in Melon Lab", ok: S => S.melon && S.melon.kos >= 10 },
    { id: "su1", g: "sus", ic: "🔧", name: "Good Crewmate", how: "Finish 20 tasks in Space Suspects", ok: S => S.sus && S.sus.tasks >= 20 },
    { id: "su2", g: "sus", ic: "⚡", name: "Sneaky Saboteur", how: "Win as the Saboteur", ok: S => S.sus && S.sus.impWins >= 1 },
    { id: "su3", g: "sus", ic: "🕵️", name: "Detective", how: "Win 5 games of Space Suspects", ok: S => S.sus && S.sus.wins >= 5 },
    { id: "w1", g: "spelling", ic: "✏️", name: "Word Wizard", how: "Play 5 Spelling Quest modes", ok: S => S.spelling && S.spelling.modes >= 5 },
    { id: "all", g: null, ic: "🕹️", name: "Arcade Explorer", how: "Play all 11 games", ok: S => ORDER.every(g => S[g]) },
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
    return `<div class="tile" data-g="${g}"><div class="thumb">${art(g)}${g === gotd ? '<span class="tag">⭐ TODAY</span>' : NEW_GAMES.includes(g) && !plays()[g] ? '<span class="tag" style="background:#3fc679;color:#fff">🆕 NEW</span>' : ""}${prog}</div><b>${GAMES[g].name}</b><div class="meta">${meta}</div></div>`;
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
    const EXTRA = { sus: "among us impostor saboteur crew space vote sus", melon: "melon sandbox playground ragdoll physics tnt", nebula: "space shooter galaxy rocket", tycoon: "phone money business", peaks: "mountains map geography", spelling: "words school", "last-ember": "99 nights forest survival horror", fishing: "fish ocean", graveyard: "zombie halloween tower", runner: "subway run sandwich", bugs: "bug catching net forest" };
    const words = (q || "").toLowerCase().split(/\s+/).filter(Boolean);
    const list = ORDER.filter(g => { const hay = (GAMES[g].name + " " + GAMES[g].genre + " " + (EXTRA[g] || "")).toLowerCase(); return words.every(w => hay.includes(w)); });
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
    const totalPlays = Object.values(plays()).reduce((a, b) => a + b, 0), pts = coins();
    $("ptsN").textContent = fmt(pts);
    const u = window.Arcade && Arcade.user;
    const name = u ? (u.displayName || (u.email || "Player").split("@")[0]) : "Guest";
    const init = name[0].toUpperCase();
    const AV = window.ArcadeAvatar, head = AV ? AV.svg(AV.get(), { head: true }) : null;
    ["acct", "sideAv", "helloAv", "profAv"].forEach(id => { if (head) $(id).innerHTML = head; else $(id).textContent = u ? init : "?"; });
    $("sideName").textContent = name; $("sideLv").textContent = `Level ${lv + 1} · ${LEVELS[lv]}`;
    const h = new Date().getHours();
    $("helloTxt").textContent = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (u ? ", " + name + "!" : "!");
    $("helloSub").textContent = u ? "☁️ Your progress is saving to your account" : "Sign in to save your progress on every device";
    $("profName").textContent = name; $("profSub").textContent = u ? "Signed in as " + (u.email || name) : "Not signed in. Your progress only saves on this device.";
    $("pLv").textContent = lv + 1; $("pBadges").textContent = n; $("pPlays").textContent = totalPlays; $("pPts").textContent = fmt(pts);
    $("profSign").textContent = u ? "Sign out" : "Sign in";
    $("signTxt").textContent = u ? ({ saved: "Saved ✓", saving: "Saving…", error: "⚠️ Not saving" }[(window.Arcade && Arcade.status.state) || "saved"] || "Signed in ✓") : "Sign in to save";
  }

  // ---------- router ----------
  const navOf = v => v === "game" ? "games" : v;
  let lastView = null, lastKey = "", booted = false;
  function route(fromNav) {
    const h = location.hash.slice(1) || "home";
    let v = h, g = null;
    if (h.startsWith("game-") && GAMES[h.slice(5)]) { v = "game"; g = h.slice(5); }
    if (!["home", "games", "game", "badges", "profile", "avatar"].includes(v)) v = "home";
    const key = h + "|" + JSON.stringify(S) + "|" + (window.Arcade && Arcade.user ? Arcade.user.uid : "") + "|" + ls.get("arcade_avatar") + ls.get("arcade_wallet");
    if (!fromNav && key === lastKey) return;   // nothing changed: don't redraw (stops flicker)
    lastKey = key; const changedPage = lastView !== h; lastView = h;
    document.querySelectorAll(".view").forEach(s => s.hidden = s.id !== "v-" + v);
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === navOf(v)));
    if (v === "home") paintHome(); else if (v === "games") paintGames($("q").value.trim()); else if (v === "game") paintGame(g); else if (v === "badges") paintBadges(); else if (v === "avatar") paintAvatar(); else paintProfile();
    document.body.classList.remove("menu");
    if (fromNav && changedPage) scrollTo(0, 0);
  }
  addEventListener("hashchange", () => route(true));
  $("q").addEventListener("input", () => { if (location.hash !== "#games") location.hash = "games"; else paintGames($("q").value.trim()); });
  $("q2").addEventListener("input", () => { $("q").value = $("q2").value; paintGames($("q2").value.trim()); });

  // menu (phones)
  $("burger").onclick = () => document.body.classList.toggle("menu");
  $("scrim").onclick = () => document.body.classList.remove("menu");
  $("meBox").onclick = () => location.hash = "profile";
  $("pts").onclick = () => { location.hash = "avatar"; };

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
  // ---------- coins + avatar shop ----------
  const wallet = () => Object.assign({ spent: 0, owned: [] }, ls.json("arcade_wallet") || {});
  function coins() {
    const n = gotBadges(S).length, p = Object.values(plays()).reduce((a, b) => a + b, 0);
    return Math.max(0, 100 + n * 100 + p * 10 - wallet().spent);
  }
  let avCat = "skin";
  function avOptions() {
    const AV = window.ArcadeAvatar;
    if (avCat === "skin") return AV.TONES.map((c, i) => ({ key: "tone", val: i, n: "Tone " + (i + 1), p: 0, sw: c }));
    if (avCat === "hair") return [...AV.HAIR.map(h => ({ key: "hair", val: h.id, n: h.n, p: 0, prev: true })), ...AV.HAIRC.map((c, i) => ({ key: "hairC", val: i, n: "Color " + (i + 1), p: 0, sw: c }))];
    if (avCat === "shirt") return AV.COLORS.map((c, i) => ({ key: "shirt", val: i, n: c.n, p: c.p, sw: c.c }));
    if (avCat === "pants") return AV.PANTS.map((c, i) => ({ key: "pants", val: i, n: c.n, p: c.p, sw: c.c }));
    if (avCat === "hat") return [...AV.HATS.map(x => ({ key: "hat", val: x.id, n: x.n, p: x.p, prev: true })), ...AV.COLORS.map((c, i) => ({ key: "hatC", val: i, n: c.n + " hat", p: 0, sw: c.c, needHat: true }))];
    return [...AV.EXTRAS.map(x => ({ key: "extra", val: x.id, n: x.n, p: x.p, prev: true })), ...AV.COLORS.map((c, i) => ({ key: "hatC", val: i, n: c.n + " cape/scarf", p: 0, sw: c.c, needExtra: true }))];
  }
  function paintAvatar() {
    const AV = window.ArcadeAvatar, a = AV.get(), w = wallet();
    $("avBig").innerHTML = AV.svg(a); $("avCoins").textContent = fmt(coins());
    document.querySelectorAll("#avTabs button").forEach(b => b.classList.toggle("on", b.dataset.c === avCat));
    const opts = avOptions().filter(o => !(o.needHat && a.hat === "none") && !(o.needExtra && !["scarf", "cape"].includes(a.extra)));
    $("avGrid").innerHTML = opts.map((o, i) => {
      const id = o.key + ":" + o.val, owned = !o.p || w.owned.includes(id), on = String(a[o.key]) === String(o.val);
      const pic = o.prev ? `<div class="pv">${AV.svg(Object.assign({}, a, { [o.key]: o.val }), { head: o.key !== "extra" })}</div>` : `<div class="sw" style="background:${o.sw}"></div>`;
      return `<div class="avItem ${on ? "on" : ""} ${owned ? "" : "locked"}" data-i="${i}">${pic}<b>${o.n}</b>${on ? '<small class="eq">✓ Wearing</small>' : owned ? "<small>Wear</small>" : `<small class="cost">🪙 ${o.p}</small>`}</div>`;
    }).join("");
    $("avGrid").onclick = e => {
      const el = e.target.closest(".avItem"); if (!el) return;
      const o = opts[+el.dataset.i], id = o.key + ":" + o.val, w2 = wallet();
      if (o.p && !w2.owned.includes(id)) {
        if (coins() < o.p) { sfx("tick", 160); popup(`🪙 You need ${o.p - coins()} more coins. Earn badges and play games!`); return; }
        w2.spent += o.p; w2.owned.push(id); ls.set("arcade_wallet", JSON.stringify(w2)); sfx("win"); confetti(); popup(`🎉 You got ${o.n}!`);
      } else sfx("tap");
      const a2 = AV.get(); a2[o.key] = o.val; a2.made = true; AV.set(a2);
      paintAvatar(); paintMe();
    };
  }
  document.querySelectorAll("#avTabs button").forEach(b => b.onclick = () => { avCat = b.dataset.c; sfx("tap"); paintAvatar(); });

  // ---------- cloud save status ----------
  function paintSave(st) {
    const u = window.Arcade && Arcade.user, box = $("saveBox");
    box.classList.toggle("ok", !!u && st.state === "saved"); box.classList.toggle("bad", !!u && st.state === "error");
    $("sbNow").hidden = !u;
    $("sbHelp").hidden = !(u && st.state === "error" && /rules/.test(st.msg));
    if (!u) { $("sbTitle").textContent = "☁️ Cloud saves are off"; $("sbText").textContent = "Sign in to save your games to your account, so you can keep playing on any phone or computer."; }
    else if (st.state === "saved") { $("sbTitle").textContent = "✅ Your games are saving"; $("sbText").textContent = "Everything you play saves to " + (u.email || "your account") + " automatically."; }
    else if (st.state === "saving") { $("sbTitle").textContent = "⏳ Saving…"; $("sbText").textContent = "Sending your progress to your account."; }
    else { $("sbTitle").textContent = "⚠️ Not saving to your account"; $("sbText").textContent = st.msg || "Something went wrong."; }
    if (u) $("signTxt").textContent = st.state === "error" ? "⚠️ Not saving" : st.state === "saving" ? "Saving…" : "Saved ✓";
  }
  if (window.Arcade && Arcade.onStatus) Arcade.onStatus(paintSave);
  $("sbNow").onclick = async () => { sfx("tap"); try { await Arcade.saveNow(); } catch (e) {} popup(Arcade.status.state === "saved" ? "✅ Saved to your account" : "⚠️ " + (Arcade.status.msg || "Couldn't save")); };
  $("sbCopy").onclick = async () => { try { await navigator.clipboard.writeText($("sbRule").textContent); popup("📋 Copied"); } catch (e) { popup("Select the rule and copy it"); } };

  addEventListener("pageshow", e => { if (e.persisted) refresh(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { S = readStats(); paintMe(); celebrate(); } });
  paintMode(); refresh(); booted = true;
})();
