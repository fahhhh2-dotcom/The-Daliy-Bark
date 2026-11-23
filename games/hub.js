/* My Game Arcade — stats, badges, levels, game of the day, surprise me, sounds and effects */
(() => {
  const $ = id => document.getElementById(id);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    json(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const GAMES = {
    fishing: { name: "Deep Blue Fishing", key: "deep-blue-fishing-v1" },
    graveyard: { name: "Graveyard Defense", key: "graveyardTD" },
    runner: { name: "Sandwich Sprint 3D", key: "sandwichSprintSave" },
    bugs: { name: "Wild Woods Bug Catching", key: "wild-woods-bugs-v1" },
    "last-ember": { name: "Last Ember", key: "lastEmberBest" }
  };
  const fmt = n => { n = Math.floor(n || 0); return n >= 1e9 ? (n / 1e9).toFixed(1).replace(".0", "") + "B" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : n.toLocaleString(); };
  const count = o => o && typeof o === "object" ? Object.keys(o).length : 0;

  // ---------- read each game's save ----------
  function readStats() {
    const f = ls.json(GAMES.fishing.key), g = ls.json(GAMES.graveyard.key), r = ls.json(GAMES.runner.key), b = ls.json(GAMES.bugs.key);
    const gs = (g && g.stats) || {};
    let bestWave = 0; if (g && g.maps) for (const m in g.maps) bestWave = Math.max(bestWave, g.maps[m].best || 0, (g.maps[m].wave || 1) - 1);
    return {
      fishing: f && { played: true, money: f.money || 0, species: count(f.book), worlds: 1 + count(f.unlocked), aquarium: (f.aquarium || []).length },
      graveyard: g && { played: true, kills: gs.kills || 0, won: gs.won || 0, wave: Math.max(bestWave, gs.best || 0), medals: g.medals || 0, monsters: count(g.unlocked) },
      runner: r && { played: true, best: r.best || 0, bank: r.bank || 0, outfits: (r.owned || []).length },
      bugs: b && { played: true, money: b.money || 0, species: count(b.book), areas: (b.unlocked || []).filter(Boolean).length },
      ember: ls.get("lastEmberBest") !== null ? { played: true, best: +ls.get("lastEmberBest") || 0 } : null
    };
  }

  function paintStats(S) {
    const cell = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
    const none = '<div class="new">🆕 Not played yet. Press play to start!</div>';
    $("st-fishing").innerHTML = S.fishing ? cell("$" + fmt(S.fishing.money), "Money") + cell(S.fishing.species, "Fish found") + cell(S.fishing.worlds, "Worlds") : none;
    $("st-graveyard").innerHTML = S.graveyard ? cell(fmt(S.graveyard.kills), "Zombies") + cell(S.graveyard.wave, "Best wave") + cell(S.graveyard.medals, "Medals") : none;
    $("st-runner").innerHTML = S.runner ? cell(fmt(S.runner.best), "Best score") + cell("🍪" + fmt(S.runner.bank), "Cookies") + cell(S.runner.outfits, "Outfits") : none;
    $("st-bugs").innerHTML = S.bugs ? cell("$" + fmt(S.bugs.money), "Money") + cell(S.bugs.species, "Bugs found") + cell(S.bugs.areas, "Areas") : none;
    $("st-ember").innerHTML = S.ember ? cell(S.ember.best, "Best nights") + cell(S.ember.best >= 99 ? "🏆" : "🔥", "99 Nights") : none;
  }

  // ---------- badges ----------
  const BADGES = [
    { id: "hello", ic: "👋", name: "Welcome!", how: "Play any game", ok: S => S.fishing || S.graveyard || S.runner || S.bugs },
    { id: "f1", ic: "🎣", name: "First Catch", how: "Catch a fish", ok: S => S.fishing && S.fishing.species >= 1 },
    { id: "f10", ic: "🐠", name: "Fish Finder", how: "Find 10 kinds of fish", ok: S => S.fishing && S.fishing.species >= 10 },
    { id: "f25", ic: "🦈", name: "Ocean Expert", how: "Find 25 kinds of fish", ok: S => S.fishing && S.fishing.species >= 25 },
    { id: "fm", ic: "💰", name: "Fishing Tycoon", how: "Have $100K in Deep Blue Fishing", ok: S => S.fishing && S.fishing.money >= 1e5 },
    { id: "fw", ic: "🌋", name: "Island Hopper", how: "Unlock a new world", ok: S => S.fishing && S.fishing.worlds >= 2 },
    { id: "g1", ic: "🧟", name: "Zombie Stopper", how: "Defeat 100 zombies", ok: S => S.graveyard && S.graveyard.kills >= 100 },
    { id: "g2", ic: "⚰️", name: "Graveyard Guard", how: "Defeat 1,000 zombies", ok: S => S.graveyard && S.graveyard.kills >= 1000 },
    { id: "gw", ic: "🌕", name: "Wave Warrior", how: "Reach wave 10", ok: S => S.graveyard && S.graveyard.wave >= 10 },
    { id: "gm", ic: "🎃", name: "Monster Army", how: "Unlock 5 monsters", ok: S => S.graveyard && S.graveyard.monsters >= 5 },
    { id: "r1", ic: "🏃", name: "Speedy", how: "Score 1,000 in Sandwich Sprint", ok: S => S.runner && S.runner.best >= 1000 },
    { id: "r2", ic: "⚡", name: "Lightning Legs", how: "Score 5,000 in Sandwich Sprint", ok: S => S.runner && S.runner.best >= 5000 },
    { id: "rc", ic: "🍪", name: "Cookie Monster", how: "Save up 200 cookies", ok: S => S.runner && S.runner.bank >= 200 },
    { id: "ro", ic: "👕", name: "Dressed Up", how: "Own 3 outfits", ok: S => S.runner && S.runner.outfits >= 3 },
    { id: "b1", ic: "🐞", name: "Bug Spotter", how: "Catch a bug", ok: S => S.bugs && S.bugs.species >= 1 },
    { id: "b10", ic: "🦋", name: "Bug Expert", how: "Find 10 kinds of bugs", ok: S => S.bugs && S.bugs.species >= 10 },
    { id: "ba", ic: "🌲", name: "Explorer", how: "Unlock a new forest area", ok: S => S.bugs && S.bugs.areas >= 2 },
    { id: "all", ic: "🕹️", name: "Arcade Explorer", how: "Play all 4 games", ok: S => S.fishing && S.graveyard && S.runner && S.bugs },
    { id: "day", ic: "⭐", name: "Daily Player", how: "Play the Game of the Day", ok: () => ls.get("arcade_gotd_played") === today() },
    { id: "lucky", ic: "🎲", name: "Feeling Lucky", how: "Use Surprise Me", ok: () => !!ls.get("arcade_surprised") }
  ];
  const LEVELS = ["Arcade Rookie", "Button Masher", "High Scorer", "Game Hero", "Arcade Pro", "Arcade Champion", "Arcade Legend"];

  function paintBadges(S, celebrate) {
    const got = BADGES.filter(b => { try { return !!b.ok(S); } catch (e) { return false; } });
    const ids = got.map(b => b.id);
    $("bgrid").innerHTML = BADGES.map(b => `<div class="badge2 ${ids.includes(b.id) ? "got" : ""}" data-b="${b.id}"><div class="ic">${b.ic}</div><b>${b.name}</b><small>${ids.includes(b.id) ? "Unlocked!" : b.how}</small></div>`).join("");
    $("badgeCount").textContent = `${got.length} / ${BADGES.length}`;
    // level: one level per 3 badges
    const lv = Math.min(LEVELS.length - 1, Math.floor(got.length / 3));
    $("lvlName").textContent = LEVELS[lv];
    $("lvlNum").textContent = "Level " + (lv + 1);
    const into = got.length - lv * 3, max = lv === LEVELS.length - 1;
    $("xpFill").style.width = (max ? 100 : (into / 3) * 100) + "%";
    $("lvlNext").textContent = max ? "You maxed out the arcade! 🏆" : `${3 - into} more badge${3 - into === 1 ? "" : "s"} to reach ${LEVELS[lv + 1]}`;
    // celebrate new badges
    const seen = (ls.json("arcade_badges_seen") || []);
    const fresh = got.filter(b => !seen.includes(b.id));
    if (fresh.length && celebrate) {
      setTimeout(() => { confetti(); sfx("win"); popup(`🏅 New badge${fresh.length > 1 ? "s" : ""}: ${fresh.map(b => b.ic + " " + b.name).join(", ")}`); }, 600);
    }
    ls.set("arcade_badges_seen", JSON.stringify(ids));
  }
  $("bgrid").addEventListener("click", e => {
    const el = e.target.closest(".badge2"); if (!el) return;
    const b = BADGES.find(x => x.id === el.dataset.b);
    sfx("tap"); popup(el.classList.contains("got") ? `${b.ic} ${b.name}: you got it!` : `${b.ic} ${b.name}: ${b.how}`);
  });

  // ---------- game of the day ----------
  function today() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  const order = ["fishing", "graveyard", "runner", "bugs", "last-ember"];
  const dayNum = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  const gotd = order[dayNum % order.length];
  document.querySelector(`.card[data-game="${gotd}"]`).classList.add("today");

  // ---------- continue + tracking ----------
  function paintContinue() {
    const last = ls.get("arcade_last");
    const c = $("cont");
    if (last && GAMES[last]) { c.hidden = false; c.href = last + "/"; c.textContent = "▶ Continue " + GAMES[last].name.replace(" 3D", ""); }
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("a[data-go], #cont"); if (!a) return;
    const g = a.dataset.go || ls.get("arcade_last");
    ls.set("arcade_last", g);
    if (g === gotd) ls.set("arcade_gotd_played", today());
    sfx("go");
  });

  // ---------- surprise me ----------
  $("surprise").onclick = () => {
    ls.set("arcade_surprised", "1");
    const pick = order[Math.floor(Math.random() * order.length)];
    $("slot").hidden = false;
    let i = 0, steps = 16 + order.indexOf(pick) + order.length * 1;
    const spin = () => {
      const g = order[i % order.length];
      $("slotName").textContent = GAMES[g].name;
      sfx("tick", 300 + (i % 4) * 80);
      if (i >= steps && g === pick) {
        sfx("win"); confetti();
        setTimeout(() => { ls.set("arcade_last", pick); if (pick === gotd) ls.set("arcade_gotd_played", today()); location.href = pick + "/"; }, 900);
        return;
      }
      i++; setTimeout(spin, 50 + i * i * 0.9);
    };
    spin();
  };

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
      const notes = { tap: [[660, .06]], tick: [[f || 440, .04]], go: [[523, .08], [784, .12]], win: [[523, .1], [659, .1], [784, .1], [1046, .25]], hover: [[880, .03]] }[type] || [[440, .05]];
      let t = actx.currentTime;
      notes.forEach(([hz, d]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "square"; o.frequency.value = hz;
        g.gain.setValueAtTime(type === "hover" ? .015 : .04, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d); t += d * .9;
      });
    } catch (e) {}
  }
  // hover blips + 3D tilt on cards (computers)
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && actx) sfx("hover"); });
    card.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => card.style.transform = "");
  });

  // ---------- popup + confetti ----------
  let popT;
  function popup(t) { const p = $("pop"); p.textContent = t; p.classList.add("show"); clearTimeout(popT); popT = setTimeout(() => p.classList.remove("show"), 2800); }
  const cv = $("confetti"), cx = cv.getContext("2d"); let bits = [], raf = 0;
  function confetti() {
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ffd23f", "#5fd4ff", "#ff8a3d", "#7cf29a", "#ff6fa8", "#fff"];
    for (let i = 0; i < 140; i++) bits.push({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], life: 120 });
    if (!raf) loop();
  }
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter(b => b.life-- > 0);
    bits.forEach(b => { b.vy += .4; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr; cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c; cx.globalAlpha = Math.min(1, b.life / 30); cx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cx.restore(); });
    raf = bits.length ? requestAnimationFrame(loop) : 0;
    if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  // hide the install tip when already opened from the Home Screen
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) $("install").hidden = true;

  // ---------- go ----------
  function refresh(celebrate) { const S = readStats(); paintStats(S); paintBadges(S, celebrate); paintContinue(); }
  refresh(true);
  // after signing in, cloud saves may arrive: repaint
  if (window.Arcade) Arcade.onChange(() => setTimeout(() => refresh(true), 50));
  // coming back to this tab after playing
  addEventListener("pageshow", e => { if (e.persisted) refresh(true); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(true); });
})();
