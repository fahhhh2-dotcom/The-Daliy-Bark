/* My Game Arcade — your avatar (skin). Saved in localStorage "arcade_avatar" and synced to your account.
   Games read it with ArcadeAvatar.get() (or straight from localStorage) to dress your character. */
(function () {
  const TONES = ["#ffe0bd", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"];
  const HAIRC = ["#2a1a10", "#5a3418", "#a0642a", "#e8c070", "#d8d8d8", "#c83a2a", "#3a6bff", "#ff5fd2"];
  const COLORS = [
    { c: "#3d6bff", n: "Blue", p: 0 }, { c: "#e8412c", n: "Red", p: 0 }, { c: "#3fc679", n: "Green", p: 0 },
    { c: "#ffc83d", n: "Yellow", p: 50 }, { c: "#9b5cff", n: "Purple", p: 50 }, { c: "#ff7ab6", n: "Pink", p: 50 },
    { c: "#ff8a3d", n: "Orange", p: 50 }, { c: "#1fc8db", n: "Aqua", p: 50 }, { c: "#f2f3f5", n: "White", p: 50 },
    { c: "#1b1c21", n: "Black", p: 75 }, { c: "#ffd700", n: "Gold", p: 250 }, { c: "#7cf3ff", n: "Ice", p: 150 }
  ];
  const PANTS = [
    { c: "#2f4a6b", n: "Jeans", p: 0 }, { c: "#2a2a30", n: "Black", p: 0 }, { c: "#8a7a5a", n: "Khaki", p: 40 },
    { c: "#3f5f3a", n: "Camo green", p: 40 }, { c: "#e8412c", n: "Red", p: 60 }, { c: "#f2f3f5", n: "White", p: 60 }
  ];
  const HATS = [
    { id: "none", n: "No hat", p: 0, e: "🙂" }, { id: "cap", n: "Cap", p: 100, e: "🧢" }, { id: "beanie", n: "Beanie", p: 100, e: "🧶" },
    { id: "helmet", n: "Helmet", p: 150, e: "⛑️" }, { id: "cowboy", n: "Cowboy hat", p: 200, e: "🤠" },
    { id: "wizard", n: "Wizard hat", p: 300, e: "🧙" }, { id: "crown", n: "Crown", p: 500, e: "👑" }
  ];
  const HAIR = [{ id: "short", n: "Short" }, { id: "spiky", n: "Spiky" }, { id: "long", n: "Long" }, { id: "none", n: "Bald" }];
  const EXTRAS = [
    { id: "none", n: "Nothing", p: 0, e: "➖" }, { id: "glasses", n: "Sunglasses", p: 150, e: "🕶️" },
    { id: "scarf", n: "Scarf", p: 120, e: "🧣" }, { id: "cape", n: "Hero cape", p: 300, e: "🦸" }
  ];
  const DEF = { tone: 1, hair: "short", hairC: 0, shirt: 0, pants: 0, hat: "none", hatC: 1, extra: "none", made: false };

  function get() {
    let a = null; try { a = JSON.parse(localStorage.getItem("arcade_avatar")); } catch (e) {}
    return Object.assign({}, DEF, a || {});
  }
  function set(a) { try { localStorage.setItem("arcade_avatar", JSON.stringify(a)); } catch (e) {} }
  // plain colors a game can use
  function colors(a) {
    a = a || get();
    return { skin: TONES[a.tone] || TONES[1], hair: HAIRC[a.hairC] || HAIRC[0], shirt: (COLORS[a.shirt] || COLORS[0]).c,
      pants: (PANTS[a.pants] || PANTS[0]).c, hatC: (COLORS[a.hatC] || COLORS[1]).c, hat: a.hat, hairStyle: a.hair, extra: a.extra };
  }
  const shade = (hex, p) => { const n = parseInt(hex.slice(1), 16); const c = v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"); return "#" + c((n >> 16) + p) + c(((n >> 8) & 255) + p) + c((n & 255) + p); };

  // front-facing picture of the avatar
  function svg(a, opts) {
    a = a || get(); opts = opts || {};
    const C = colors(a), head = opts.head;   // head = just the head (for round profile pictures)
    const vb = head ? "18 2 64 64" : "0 -14 100 138";
    let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">`;
    if (!head) {
      if (C.extra === "cape") s += `<path d="M28 50 Q50 44 72 50 L80 112 Q50 120 20 112z" fill="${C.hatC}"/>`;
      s += `<rect x="36" y="86" width="12" height="26" rx="4" fill="${C.pants}"/><rect x="52" y="86" width="12" height="26" rx="4" fill="${C.pants}"/>`;
      s += `<rect x="33" y="108" width="16" height="8" rx="4" fill="#2a2a30"/><rect x="51" y="108" width="16" height="8" rx="4" fill="#2a2a30"/>`;
      s += `<rect x="20" y="52" width="11" height="30" rx="5.5" fill="${C.shirt}"/><rect x="69" y="52" width="11" height="30" rx="5.5" fill="${C.shirt}"/>`;
      s += `<circle cx="25.5" cy="84" r="5" fill="${C.skin}"/><circle cx="74.5" cy="84" r="5" fill="${C.skin}"/>`;
      s += `<rect x="29" y="48" width="42" height="44" rx="10" fill="${C.shirt}"/><rect x="29" y="80" width="42" height="8" fill="${shade(C.shirt, -30)}"/>`;
    }
    // head + hair
    if (C.hairStyle === "long") s += `<path d="M26 34 Q26 8 50 8 Q74 8 74 34 L76 58 L62 56 L62 30 L38 30 L38 56 L24 58z" fill="${C.hair}"/>`;
    s += `<circle cx="50" cy="32" r="22" fill="${C.skin}"/>`;
    if (C.hairStyle === "short" || C.hairStyle === "long") s += `<path d="M28 30 Q28 9 50 9 Q72 9 72 30 Q64 20 50 21 Q36 20 28 30z" fill="${C.hair}"/>`;
    if (C.hairStyle === "spiky") s += `<path d="M28 28 L31 10 L38 20 L44 6 L50 18 L56 6 L62 20 L69 10 L72 28 Q50 18 28 28z" fill="${C.hair}"/>`;
    // face
    s += `<circle cx="42" cy="33" r="3" fill="#1b1c21"/><circle cx="58" cy="33" r="3" fill="#1b1c21"/><circle cx="43" cy="32" r="1" fill="#fff"/><circle cx="59" cy="32" r="1" fill="#fff"/>`;
    s += `<path d="M43 42 Q50 48 57 42" stroke="#1b1c21" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="36" cy="40" r="3" fill="#ff7a7a" opacity=".35"/><circle cx="64" cy="40" r="3" fill="#ff7a7a" opacity=".35"/>`;
    if (C.extra === "glasses") s += `<rect x="35" y="28" width="13" height="9" rx="3" fill="#1b1c21"/><rect x="52" y="28" width="13" height="9" rx="3" fill="#1b1c21"/><rect x="47" y="30" width="6" height="2" fill="#1b1c21"/>`;
    if (C.extra === "scarf" && !head) s += `<rect x="31" y="49" width="38" height="9" rx="4" fill="${C.hatC}"/><rect x="56" y="54" width="9" height="18" rx="3" fill="${C.hatC}"/>`;
    // hats
    const H = C.hatC, Hd = shade(H, -35);
    if (C.hat === "cap") s += `<path d="M28 24 Q28 6 50 6 Q72 6 72 24z" fill="${H}"/><rect x="50" y="20" width="30" height="6" rx="3" fill="${Hd}"/>`;
    if (C.hat === "beanie") s += `<path d="M27 26 Q27 4 50 4 Q73 4 73 26z" fill="${H}"/><rect x="26" y="21" width="48" height="8" rx="4" fill="${Hd}"/><circle cx="50" cy="4" r="5" fill="${Hd}"/>`;
    if (C.hat === "helmet") s += `<path d="M25 28 Q25 3 50 3 Q75 3 75 28z" fill="${H}"/><rect x="23" y="24" width="54" height="6" rx="3" fill="${Hd}"/><rect x="47" y="3" width="6" height="22" fill="${Hd}"/>`;
    if (C.hat === "cowboy") s += `<ellipse cx="50" cy="18" rx="34" ry="6" fill="${Hd}"/><path d="M33 18 Q34 0 50 2 Q66 0 67 18z" fill="${H}"/><rect x="33" y="13" width="34" height="4" fill="${Hd}"/>`;
    if (C.hat === "wizard") s += `<path d="M26 20 L50 -14 L74 20z" fill="${H}"/><ellipse cx="50" cy="20" rx="30" ry="5" fill="${Hd}"/><circle cx="50" cy="2" r="2.5" fill="#ffd700"/><circle cx="58" cy="12" r="2" fill="#ffd700"/>`;
    if (C.hat === "crown") s += `<path d="M30 20 L30 4 L40 12 L50 0 L60 12 L70 4 L70 20z" fill="#ffd700" stroke="#c9a000" stroke-width="1.5"/><circle cx="50" cy="12" r="3" fill="${H}"/><circle cx="38" cy="15" r="2" fill="#3fc679"/><circle cx="62" cy="15" r="2" fill="#3d6bff"/>`;
    return s + `</svg>`;
  }

  window.ArcadeAvatar = { get, set, colors, svg, shade, TONES, HAIRC, COLORS, PANTS, HATS, HAIR, EXTRAS, DEF };
})();
