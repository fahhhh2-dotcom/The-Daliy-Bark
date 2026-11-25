'use strict';
/* Hollow Pines — world: terrain, landmarks, sheds, tunnel, models */
const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, rand = Math.random;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 20261124;
const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const hash3 = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

const settings = { sens: 1, vol: 0.9, shadows: !touch };
try { Object.assign(settings, JSON.parse(localStorage.getItem('hollowPinesSettings') || '{}')); } catch (e) {}

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: !touch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.3 : 1.75));
renderer.setSize(innerWidth, innerHeight);
if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const FOG_FOREST = new THREE.Color(0x151b22), FOG_TUNNEL = new THREE.Color(0x020202), FOG_FLARE = new THREE.Color(0x1c0606);
scene.background = FOG_FOREST.clone(); scene.fog = new THREE.FogExp2(FOG_FOREST.clone(), 0.032);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.04, 150); camera.rotation.order = 'YXZ'; scene.add(camera);
const hemi = new THREE.HemisphereLight(0x4a5878, 0x15110c, 0.55); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8494c4, 0.25); moon.position.set(-60, 100, 40); scene.add(moon);

// ---------- textures ----------
function ctex(w, h, fn, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function speck(g, w, h, base, cols, n, sz) { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = Math.random() * 0.5 + 0.1; const s = Math.random() * sz + 1; g.fillRect(Math.random() * w, Math.random() * h, s, s * (Math.random() * 2.5 + 0.4)); } g.globalAlpha = 1; }
const TX = {
  ground: ctex(256, 256, (g, w, h) => { speck(g, w, h, '#cfcac0', ['#8a8478', '#e6e0d2', '#9c8a70', '#7f8a70'], 2600, 3); g.strokeStyle = 'rgba(70,50,30,.5)'; for (let i = 0; i < 500; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke(); } }, [170, 170]),
  bark: ctex(128, 256, (g, w, h) => { g.fillStyle = '#6a5848'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.6 ? 'rgba(25,18,12,.55)' : 'rgba(160,140,120,.25)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 20 + Math.random() * 110); } }),
  wood: ctex(256, 256, (g, w, h) => { g.fillStyle = '#7a6046'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(20,12,6,.75)'; g.fillRect(0, y, w, 2); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '30,20,10' : '170,140,100'},.2)`; g.fillRect(0, y + 3 + Math.random() * 26, w, 1); } } speck(g, 0, 0, '#000', ['#000'], 0, 1); }),
  rust: ctex(256, 256, (g, w, h) => speck(g, w, h, '#6b3a22', ['#8a4a2a', '#3a2216', '#a0603a', '#2a1a12', '#5a5048'], 3400, 5)),
  stone: ctex(256, 256, (g, w, h) => { speck(g, w, h, '#8a8882', ['#5a5a56', '#a8a69e', '#4a4a3e', '#6a7060'], 3000, 4); g.strokeStyle = 'rgba(30,30,28,.5)'; for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 40 % 2) * 40; x < w; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); } } }),
  conc: ctex(256, 256, (g, w, h) => speck(g, w, h, '#77746e', ['#5e5b55', '#8e8a82', '#4a4640'], 2600, 3)),
  skin: ctex(256, 256, (g, w, h) => { g.fillStyle = '#b4aa9c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['rgba(60,48,40,.45)', 'rgba(90,30,30,.35)', 'rgba(70,70,60,.4)', 'rgba(40,20,20,.5)'][i % 4]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Math.random() < .5 ? 'rgba(90,70,80,.35)' : 'rgba(120,100,90,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } g.lineCap = 'round'; for (let v = 0; v < 26; v++) { let x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3; g.strokeStyle = `rgba(70,40,70,${.25 + Math.random() * .3})`; g.lineWidth = .6 + Math.random() * 1.4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (Math.random() - .5) * 1; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); } g.stroke(); } }),
  fur: ctex(128, 128, (g, w, h) => { g.fillStyle = '#888'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(30,30,30,.35)' : 'rgba(220,220,220,.25)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 5); } }),
  pad: ctex(512, 512, (g, w, h) => { speck(g, w, h, '#6e6c66', ['#55534e', '#85827a', '#46443f'], 6000, 4); g.strokeStyle = '#b7a24a'; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 230, 0, 7); g.stroke(); g.fillStyle = '#d8d4c8'; g.fillRect(150, 120, 52, 272); g.fillRect(310, 120, 52, 272); g.fillRect(150, 230, 212, 52); }),
  sign: ctex(512, 128, (g, w, h) => { g.fillStyle = '#4a3420'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8dcc0'; g.font = 'bold 52px serif'; g.textAlign = 'center'; g.fillText('RANGER STATION 12', w / 2, 82); }),
  warn: ctex(256, 128, (g, w, h) => { g.fillStyle = '#c8a020'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('DANGER', w / 2, 50); g.font = 'bold 22px sans-serif'; g.fillText('MINE TUNNEL', w / 2, 90); }),
  glint: ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
  ammo: ctex(128, 64, (g, w, h) => { g.fillStyle = '#3a4a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8c060'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.fillText('AMMO', w / 2, 40); })
};
TX.wood.repeat.set(1, 1);

// ---------- realistic texture generators (albedo + height -> normal maps) ----------
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
function normalTex(src, strength, rep) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data, c = mkc(w, h), g = c.getContext('2d'), out = g.createImageData(w, h), o = out.data;
  const hv = (x, y) => { const i = (((y + h) % h) * w + ((x + w) % w)) * 4; return (d[i] + d[i + 1] + d[i + 2]) / 765; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (hv(x + 1, y) - hv(x - 1, y)) * strength, dy = (hv(x, y + 1) - hv(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255; }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t;
}
const tex = (c, rep, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const W9 = (S, fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
function genGround(S) {
  const A = mkc(S), Hc = mkc(S), a = A.getContext('2d'), h = Hc.getContext('2d'), r = rng;
  a.fillStyle = '#4b3c2d'; a.fillRect(0, 0, S, S); h.fillStyle = '#5a5a5a'; h.fillRect(0, 0, S, S);
  const blob = (g, x, y, rad, col) => W9(S, (ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2); });
  for (let i = 0; i < 170; i++) { const x = r() * S, y = r() * S, rad = 12 + r() * 60, k = r(); blob(a, x, y, rad, k < 0.3 ? 'rgba(42,34,24,.55)' : k < 0.55 ? 'rgba(96,74,50,.4)' : k < 0.75 ? 'rgba(52,66,36,.45)' : 'rgba(30,24,18,.5)'); blob(h, x, y, rad, k < 0.5 ? 'rgba(30,30,30,.4)' : 'rgba(150,150,150,.3)'); }
  const NC = ['#8c5c32', '#6b4426', '#a26c3c', '#4c3422', '#7c6244', '#5a3e28', '#94704a'];
  for (let i = 0; i < 3600; i++) { const x = r() * S, y = r() * S, an = r() * 6.28, len = 5 + r() * 10, c = NC[i % NC.length], ex = x + Math.cos(an) * len, ey = y + Math.sin(an) * len;
    W9(S, (ox, oy) => { a.strokeStyle = c; a.lineWidth = 1.3; a.beginPath(); a.moveTo(x + ox, y + oy); a.lineTo(ex + ox, ey + oy); a.stroke(); h.strokeStyle = 'rgba(205,205,205,.85)'; h.lineWidth = 1.5; h.beginPath(); h.moveTo(x + ox, y + oy); h.lineTo(ex + ox, ey + oy); h.stroke(); }); }
  for (let i = 0; i < 130; i++) { const x = r() * S, y = r() * S, an = r() * 6.28, sx = 3 + r() * 3, sy = 6 + r() * 5, c = ['#6a4a28', '#8a6a3a', '#4a3a24', '#7a5030'][i % 4];
    W9(S, (ox, oy) => { a.save(); a.translate(x + ox, y + oy); a.rotate(an); a.fillStyle = c; a.beginPath(); a.ellipse(0, 0, sx, sy, 0, 0, 7); a.fill(); a.restore(); h.save(); h.translate(x + ox, y + oy); h.rotate(an); h.fillStyle = 'rgba(180,180,180,.8)'; h.beginPath(); h.ellipse(0, 0, sx, sy, 0, 0, 7); h.fill(); h.restore(); }); }
  for (let i = 0; i < 50; i++) { let x = r() * S, y = r() * S, an = r() * 6.28; const pts = [[x, y]]; for (let k = 0; k < 4; k++) { an += (r() - 0.5) * 0.8; x += Math.cos(an) * (10 + r() * 14); y += Math.sin(an) * (10 + r() * 14); pts.push([x, y]); } const lw = 1.8 + r() * 2;
    W9(S, (ox, oy) => { for (const [g, col] of [[a, '#3a2a1c'], [h, '#e8e8e8']]) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); pts.forEach(([px, py], j) => j ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)); g.stroke(); } }); }
  for (let i = 0; i < 70; i++) { const x = r() * S, y = r() * S, rad = 1.5 + r() * 3.5; W9(S, (ox, oy) => { a.fillStyle = ['#6e6a62', '#58544c', '#827c72'][i % 3]; a.beginPath(); a.arc(x + ox, y + oy, rad, 0, 7); a.fill(); h.fillStyle = '#f0f0f0'; h.beginPath(); h.arc(x + ox, y + oy, rad, 0, 7); h.fill(); }); }
  for (let i = 0; i < 12; i++) { const x = r() * S, y = r() * S, an = r() * 6.28; W9(S, (ox, oy) => { for (let k = 0; k < 7; k++) { const t = k / 6; a.fillStyle = k % 2 ? '#5a3a1e' : '#3e2814'; a.beginPath(); a.ellipse(x + ox + Math.cos(an) * t * 14, y + oy + Math.sin(an) * t * 14, 5 - t * 2.5, 3, an, 0, 7); a.fill(); h.fillStyle = '#ddd'; h.beginPath(); h.ellipse(x + ox + Math.cos(an) * t * 14, y + oy + Math.sin(an) * t * 14, 5 - t * 2.5, 3, an, 0, 7); h.fill(); } }); }
  return { map: tex(A), nrm: normalTex(Hc, 3) };
}
function genBark() {
  const A = mkc(256, 512), Hc = mkc(256, 512), a = A.getContext('2d'), h = Hc.getContext('2d'), r = rng, S = 256, T = 512;
  a.fillStyle = '#3e3229'; a.fillRect(0, 0, S, T); h.fillStyle = '#404040'; h.fillRect(0, 0, S, T);
  for (let i = 0; i < 140; i++) { const x = r() * S, y = r() * T, w = 10 + r() * 26, len = 40 + r() * 140, c = ['#5a4a3c', '#4a3c30', '#6a5a4a', '#54463a', '#3a2e24'][i % 5], hc = 120 + r() * 100 | 0;
    for (const ox of [-S, 0, S]) for (const oy of [-T, 0, T]) { a.fillStyle = c; a.globalAlpha = 0.8; a.beginPath(); a.ellipse(x + ox, y + oy, w / 2, len / 2, 0, 0, 7); a.fill(); a.globalAlpha = 1; h.fillStyle = `rgb(${hc},${hc},${hc})`; h.beginPath(); h.ellipse(x + ox, y + oy, w / 2, len / 2, 0, 0, 7); h.fill(); } }
  for (let i = 0; i < 55; i++) { let x = r() * S; const lw = 1.5 + r() * 3; for (const ox of [-S, 0, S]) { a.strokeStyle = 'rgba(14,10,7,.9)'; a.lineWidth = lw; h.strokeStyle = '#080808'; h.lineWidth = lw + 1; a.beginPath(); h.beginPath(); let xx = x + ox; a.moveTo(xx, 0); h.moveTo(xx, 0); for (let y = 0; y <= T; y += 16) { xx += Math.sin(y * 0.05 + i) * 2.2; a.lineTo(xx, y); h.lineTo(xx, y); } a.stroke(); h.stroke(); } }
  for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * T, rad = 6 + r() * 18; a.fillStyle = 'rgba(70,90,50,.35)'; a.beginPath(); a.arc(x, y, rad, 0, 7); a.fill(); }
  return { map: tex(A, [1, 2]), nrm: normalTex(Hc, 4, [1, 2]) };
}
function genBranch() {
  const c = mkc(256, 128), g = c.getContext('2d'), r = rng; g.lineCap = 'round';
  const GN = ['#1c3020', '#25402a', '#2f4f33', '#21382a', '#3a5f3c', '#2a4a2c', '#467048'];
  const twig = (x0, y0, x1, y1, w) => { g.strokeStyle = '#3a2a1a'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const needles = (x0, y0, x1, y1, maxL) => { const len = Math.hypot(x1 - x0, y1 - y0), an = Math.atan2(y1 - y0, x1 - x0); for (let t = 0; t < len; t += 1.6) { const px = x0 + Math.cos(an) * t, py = y0 + Math.sin(an) * t, L = maxL * (1 - t / len * 0.55) * (0.7 + r() * 0.5); for (const sd of [-1, 1]) { const a2 = an + sd * (0.75 + r() * 0.5); g.strokeStyle = GN[(r() * GN.length) | 0]; g.lineWidth = 1.4 + r() * 0.6; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a2) * L, py + Math.sin(a2) * L); g.stroke(); } } };
  const side = []; for (let i = 0; i < 9; i++) { const t = 0.12 + i * 0.09, x = 6 + t * 240, y = 64 + (r() - 0.5) * 4, sd = i % 2 ? 1 : -1, an = sd * (0.5 + r() * 0.3), L = (1 - t) * 70 + 18; side.push([x, y, x + Math.cos(an) * L, y + Math.sin(an) * L]); }
  twig(4, 64, 250, 60, 3.2); side.forEach(s => twig(s[0], s[1], s[2], s[3], 1.6));
  side.forEach(s => needles(s[0], s[1], s[2], s[3], 13)); needles(6, 64, 250, 60, 16);
  return tex(c);
}
function genFern() {
  const c = mkc(256, 256), g = c.getContext('2d'), r = rng; const cols = ['#2c5226', '#36602c', '#28481f', '#3f6a30', '#4a7436'];
  let x = 128, y = 254; const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([128 + Math.sin(t * 1.6) * 30 * t, 254 - t * 240]); }
  g.strokeStyle = '#2a3a1a'; g.lineWidth = 2.5; g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
  for (let i = 3; i < 40; i++) { const [px, py] = pts[i], t = i / 40, L = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 62 + 6; for (const sd of [-1, 1]) { g.save(); g.translate(px, py); g.rotate(sd * (1.25 - t * 0.4)); g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= 8; k++) { const u = k / 8; g.lineTo(-sd * 0 + u * L * sd * 0, 0); } g.ellipse(0, -L / 2, 4.5 * (1 - t * 0.4), L / 2, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(20,40,15,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L); g.stroke(); g.restore(); } }
  return tex(c);
}
function genGrass() {
  const c = mkc(256, 256), g = c.getContext('2d'), r = rng; const cols = ['#4a5a2a', '#6a6a3a', '#3a4a24', '#7a7040', '#55602e', '#8a7a48'];
  for (let i = 0; i < 80; i++) { const x = 30 + r() * 196, hgt = 120 + r() * 130, bend = (r() - 0.5) * 70, w = 3 + r() * 4; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x - w / 2, 256); g.quadraticCurveTo(x + bend * 0.3, 256 - hgt * 0.6, x + bend, 256 - hgt); g.quadraticCurveTo(x + bend * 0.3 + w * 0.3, 256 - hgt * 0.6, x + w / 2, 256); g.fill(); }
  return tex(c);
}
const mistTex = (() => { const c = mkc(128), g = c.getContext('2d'); for (let i = 0; i < 40; i++) { const x = 20 + Math.random() * 88, y = 34 + Math.random() * 60, rad = 14 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } return tex(c); })();
const GROUND = genGround(512), BARK = genBark();
TX.branch = genBranch(); TX.fern = genFern(); TX.grass = genGrass(); TX.mist = mistTex;
const NRM = { wood: normalTex(TX.wood.image, 2.5), stone: normalTex(TX.stone.image, 3), rust: normalTex(TX.rust.image, 2), conc: normalTex(TX.conc.image, 2), skin: normalTex(TX.skin.image, 2.2), fur: normalTex(TX.fur.image, 1.5) };
// wind sway for foliage (shared clock) + soft volumetric normals on two-sided cards
const WIND = { value: 0 };
function windify(mat, amp, h0, key) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
      #else
        float ph = 0.0;
      #endif
      float hh = max(0.0, position.y - ${h0.toFixed(2)});
      transformed.x += (sin(uWind * 1.1 + ph) * ${amp.toFixed(4)} + sin(uWind * 2.9 + ph * 2.0 + position.y * 1.3) * ${(amp * 0.35).toFixed(4)}) * hh;
      transformed.z += cos(uWind * 0.9 + ph * 1.3) * ${(amp * 0.7).toFixed(4)} * hh;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  mat.customProgramCacheKey = () => 'wind-' + key;
  return mat;
}
const MSM = o => new THREE.MeshStandardMaterial(o);
const MAT = {
  ground: MSM({ map: GROUND.map, normalMap: GROUND.nrm, normalScale: new THREE.Vector2(0.9, 0.9), vertexColors: true, roughness: 0.82, envMapIntensity: 0.3 }),
  bark: MSM({ map: BARK.map, normalMap: BARK.nrm, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.95 }),
  leaf: windify(MSM({ map: TX.branch, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.8 }), 0.012, 2.0, 'leaf'),
  dead: MSM({ map: BARK.map, normalMap: BARK.nrm, color: 0x9a9088, roughness: 1 }),
  rock: MSM({ map: TX.stone, normalMap: NRM.stone, color: 0x9a988f, roughness: 0.9, flatShading: true }),
  bush: windify(MSM({ map: TX.branch, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, color: 0xb0c0a0 }), 0.03, 0.0, 'bush'),
  wood: MSM({ map: TX.wood, normalMap: NRM.wood, roughness: 0.85 }),
  dwood: MSM({ map: TX.wood, normalMap: NRM.wood, color: 0x8a7a6a, roughness: 0.9 }),
  rust: MSM({ map: TX.rust, normalMap: NRM.rust, roughness: 0.75, metalness: 0.35 }),
  metal: MSM({ color: 0x5a6066, roughness: 0.55, metalness: 0.6 }),
  gun: MSM({ color: 0x1e2124, roughness: 0.4, metalness: 0.8 }),
  gunwood: MSM({ color: 0x5a3418, roughness: 0.6 }),
  red: MSM({ color: 0x9a1a12, roughness: 0.5, metalness: 0.3 }),
  orange: MSM({ color: 0xd2560e, roughness: 0.5 }),
  yellow: MSM({ color: 0x9f8226, roughness: 0.6, metalness: 0.3 }),
  stone: MSM({ map: TX.stone, normalMap: NRM.stone, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.9 }),
  conc: MSM({ map: TX.conc, normalMap: NRM.conc, roughness: 0.92 }),
  cloth: MSM({ color: 0x7a4a26, roughness: 1, side: THREE.DoubleSide }),
  cloth2: MSM({ color: 0x2e3a2a, roughness: 1 }),
  black: MSM({ color: 0x060606, roughness: 1 }),
  paper: MSM({ color: 0xe0d6be, roughness: 0.9 }),
  glass: MSM({ color: 0x0e161c, roughness: 0.15, metalness: 0.6 }),
  car: MSM({ color: 0x1d2a36, roughness: 0.35, metalness: 0.6 }),
  skin: new THREE.MeshPhysicalMaterial({ map: TX.skin, color: 0x76777a, normalMap: NRM.skin, normalScale: new THREE.Vector2(1.8, 1.8), roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color(0x4a2a2a) }),
  cdark: MSM({ color: 0x120707, roughness: 0.9 }),
  mouth: MSM({ color: 0x2a0303, roughness: 0.4 }),
  teeth: MSM({ color: 0xd8cfae, roughness: 0.4 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xfff4e4 }),
  deer: MSM({ map: TX.fur, normalMap: NRM.fur, color: 0x8a6040, roughness: 1 }),
  wolf: MSM({ map: TX.fur, normalMap: NRM.fur, color: 0x6e6862, roughness: 1 }),
  wolfEye: new THREE.MeshBasicMaterial({ color: 0xff2a10 }),
  bloodMuzzle: MSM({ color: 0x4a0202, roughness: 0.3 }),
  antler: MSM({ color: 0xcab89a, roughness: 0.8 }),
  ammo: MSM({ map: TX.ammo, roughness: 0.7 }),
  key: MSM({ color: 0xb8a050, roughness: 0.35, metalness: 0.85 }),
  sign: MSM({ map: TX.sign, roughness: 0.8 }),
  warn: MSM({ map: TX.warn, roughness: 0.7 }),
  pad: MSM({ map: TX.pad, roughness: 0.9 }),
  water: MSM({ color: 0x0b1a1f, roughness: 0.06, metalness: 0.35 }),
  heli: MSM({ color: 0x2a3428, roughness: 0.5, metalness: 0.4 }),
  rope: MSM({ color: 0x8a7650, roughness: 1 }),
  blood: MSM({ color: 0x3e0000, roughness: 0.25, metalness: 0.1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
};
GROUND.map.repeat.set(250, 250); GROUND.nrm.repeat.set(250, 250);

// ---------- map layout ----------
const L = {
  camp: { x: 0, z: 0 }, shed1: { x: -20, z: 24 }, gen: { x: 16, z: -12 }, truck: { x: -150, z: 90 }, cabin: { x: 140, z: 150 },
  log: { x: -110, z: -170 }, tower: { x: 20, z: 280 }, shed2: { x: -62, z: 258 }, ranger: { x: -260, z: 160 }, grave: { x: -200, z: -260 },
  tunnel: { x: -190, z: 232 }, hatch: { x: 236, z: 198 }, heli: { x: 270, z: 225 },
  oldcamp: { x: -48, z: -92 }, barn: { x: -174, z: 64 }, stand: { x: 121, z: 170 }
};
const LK = { x: 235, z: -120, r: 45, c: 46.5 };
const LD = (() => { const dx = -LK.x, dz = -LK.z, l = Math.hypot(dx, dz); return { x: dx / l, z: dz / l }; })();
L.lake = { x: LK.x + LD.x * 53, z: LK.z + LD.z * 53 };
const FLAT = [];
function baseH(x, z) { return Math.sin(x * 0.012) * Math.cos(z * 0.010) * 7 + Math.sin(x * 0.029 + 1.3) * Math.sin(z * 0.025 + 0.7) * 3 + (vnoise(x * 0.05, z * 0.05) - 0.5) * 2.2; }
[['camp', 16], ['shed1', 6], ['gen', 7], ['truck', 10], ['cabin', 13], ['log', 16], ['tower', 12], ['shed2', 6], ['ranger', 16], ['grave', 24], ['tunnel', 8], ['hatch', 6], ['heli', 18], ['oldcamp', 9], ['barn', 12], ['stand', 5]]
  .forEach(([k, r]) => FLAT.push({ x: L[k].x, z: L[k].z, r, h: baseH(L[k].x, L[k].z) }));
FLAT.push({ x: LK.x, z: LK.z, r: LK.r + 14, h: baseH(LK.x, LK.z) }); LK.h = FLAT[FLAT.length - 1].h; LK.w = LK.h - 0.9;
function H(x, z) {
  if (x > 1000) return swampH(x, z);
  if (x < -1000) return 0;
  let h = baseH(x, z);
  for (const f of FLAT) { const dx = x - f.x, dz = z - f.z, d2 = dx * dx + dz * dz, R = f.r * 1.6; if (d2 < R * R) { const t = smooth(f.r, R, Math.sqrt(d2)); h = f.h + (h - f.h) * t; } }
  const dl = Math.hypot(x - LK.x, z - LK.z); if (dl < LK.r + 6) h -= (1 - smooth(LK.r - 4, LK.r + 6, dl)) * 4;
  return h;
}
// paths
const SEG = [], PG = new Map(); let POWER_PTS = [], PRINT_PTS = [];
function addPath(a, b, amp0) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), n = Math.max(2, Math.ceil(len / 8)), nx = -dz / len, nz = dx / len;
  const k = 1 + Math.floor(rng() * 2), ph = rng() * 6, amp = amp0 != null ? amp0 : Math.min(14, len * 0.06); let px = a.x, pz = a.z; const pts = [{ x: px, z: pz }];
  for (let i = 1; i <= n; i++) { const t = i / n, o = Math.sin(t * Math.PI * k * 2 + ph) * amp * Math.sin(t * Math.PI); const x = a.x + dx * t + nx * o, z = a.z + dz * t + nz * o; SEG.push([px, pz, x, z]); pts.push({ x, z }); px = x; pz = z; }
  return pts;
}
[['camp', 'gen'], ['camp', 'shed1'], ['camp', 'truck'], ['camp', 'cabin'], ['camp', 'log'], ['camp', 'lake'], ['camp', 'tower'], ['tower', 'shed2'], ['tower', 'ranger'], ['ranger', 'grave'], ['log', 'grave'], ['tower', 'heli'], ['cabin', 'heli'], ['hatch', 'heli'], ['truck', 'barn']].forEach(([a, b]) => { const pts = addPath(L[a], L[b]); if (a === 'camp' && b === 'tower') POWER_PTS = pts; if (a === 'tower' && b === 'ranger') PRINT_PTS = pts; });
const ARROW_PTS = addPath({ x: L.ranger.x + 7, z: L.ranger.z }, { x: L.tunnel.x, z: L.tunnel.z - 5 }, 10);
SEG.forEach((s, i) => { const x0 = Math.floor((Math.min(s[0], s[2]) - 6) / 20), x1 = Math.floor((Math.max(s[0], s[2]) + 6) / 20), z0 = Math.floor((Math.min(s[1], s[3]) - 6) / 20), z1 = Math.floor((Math.max(s[1], s[3]) + 6) / 20); for (let x = x0; x <= x1; x++)for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!PG.has(k)) PG.set(k, []); PG.get(k).push(i); } });
function pathDist(x, z) { const L2 = PG.get(Math.floor(x / 20) + ',' + Math.floor(z / 20)); if (!L2) return 99; let best = 99; for (const i of L2) { const s = SEG[i], dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz; let t = ((x - s[0]) * dx + (z - s[1]) * dz) / l2; t = clamp(t, 0, 1); const d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t); if (d < best) best = d; } return best; }

// ---------- colliders ----------
const CG = new Map(), BOX = [];
function addCol(x, z, r) { const k = Math.floor(x / 6) + ',' + Math.floor(z / 6); if (!CG.has(k)) CG.set(k, []); CG.get(k).push([x, z, r]); }
function collide(x, z, r) {
  const cx = Math.floor(x / 6), cz = Math.floor(z / 6);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const A = CG.get((cx + i) + ',' + (cz + j)); if (!A) continue; for (const t of A) { const dx = x - t[0], dz = z - t[1], rr = r + t[2], d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2); x = t[0] + dx / d * rr; z = t[1] + dz / d * rr; } } }
  for (const b of BOX) { if (x > b[0] - b[2] - r && x < b[0] + b[2] + r && z > b[1] - b[3] - r && z < b[1] + b[3] + r) { const px = (b[2] + r) - Math.abs(x - b[0]), pz = (b[3] + r) - Math.abs(z - b[1]); if (px < pz) x += Math.sign(x - b[0] || 1) * px; else z += Math.sign(z - b[1] || 1) * pz; } }
  const lx = x - LK.x, lz = z - LK.z, ld = Math.hypot(lx, lz); if (ld < LK.c) { x = LK.x + lx / ld * LK.c; z = LK.z + lz / ld * LK.c; }
  if (x > 1000) return [clamp(x, SW.x - 150, SW.x + 150), clamp(z, SW.z - 222, SW.z + 100)];
  if (x < -1000) { if (P.inRoom) return houseCollide(x, z, r); return typeof cityCollide === 'function' ? cityCollide(x, z, r) : [x, z]; }
  return [clamp(x, -325, 325), clamp(z, -325, 325)];
}

// ---------- geometry helpers ----------
function mk(geo, mat, x, y, z, p, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; (p || scene).add(m); return m; }
const bx = (w, h, d, mat, x, y, z, p) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
const cyl = (rt, rb, h, s, mat, x, y, z, p) => mk(new THREE.CylinderGeometry(rt, rb, h, s), mat, x, y, z, p);
const sph = (r, mat, x, y, z, p, sx = 1, sy = 1, sz = 1) => { const m = mk(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, p); m.scale.set(sx, sy, sz); return m; };
const cap = (r, len, mat, x, y, z, p) => mk(new THREE.CapsuleGeometry(r, len, 4, 10), mat, x, y, z, p);
function grp(x, z, ry = 0, p) { const g = new THREE.Group(); g.position.set(x, H(x, z), z); g.rotation.y = ry; (p || scene).add(g); return g; }
function beam(a, b, r, mat, p) { const v = new THREE.Vector3().subVectors(b, a), len = v.length(); const m = mk(new THREE.CylinderGeometry(r, r, len, 6), mat, 0, 0, 0, p); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), v.normalize()); return m; }
function merge(gs) { const ng = gs.map(g => g.index ? g.toNonIndexed() : g); let n = 0; ng.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0; ng.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }); const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return m; }
function jag(geo, amt, sd) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + (hash3(x * 7.1, y * 3.3 + sd, z * 5.7) - 0.5) * amt, y + (hash3(z * 4.3, x * 2.1, y * 6.9 + sd) - 0.5) * amt * 0.6, z + (hash3(y * 5.1, z * 3.7, x * 1.3 + sd) - 0.5) * amt); } geo.computeVertexNormals(); return geo; }
const GL = [];
const glintMat = new THREE.MeshBasicMaterial({ color: 0xffc24a, transparent: true, opacity: 0.9, depthWrite: false });
const MARK_GEO = (() => { const c = new THREE.ConeGeometry(0.075, 0.16, 4); c.rotateX(Math.PI); const st = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 4); st.translate(0, 0.15, 0); return merge([c, st]); })();
function glint(x, y, z) { const s = new THREE.Mesh(MARK_GEO, glintMat); s.position.set(x, y - 0.12, z); s.userData.by = y - 0.12; s.renderOrder = 3; scene.add(s); GL.push(s); return s; }
const noCast = o => o.traverse(c => { if (c.isMesh) { c.castShadow = false; } });

// ---------- ground & water ----------
{
  const GW = 760, GS = 230, gg = new THREE.PlaneGeometry(GW, GW, GS, GS); gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position, gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, H(x, z));
    const n = vnoise(x * 0.07, z * 0.07), n2 = vnoise(x * 0.31 + 9, z * 0.31), k = 0.75 + 0.5 * n2;
    const moss = smooth(0.55, 0.8, vnoise(x * 0.025 + 40, z * 0.025));
    let r = k * lerp(1.0, 0.78, moss), g = k * lerp(0.97, 1.12, moss), b = k * lerp(0.92, 0.8, moss);
    const pt = (1 - smooth(1.2, 3.2, pathDist(x, z))) * 0.85; r = lerp(r, 1.3 * k, pt); g = lerp(g, 1.12 * k, pt); b = lerp(b, 0.95 * k, pt);
    gc[i * 3] = r; gc[i * 3 + 1] = g; gc[i * 3 + 2] = b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, MAT.ground); ground.receiveShadow = true; scene.add(ground); window.GROUND_GEO = gg;
  const water = new THREE.Mesh(new THREE.CircleGeometry(LK.r + 9, 56), MAT.water); water.rotation.x = -Math.PI / 2; water.position.set(LK.x, LK.w, LK.z); scene.add(water);
}

// ---------- landmarks ----------
const W = {}; // handles the game uses
// camp
{
  const g = grp(0, 0);
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; const s = mk(new THREE.DodecahedronGeometry(0.18, 0), MAT.rock, Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75, g); s.scale.set(1, 0.7, 1.2); }
  for (let i = 0; i < 3; i++) { const l = cyl(0.07, 0.07, 1.3, 6, MAT.black, 0, 0.15, 0, g); l.rotation.z = Math.PI / 2 - 0.25; l.rotation.y = i * 1.05; }
  const ember = mk(new THREE.SphereGeometry(0.35, 10, 6), new THREE.MeshBasicMaterial({ color: 0xff4a10 }), 0, 0.02, 0, g, false); ember.scale.y = 0.25;
  W.fireL = new THREE.PointLight(0xff7a30, 1.7, 20, 1.6); W.fireL.position.set(0, 0.8, 0); g.add(W.fireL); addCol(0, 0, 0.95);
  const tent = mk(new THREE.ConeGeometry(1.9, 2.1, 4, 1, true), MAT.cloth, -4.5, 1.05, -3, g); tent.rotation.y = Math.PI / 4; BOX.push([-4.5, -3, 1.4, 1.4]);
  const lg = cyl(0.25, 0.27, 2.2, 8, MAT.bark, 2.6, 0.25, 0.6, g); lg.rotation.x = Math.PI / 2;
  W.letter = bx(0.22, 0.01, 0.3, MAT.paper, 2.6, 0.51, 0.2, g); W.letter.rotation.y = 0.3;
  W.flashPick = new THREE.Group(); W.flashPick.position.set(2.6, 0.55, 1.0); g.add(W.flashPick); const fb = cyl(0.035, 0.035, 0.24, 8, MAT.metal, 0, 0, 0, W.flashPick); fb.rotation.z = Math.PI / 2;
  W.letterGl = glint(2.6, 0.9, 0.5);
  bx(0.4, 0.55, 0.3, MAT.cloth2, -2.2, 0.27, -1.6, g);
  const car = grp(-8, 9, 0.4); bx(1.8, 0.7, 4.2, MAT.car, 0, 0.65, 0, car); bx(1.6, 0.6, 2, MAT.glass, 0, 1.3, -0.2, car);
  [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].forEach(([a, b]) => { const w = cyl(0.34, 0.34, 0.25, 12, MAT.black, a, 0.34, b, car); w.rotation.z = Math.PI / 2; });
  BOX.push([-8, 9, 1.7, 2.3]);
}
// sheds with weapons
function shed(px, pz) {
  const g = grp(px, pz), w = 3.2, d = 2.6, h = 2.4;
  bx(w, h, 0.1, MAT.dwood, 0, h / 2, -d / 2, g); bx(0.1, h, d, MAT.dwood, -w / 2, h / 2, 0, g); bx(0.1, h, d, MAT.dwood, w / 2, h / 2, 0, g);
  bx(0.8, h, 0.1, MAT.dwood, -w / 2 + 0.4, h / 2, d / 2, g); bx(0.8, h, 0.1, MAT.dwood, w / 2 - 0.4, h / 2, d / 2, g); bx(w, 0.5, 0.1, MAT.dwood, 0, h - 0.25, d / 2, g);
  const r = bx(w + 0.4, 0.1, d + 0.6, MAT.rust, 0, h + 0.12, 0, g); r.rotation.x = -0.08;
  bx(w, 0.06, d, MAT.wood, 0, 0.03, 0, g); bx(1.9, 0.08, 0.6, MAT.wood, 0, 0.9, -d / 2 + 0.4, g);
  [[-0.85, -0.95], [0.85, -0.95]].forEach(([a, b]) => cyl(0.04, 0.04, 0.9, 5, MAT.wood, a, 0.45, b, g));
  const door = bx(1.5, 2.0, 0.06, MAT.dwood, -1.3, 1.0, d / 2 + 0.65, g); door.rotation.y = 1.1;
  BOX.push([px, pz - d / 2, w / 2, 0.1], [px - w / 2, pz, 0.1, d / 2], [px + w / 2, pz, 0.1, d / 2], [px - w / 2 + 0.4, pz + d / 2, 0.4, 0.1], [px + w / 2 - 0.4, pz + d / 2, 0.4, 0.1]);
  return { x: px, z: pz - d / 2 + 0.4, y: g.position.y + 0.96, g };
}
W.shed1 = shed(L.shed1.x, L.shed1.z); W.shed2 = shed(L.shed2.x, L.shed2.z); W.shed3 = shed(L.grave.x + 15, L.grave.z - 10);
// generator
{
  const g = grp(L.gen.x, L.gen.z);
  bx(1.3, 0.12, 0.8, MAT.metal, 0, 0.06, 0, g); bx(1.1, 0.55, 0.7, MAT.yellow, 0, 0.4, 0, g); const tank = cyl(0.25, 0.25, 1, 10, MAT.yellow, 0, 0.85, 0, g); tank.rotation.z = Math.PI / 2; cyl(0.05, 0.05, 0.5, 6, MAT.rust, 0.45, 0.95, 0.25, g);
  [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]].forEach(([a, b]) => cyl(0.07, 0.07, 2.5, 6, MAT.dwood, a, 1.25, b, g)); const roof = bx(3.8, 0.1, 3.4, MAT.rust, 0, 2.55, 0, g); roof.rotation.x = 0.08;
  BOX.push([L.gen.x, L.gen.z, 0.8, 0.5]);
  cyl(0.06, 0.08, 4, 6, MAT.metal, 2.4, 2, 0, g); bx(0.5, 0.12, 0.3, MAT.metal, 2.15, 4, 0, g);
  W.bulbMat = MSM({ color: 0x222222, emissive: 0x000000 }); mk(new THREE.SphereGeometry(0.09, 8, 6), W.bulbMat, 2.05, 3.9, 0, g, false);
  W.genL = new THREE.PointLight(0xffd59a, 0, 26, 1.4); W.genL.position.set(2, 3.7, 0); g.add(W.genL); addCol(L.gen.x + 2.4, L.gen.z, 0.15);
}
// truck
{
  const g = grp(L.truck.x, L.truck.z, 0.25);
  bx(2.1, 0.6, 5.6, MAT.rust, 0, 0.75, 0, g); bx(2, 1.1, 1.8, MAT.rust, 0, 1.6, -0.6, g); bx(1.9, 0.6, 1.7, MAT.glass, 0, 1.85, -0.6, g); bx(2, 0.5, 1.6, MAT.rust, 0, 1.2, -2.2, g);
  bx(0.08, 0.5, 2.6, MAT.rust, -1, 1.3, 1.4, g); bx(0.08, 0.5, 2.6, MAT.rust, 1, 1.3, 1.4, g); bx(2, 0.5, 0.08, MAT.rust, 0, 1.3, 2.7, g);
  [[-1.05, 1.9], [1.05, 1.9], [-1.05, -1.9], [1.05, -1.9]].forEach(([a, b]) => { const w = cyl(0.42, 0.42, 0.3, 12, MAT.black, a, 0.42, b, g); w.rotation.z = Math.PI / 2; });
  BOX.push([L.truck.x, L.truck.z, 1.7, 3.0]);
}
// hunting cabin
{
  const g = grp(L.cabin.x, L.cabin.z);
  bx(7, 3, 5, MAT.dwood, 0, 1.5, 0, g); bx(6.9, 1.0, 3.2, MAT.dwood, 0, 3.4, 0, g);
  const r1 = bx(7.6, 0.15, 3.3, MAT.rust, 0, 3.65, -1.25, g); r1.rotation.x = 0.5; const r2 = bx(7.6, 0.15, 3.3, MAT.rust, 0, 3.65, 1.25, g); r2.rotation.x = -0.5;
  bx(7, 0.2, 2, MAT.wood, 0, 0.1, 3.5, g); [-3.3, 3.3].forEach(a => cyl(0.07, 0.07, 2.8, 6, MAT.wood, a, 1.4, 4.4, g)); bx(7.2, 0.1, 2.2, MAT.rust, 0, 2.85, 3.5, g);
  bx(1, 2, 0.06, MAT.black, 0, 1, 2.52, g);
  W.winMat = MSM({ color: 0x000000, emissive: 0x5a2a08, emissiveIntensity: 0.6 }); bx(1, 0.8, 0.06, W.winMat, 2, 1.6, 2.52, g); bx(1, 0.8, 0.06, W.winMat, -2, 1.6, 2.52, g);
  bx(0.6, 1.6, 0.6, MAT.stone, -2.5, 4.3, -0.8, g);
  BOX.push([L.cabin.x, L.cabin.z, 3.6, 2.6]);
}
// logging site
{
  const g = grp(L.log.x, L.log.z);
  const pile = (px, pz, alongZ) => { const p = new THREE.Group(); p.position.set(px, 0, pz); p.rotation.y = alongZ ? 0 : Math.PI / 2; g.add(p); for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const c = cyl(0.32, 0.32, 6, 8, MAT.bark, (i - (3 - row) / 2) * 0.66, 0.32 + row * 0.56, 0, p); c.rotation.x = Math.PI / 2; } BOX.push(alongZ ? [L.log.x + px, L.log.z + pz, 1.4, 3] : [L.log.x + px, L.log.z + pz, 3, 1.4]); };
  pile(-6, -3, true); pile(4, -7, false); pile(-3, 7, false);
  bx(2.4, 1.4, 3.4, MAT.yellow, 7, 1.1, 4, g); bx(1.6, 1.2, 1.4, MAT.rust, 7, 2.4, 3, g); bx(0.5, 0.7, 3.8, MAT.black, 5.7, 0.35, 4, g); bx(0.5, 0.7, 3.8, MAT.black, 8.3, 0.35, 4, g);
  BOX.push([L.log.x + 7, L.log.z + 4, 1.5, 2]);
  cyl(0.4, 0.5, 0.6, 9, MAT.bark, 2.5, 0.3, 1.5, g); addCol(L.log.x + 2.5, L.log.z + 1.5, 0.5);
}
// lake dock + boat
{
  const a = Math.atan2(LD.x, LD.z), g = new THREE.Group(); g.position.set(LK.x + LD.x * 44, LK.h + 0.15, LK.z + LD.z * 44); g.rotation.y = a; scene.add(g);
  for (let i = 0; i < 14; i++) bx(2.2, 0.08, 0.36, MAT.wood, 0, 0, -6 + i * 0.9, g);
  for (let i = 0; i < 4; i++) { cyl(0.08, 0.08, 2, 6, MAT.dwood, -1.1, -0.8, -6 + i * 3.6, g); cyl(0.08, 0.08, 2, 6, MAT.dwood, 1.1, -0.8, -6 + i * 3.6, g); }
  const boat = bx(1.2, 0.4, 3, MAT.dwood, 2.3, -0.6, -3, g); boat.rotation.z = 0.12;
}
// radio tower
const T = L.tower, TY = 22; let TG0 = 0;
{
  const g = grp(T.x, T.z); TG0 = g.position.y; const B = 2.6, Tp = 1.4;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { beam(V3(a * B, 0, b * B), V3(a * Tp, TY, b * Tp), 0.09, MAT.metal, g); addCol(T.x + a * B, T.z + b * B, 0.3); });
  const faces = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
  for (let lv = 0; lv < 5; lv++) { const y0 = lv * TY / 5, y1 = (lv + 1) * TY / 5, w0 = lerp(B, Tp, y0 / TY), w1 = lerp(B, Tp, y1 / TY);
    faces.forEach(([p, q]) => { beam(V3(p[0] * w0, y0, p[1] * w0), V3(q[0] * w1, y1, q[1] * w1), 0.035, MAT.metal, g); beam(V3(q[0] * w0, y0, q[1] * w0), V3(p[0] * w1, y1, p[1] * w1), 0.035, MAT.metal, g); beam(V3(p[0] * w1, y1, p[1] * w1), V3(q[0] * w1, y1, q[1] * w1), 0.04, MAT.metal, g); }); }
  bx(3.6, 0.15, 3.6, MAT.metal, 0, TY, 0, g);
  [[0, -1.75, 3.6, 0.06], [0, 1.75, 3.6, 0.06], [-1.75, 0, 0.06, 3.6], [1.75, 0, 0.06, 3.6]].forEach(([x, z, w, d]) => bx(w, 0.05, d, MAT.metal, x, TY + 1.05, z, g));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; cyl(0.03, 0.03, 1.05, 4, MAT.metal, Math.cos(a) * 2.45, TY + 0.55, Math.sin(a) * 2.45, g); }
  beam(V3(-0.3, 0, 2.75), V3(-0.3, TY, 1.6), 0.03, MAT.metal, g); beam(V3(0.3, 0, 2.75), V3(0.3, TY, 1.6), 0.03, MAT.metal, g);
  for (let y = 0.4; y < TY; y += 0.55) { const zz = lerp(2.75, 1.6, y / TY); const r = cyl(0.018, 0.018, 0.6, 4, MAT.metal, 0, y, zz, g); r.rotation.z = Math.PI / 2; r.castShadow = false; }
  beam(V3(0, TY, 0), V3(0, TY + 10, 0), 0.06, MAT.metal, g);
  bx(0.8, 0.8, 0.5, MAT.wood, 0, TY + 0.45, -1.2, g); bx(0.55, 0.35, 0.35, MAT.metal, 0, TY + 1.05, -1.2, g);
  W.radioLed = MSM({ color: 0x111111, emissive: 0x000000 }); mk(new THREE.SphereGeometry(0.03, 6, 4), W.radioLed, 0.18, TY + 1.12, -1.02, g, false);
  W.fuseBox = bx(0.5, 0.7, 0.25, MAT.metal, 2.0, 1.3, 2.4, g); W.fuseLed = MSM({ color: 0x220000, emissive: 0x000000 }); mk(new THREE.SphereGeometry(0.035, 6, 4), W.fuseLed, 2.0, 1.75, 2.53, g, false);
  cyl(0.06, 0.06, 1.6, 5, MAT.metal, 2.0, 0.8, 2.4, g);
  W.beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glint, color: 0xff2010, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W.beacon.position.set(0, TY + 10.3, 0); W.beacon.scale.set(2.2, 2.2, 2.2); W.beacon.visible = false; g.add(W.beacon);
  W.flood = new THREE.SpotLight(0xdde6ff, 0, 70, 0.75, 0.5, 1); W.flood.position.set(0, TY - 0.3, 1.6); g.add(W.flood); const ft = new THREE.Object3D(); ft.position.set(-6, 0, 12); g.add(ft); W.flood.target = ft;
}
// ranger station
const R = L.ranger;
{
  const g = grp(R.x, R.z);
  bx(10, 3.4, 7, MAT.dwood, 0, 1.7, 0, g); bx(9.8, 1.1, 4.6, MAT.dwood, 0, 3.9, 0, g);
  const r1 = bx(10.6, 0.15, 4.3, MAT.rust, 0, 4.15, -1.75, g); r1.rotation.x = 0.45; const r2 = bx(10.6, 0.15, 4.3, MAT.rust, 0, 4.15, 1.75, g); r2.rotation.x = -0.45;
  bx(2.2, 0.25, 7, MAT.wood, 6.1, 0.12, 0, g); [-3.3, 3.3].forEach(z => cyl(0.08, 0.08, 3, 6, MAT.wood, 7.1, 1.5, z, g)); bx(2.4, 0.1, 7.2, MAT.rust, 6.1, 3.05, 0, g);
  W.rDoor = bx(0.06, 2.1, 1.1, MAT.black, 5.03, 1.05, 0, g); bx(0.06, 0.6, 2.6, MAT.sign, 5.1, 2.75, 0, g);
  [-2.5, 2.5].forEach(z => bx(0.06, 0.9, 1.2, MAT.glass, 5.03, 1.8, z, g));
  beam(V3(8, 0, -4.5), V3(8, 7, -4.5), 0.05, MAT.metal, g);
  BOX.push([R.x, R.z, 5.1, 3.6]);
}
// graveyard + chapel ruin + well
const Gv = L.grave;
{
  const g = grp(Gv.x, Gv.z);
  bx(7, 6, 0.5, MAT.stone, -9, 3, -13, g); bx(0.5, 4.5, 10, MAT.stone, -12.5, 2.25, -8, g); bx(0.5, 2.5, 6, MAT.stone, -5.5, 1.25, -10, g); bx(2.5, 5, 0.5, MAT.stone, -11.25, 2.5, -3, g); bx(1.5, 3, 0.5, MAT.stone, -6.25, 1.5, -3, g);
  bx(1.6, 4, 1.6, MAT.stone, -9, 8, -13, g); bx(0.15, 1.4, 0.15, MAT.dwood, -9, 10.7, -13, g); bx(0.8, 0.15, 0.15, MAT.dwood, -9, 10.9, -13, g);
  BOX.push([Gv.x - 9, Gv.z - 13, 3.5, 0.3], [Gv.x - 12.5, Gv.z - 8, 0.3, 5], [Gv.x - 5.5, Gv.z - 10, 0.3, 3], [Gv.x - 11.25, Gv.z - 3, 1.25, 0.3], [Gv.x - 6.25, Gv.z - 3, 0.75, 0.3]);
  for (let i = 0; i < 30; i++) {
    const x = -4 + rng() * 20, z = -14 + rng() * 28; if (Math.hypot(x - 6, z - 4) < 3.5 || (x > 11 && z < -6)) continue;
    const ty = rng(); const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.set((rng() - 0.5) * 0.25, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.25); g.add(t);
    if (ty < 0.6) { bx(0.7, 0.9, 0.16, MAT.stone, 0, 0.45, 0, t); const top = cyl(0.35, 0.35, 0.16, 10, MAT.stone, 0, 0.9, 0, t); top.rotation.x = Math.PI / 2; }
    else { bx(0.12, 1.2, 0.12, MAT.dwood, 0, 0.6, 0, t); bx(0.6, 0.1, 0.1, MAT.dwood, 0, 0.9, 0, t); }
    addCol(Gv.x + x, Gv.z + z, 0.35);
  }
  for (let a = 0; a < 6.28; a += 0.11) { if (Math.abs(wrapA(a - 0.6)) < 0.25 || Math.abs(wrapA(a - 2.6)) < 0.25 || Math.abs(wrapA(a + 1.0)) < 0.2) continue; const p = cyl(0.03, 0.03, 1.3, 4, MAT.metal, Math.cos(a) * 21, 0.65, Math.sin(a) * 21, g); p.castShadow = false; }
  const well = mk(new THREE.CylinderGeometry(1.1, 1.15, 0.9, 16, 1, true), MSM({ map: TX.stone, roughness: 0.95, side: THREE.DoubleSide }), 6, 0.45, 4, g);
  const rim = mk(new THREE.TorusGeometry(1.12, 0.1, 6, 18), MAT.stone, 6, 0.9, 4, g); rim.rotation.x = Math.PI / 2;
  const hole = mk(new THREE.CircleGeometry(1.08, 16), MAT.black, 6, 0.3, 4, g, false); hole.rotation.x = -Math.PI / 2;
  cyl(0.06, 0.06, 2.4, 5, MAT.dwood, 4.8, 1.2, 4, g); cyl(0.06, 0.06, 2.4, 5, MAT.dwood, 7.2, 1.2, 4, g); const bar = cyl(0.05, 0.05, 2.6, 5, MAT.dwood, 6, 2.3, 4, g); bar.rotation.z = Math.PI / 2;
  const roof1 = bx(2.8, 0.06, 1.3, MAT.dwood, 6, 2.7, 3.5, g); roof1.rotation.x = 0.6; const roof2 = bx(2.8, 0.06, 1.3, MAT.dwood, 6, 2.7, 4.5, g); roof2.rotation.x = -0.6;
  addCol(Gv.x + 6, Gv.z + 4, 1.35);
  W.key = new THREE.Group(); W.key.position.set(6, 0.97, 5.1); g.add(W.key); const ring = mk(new THREE.TorusGeometry(0.04, 0.012, 6, 12), MAT.key, 0, 0, 0, W.key); ring.rotation.x = Math.PI / 2; bx(0.11, 0.012, 0.018, MAT.key, 0.09, 0, 0, W.key);
  W.keyGl = glint(Gv.x + 6, W.key.getWorldPosition(V3(0, 0, 0)).y + 0.35, Gv.z + 5.1);
}
// tunnel entrance (mine)
{
  const g = grp(L.tunnel.x, L.tunnel.z);
  const mound = mk(new THREE.DodecahedronGeometry(7, 1), MAT.rock, 0, -1.5, 5.5, g); mound.scale.set(1.2, 0.75, 1);
  bx(0.6, 3, 0.8, MAT.conc, -1.6, 1.5, -1.2, g); bx(0.6, 3, 0.8, MAT.conc, 1.6, 1.5, -1.2, g); bx(3.8, 0.7, 0.8, MAT.conc, 0, 3.2, -1.2, g);
  bx(2.6, 2.9, 0.1, MAT.black, 0, 1.45, -0.85, g, false);
  const dr = bx(1.3, 2.6, 0.08, MAT.rust, 2.3, 1.3, -1.9, g); dr.rotation.y = -1.2;
  bx(1.1, 0.55, 0.04, MAT.warn, 0, 3.9, -1.62, g);
  BOX.push([L.tunnel.x, L.tunnel.z + 3, 6.5, 3.8]);
}
// hatch near the helipad
{
  const g = grp(L.hatch.x, L.hatch.z);
  bx(2.2, 0.4, 2.2, MAT.conc, 0, 0.2, 0, g); const lid = bx(1.4, 0.08, 1.4, MAT.rust, 0, 0.9, -0.95, g); lid.rotation.x = -1.2;
  mk(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), MAT.black, 0, 0.41, 0, g, false);
}
// helipad + windsock
const Hp = L.heli;
{
  const g = grp(Hp.x, Hp.z); const pad = mk(new THREE.CircleGeometry(9, 48), MAT.pad, 0, 0.05, 0, g, false); pad.rotation.x = -Math.PI / 2;
  W.padLightMat = new THREE.SpriteMaterial({ map: TX.glint, color: 0xff6a20, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = new THREE.Sprite(W.padLightMat); s.position.set(Math.cos(a) * 9.4, 0.25, Math.sin(a) * 9.4); s.scale.set(0.8, 0.8, 0.8); g.add(s); cyl(0.08, 0.1, 0.2, 6, MAT.metal, Math.cos(a) * 9.4, 0.1, Math.sin(a) * 9.4, g); }
  beam(V3(13, 0, -7), V3(13, 5.5, -7), 0.05, MAT.metal, g); const sock = mk(new THREE.ConeGeometry(0.35, 1.6, 10, 1, true), MSM({ color: 0xb8401a, roughness: 0.9, side: THREE.DoubleSide }), 13.8, 5.3, -7, g); sock.rotation.z = Math.PI / 2 + 0.3;
}

// ---------- red arrows (chase route) ----------
W.arrows = new THREE.Group(); W.arrows.visible = false; scene.add(W.arrows);
{
  const sh = new THREE.Shape(); sh.moveTo(0, 0.9); sh.lineTo(0.6, 0.15); sh.lineTo(0.22, 0.15); sh.lineTo(0.22, -0.8); sh.lineTo(-0.22, -0.8); sh.lineTo(-0.22, 0.15); sh.lineTo(-0.6, 0.15); sh.closePath();
  const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); const am = new THREE.MeshBasicMaterial({ color: 0xff1a12 });
  const glowM = new THREE.SpriteMaterial({ map: TX.glint, color: 0xff2010, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  let acc = 0;
  for (let i = 1; i < ARROW_PTS.length; i++) { const a = ARROW_PTS[i - 1], b = ARROW_PTS[i], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    for (let s = 0; s < l; s += 1) { acc += 1; if (acc % 6 !== 0) continue; const x = a.x + dx * s / l, z = a.z + dz * s / l; const m = new THREE.Mesh(ag, am); m.position.set(x, H(x, z) + 0.06, z); m.rotation.y = Math.atan2(-dx, -dz); W.arrows.add(m); const sp = new THREE.Sprite(glowM); sp.position.set(x, H(x, z) + 0.4, z); sp.scale.set(2.2, 1.2, 1); W.arrows.add(sp); } }
}

// ---------- scatter (trees, rocks, bushes) in chunks ----------
const CH = 80, chunks = new Map();
function chunkOf(x, z) { const cx = Math.floor((x + 400) / CH), cz = Math.floor((z + 400) / CH), k = cx + ',' + cz; let c = chunks.get(k); if (!c) { c = { x: cx * CH - 400 + CH / 2, z: cz * CH - 400 + CH / 2, lists: {}, meshes: [] }; chunks.set(k, c); } return c; }
function addInst(kind, x, z, m, col) { const c = chunkOf(x, z); (c.lists[kind] || (c.lists[kind] = [])).push([m, col]); }
{
  const pineGeo = (() => { const parts = [], TT = 12;
    for (let i = 0; i < TT; i++) { const t = i / (TT - 1), y = 1.9 + i * 0.76, Lb = lerp(2.8, 0.5, Math.pow(t, 0.85)), n = i < TT - 3 ? 7 : 4;
      for (let j = 0; j < n; j++) { const an = j / n * Math.PI * 2 + i * 0.62 + (hash(i, j) - 0.5) * 0.6, droop = 0.22 + t * 0.18 + (hash(j, i) - 0.5) * 0.22, w = Lb * (0.85 + hash(i * 3, j) * 0.3), hg = w * 0.55;
        for (const roll of [0, Math.PI / 2]) { const p = new THREE.PlaneGeometry(w, hg); p.translate(w / 2, 0, 0); p.rotateX(-Math.PI / 2 + roll); p.rotateZ(-droop); p.rotateY(an); p.translate(0, y - (roll ? 0 : w * 0.05), 0); parts.push(p); } } }
    for (const rr of [0, Math.PI / 2]) { const p = new THREE.PlaneGeometry(2.0, 0.9); p.translate(1.0, 0, 0); p.rotateZ(Math.PI / 2); p.rotateY(rr); p.translate(0, 1.9 + (TT - 1) * 0.76 - 0.4, 0); parts.push(p); }
    const g = merge(parts), ps = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < ps.count; k++) { v.set(ps.getX(k), (ps.getY(k) - 6.5) * 0.35 + 0.9, ps.getZ(k)).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return g; })();
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.34, 11, 8); trunkGeo.translate(0, 5.5, 0);
  const dl = [new THREE.CylinderGeometry(0.12, 0.28, 8, 6).translate(0, 4, 0)]; for (let i = 0; i < 5; i++) { const b = new THREE.CylinderGeometry(0.03, 0.08, 2.2, 4); b.rotateZ(i % 2 ? 1.0 : -1.0); b.translate(i % 2 ? -0.7 : 0.7, 3 + i * 1.0, 0); b.rotateY(i * 1.3); dl.push(b); }
  const deadGeo = merge(dl);
  const bushGeo = (() => { const parts = []; for (let i = 0; i < 9; i++) { const an = i / 9 * Math.PI * 2 + hash(i, 7), w = 0.9 + hash(i, 3) * 0.5; for (const roll of [0, Math.PI / 2]) { const p = new THREE.PlaneGeometry(w, w * 0.55); p.translate(w / 2, 0, 0); p.rotateX(-Math.PI / 2 + roll); p.rotateZ(0.6 + hash(3, i) * 0.4); p.rotateY(an); p.translate(0, 0.15 + hash(i, i) * 0.3, 0); parts.push(p); } } const g = merge(parts), ps = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3(); for (let k = 0; k < ps.count; k++) { v.set(ps.getX(k), 1.2, ps.getZ(k)).normalize(); nr.setXYZ(k, v.x, v.y, v.z); } g.translate(0, 0.25, 0); return g; })();
  const rockGeo = jag(new THREE.DodecahedronGeometry(1, 1), 0.35, 5);
  const logGeo = new THREE.CylinderGeometry(0.3, 0.35, 5, 8); logGeo.rotateZ(Math.PI / 2); logGeo.translate(0, 0.3, 0);
  const stumpGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 8); stumpGeo.translate(0, 0.3, 0);
  const KIND = { pine: [pineGeo, MAT.leaf, true], trunk: [trunkGeo, MAT.bark, true], dead: [deadGeo, MAT.dead, true], bush: [bushGeo, MAT.bush, true], rock: [rockGeo, MAT.rock, true], log: [logGeo, MAT.bark, true], stump: [stumpGeo, MAT.bark, true] };
  const q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3();
  const mat4 = (x, y, z, sx, sy, sz, ry) => { e.set(0, ry, 0); q.setFromEuler(e); vp.set(x, y, z); vs.set(sx, sy, sz); return new THREE.Matrix4().compose(vp, q, vs); };
  const clearOK = (x, z, m) => { for (const f of FLAT) if (Math.hypot(x - f.x, z - f.z) < f.r + m) return false; return pathDist(x, z) > m + 1.5; };
  const white = () => new THREE.Color(1, 1, 1);
  let placed = 0;
  for (let i = 0; i < 26000 && placed < 4300; i++) {
    const x = (rng() - 0.5) * 710, z = (rng() - 0.5) * 710; if (!clearOK(x, z, 3)) continue;
    const s = 0.75 + rng() * 0.8, sy = s * (0.9 + rng() * 0.35), ry = rng() * 6.28, y = H(x, z) - 0.2;
    if (rng() < 0.08) addInst('dead', x, z, mat4(x, y, z, s, sy, s, ry), white());
    else { const m = mat4(x, y, z, s, sy, s, ry), c = new THREE.Color(0.8 + rng() * 0.4, 0.8 + rng() * 0.4, 0.75 + rng() * 0.3); addInst('pine', x, z, m, c); addInst('trunk', x, z, m, white()); }
    addCol(x, z, 0.3 * s + 0.05); placed++;
  }
  for (let i = 0; i < 2600; i++) { const x = (rng() - 0.5) * 700, z = (rng() - 0.5) * 700; if (!clearOK(x, z, 0.5)) continue; const s = 0.6 + rng() * 0.9; addInst('bush', x, z, mat4(x, H(x, z), z, s, s * (0.7 + rng() * 0.6), s, rng() * 6), new THREE.Color(0.8 + rng() * 0.4, 0.8 + rng() * 0.4, 0.8)); }
  for (let i = 0; i < 480; i++) { const x = (rng() - 0.5) * 700, z = (rng() - 0.5) * 700; if (!clearOK(x, z, 1)) continue; const s = 0.3 + rng() * 1.2; addInst('rock', x, z, mat4(x, H(x, z) - s * 0.3, z, s * (0.8 + rng() * 0.5), s * (0.5 + rng() * 0.4), s, rng() * 6), white()); if (s > 0.6) addCol(x, z, s * 0.8); }
  for (let i = 0; i < 160; i++) { const x = (rng() - 0.5) * 700, z = (rng() - 0.5) * 700; if (!clearOK(x, z, 3)) continue; addInst('log', x, z, mat4(x, H(x, z), z, 1, 1, 1, rng() * 6), white()); }
  for (let i = 0; i < 140; i++) { const x = (rng() - 0.5) * 700, z = (rng() - 0.5) * 700; if (!clearOK(x, z, 1)) continue; addInst('stump', x, z, mat4(x, H(x, z) - 0.05, z, 1, 0.6 + rng() * 0.8, 1, rng() * 6), white()); addCol(x, z, 0.45); }
  chunks.forEach(c => { for (const k in c.lists) { const A = c.lists[k], d = KIND[k], im = new THREE.InstancedMesh(d[0], d[1], A.length); A.forEach((en, i) => { im.setMatrixAt(i, en[0]); im.setColorAt(i, en[1]); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.castShadow = d[2]; im.receiveShadow = true; scene.add(im); c.meshes.push(im); } c.lists = null; });
}
function updateChunks(px, pz, range) { chunks.forEach(c => { const v = Math.hypot(c.x - px, c.z - pz) < range; for (const m of c.meshes) m.visible = v; }); }

// ---------- underground tunnel ----------
const TB = { x: -40, z: -40, y: -80 };
const TP = [[0, 0], [0, -34], [22, -50], [22, -88], [-6, -110], [-6, -150], [18, -168], [18, -196]].map(([x, z]) => ({ x: TB.x + x, z: TB.z + z }));
const TS = [0]; for (let i = 1; i < TP.length; i++) TS.push(TS[i - 1] + Math.hypot(TP[i].x - TP[i - 1].x, TP[i].z - TP[i - 1].z));
const TLEN = TS[TS.length - 1], GATE_S = TS[3] + 14;
function tPoint(s) { s = clamp(s, 0, TLEN); let i = 1; while (i < TS.length - 1 && TS[i] < s) i++; const a = TP[i - 1], b = TP[i], l = TS[i] - TS[i - 1], t = (s - TS[i - 1]) / l; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l }; }
function tProject(x, z) { let best = null; for (let i = 1; i < TP.length; i++) { const a = TP[i - 1], b = TP[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz; const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1); const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz); if (!best || d < best.d) best = { d, px, pz, s: TS[i - 1] + t * Math.sqrt(l2) }; } return best; }
W.tunnel = new THREE.Group(); scene.add(W.tunnel);
const TBULBS = [];
{
  const g = W.tunnel, wm = MSM({ map: TX.stone, color: 0x8a8478, roughness: 1 }), fm = MSM({ map: TX.conc, color: 0x6a645a, roughness: 1 });
  for (let i = 1; i < TP.length; i++) {
    const a = TP[i - 1], b = TP[i], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), ang = Math.atan2(dx, dz), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, nx = dz / len, nz = -dx / len;
    const f = bx(2.8, 0.2, len + 2.8, fm, mx, TB.y - 0.1, mz, g); f.rotation.y = ang;
    const c = bx(2.8, 0.2, len + 2.8, wm, mx, TB.y + 2.7, mz, g); c.rotation.y = ang;
    [-1, 1].forEach(sd => { const w = bx(0.3, 2.8, len + 0.3, wm, mx + nx * 1.4 * sd, TB.y + 1.3, mz + nz * 1.4 * sd, g); w.rotation.y = ang; });
    const pipe = cyl(0.08, 0.08, len, 6, MAT.rust, mx + nx * 1.15, TB.y + 2.3, mz + nz * 1.15, g); pipe.rotation.set(Math.PI / 2, 0, 0); pipe.rotation.order = 'YXZ'; pipe.rotation.y = ang;
    for (let s = 2; s < len; s += 4) { const px = a.x + dx * s / len, pz = a.z + dz * s / len, fr = new THREE.Group(); fr.position.set(px, TB.y, pz); fr.rotation.y = ang; g.add(fr); bx(0.18, 2.6, 0.18, MAT.dwood, -1.15, 1.3, 0, fr); bx(0.18, 2.6, 0.18, MAT.dwood, 1.15, 1.3, 0, fr); bx(2.5, 0.2, 0.2, MAT.dwood, 0, 2.5, 0, fr); }
  }
  const bm = MSM({ color: 0x332211, emissive: 0xffb060, emissiveIntensity: 1.4 });
  for (let s = 6; s < TLEN; s += 11) { const p = tPoint(s); mk(new THREE.SphereGeometry(0.07, 8, 6), bm, p.x, TB.y + 2.35, p.z, g, false); TBULBS.push({ x: p.x, z: p.z }); }
  W.tunL = [0, 1].map(() => { const l = new THREE.PointLight(0xffb070, 0, 13, 1.6); scene.add(l); return l; });
  const gp = tPoint(GATE_S); W.gate = new THREE.Group(); W.gate.position.set(gp.x, TB.y, gp.z); W.gate.rotation.y = Math.atan2(gp.dx, gp.dz); g.add(W.gate);
  for (let i = -5; i <= 5; i++) cyl(0.035, 0.035, 2.5, 5, MAT.rust, i * 0.24, 1.25, 0, W.gate); [0.3, 1.2, 2.2].forEach(y => bx(2.6, 0.08, 0.06, MAT.rust, 0, y, 0, W.gate));
  const ep = tPoint(TLEN - 0.6); for (let y = 0.3; y < 2.6; y += 0.4) { const r = cyl(0.025, 0.025, 0.7, 4, MAT.metal, ep.x, TB.y + y, ep.z, g); r.rotation.z = Math.PI / 2; }
  W.endLight = new THREE.PointLight(0x9fb8ff, 0, 8, 1.5); W.endLight.position.set(ep.x, TB.y + 2.4, ep.z); scene.add(W.endLight);
  const st = tPoint(0.2); bx(2.8, 2.8, 0.3, wm, st.x - st.dx * 1.5, TB.y + 1.3, st.z - st.dz * 1.5, g);
}

// ---------- models ----------
function makeCreature() {
  const g = new THREE.Group(), s = MAT.skin;
  const grime = new THREE.MeshPhysicalMaterial({ map: TX.skin, normalMap: NRM.skin, color: 0x3a302c, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const bone = new THREE.MeshPhysicalMaterial({ map: TX.skin, normalMap: NRM.skin, color: 0x9c968c, roughness: 0.45, clearcoat: 0.2 });
  const hairM = MSM({ color: 0x090706, roughness: 0.45, metalness: 0.1 }), nail = MSM({ color: 0x1a1410, roughness: 0.3 });
  const hips = new THREE.Group(); hips.position.y = 1.55; g.add(hips);
  sph(0.14, s, 0, 0.0, 0, hips, 1.25, 0.75, 0.8);
  [-1, 1].forEach(sd => sph(0.045, bone, sd * 0.14, 0.07, 0.06, hips));
  const torso = new THREE.Group(); hips.add(torso);
  // starved torso: narrow waist, sunken belly, wide bony chest
  const prof = [[0.001, 0], [0.12, 0.0], [0.115, 0.12], [0.095, 0.28], [0.11, 0.42], [0.17, 0.58], [0.205, 0.74], [0.22, 0.88], [0.2, 0.98], [0.11, 1.05], [0.001, 1.07]].map(([r, y]) => new THREE.Vector2(r, y));
  const tor = mk(new THREE.LatheGeometry(prof, 22), s, 0, 0, 0, torso); tor.scale.set(1.05, 1, 0.62);
  for (let i = 0; i < 7; i++) { const y = 0.5 + i * 0.065, r = 0.15 + Math.min(i, 4) * 0.014; const rib = mk(new THREE.TorusGeometry(r, 0.011, 5, 18, Math.PI * 1.15), bone, 0, y, 0, torso); rib.rotation.set(Math.PI / 2 - 0.25, 0, -Math.PI * 0.075); rib.scale.set(1.07, 0.68, 1); }
  cap(0.014, 0.26, bone, 0, 0.74, 0.13, torso);
  [-1, 1].forEach(sd => { const cl = cap(0.017, 0.2, bone, sd * 0.11, 0.97, 0.09, torso); cl.rotation.z = sd * 1.35; sph(0.07, bone, sd * 0.1, 0.84, -0.11, torso, 1, 1.3, 0.35); });
  for (let i = 0; i < 10; i++) sph(0.026, bone, 0, 0.1 + i * 0.095, -0.125 + Math.sin(i * 0.4) * 0.01, torso);
  const neck = new THREE.Group(); neck.position.set(0, 1.04, 0.02); torso.add(neck);
  cap(0.042, 0.22, s, 0, 0.13, 0, neck); [-1, 1].forEach(sd => { const tdn = cap(0.012, 0.22, bone, sd * 0.03, 0.12, 0.03, neck); tdn.rotation.z = sd * 0.25; });
  const head = new THREE.Group(); head.position.y = 0.3; neck.add(head);
  // long skull, deep sockets, hanging jaw full of teeth, stringy wet hair
  const sk = [[0.001, -0.1], [0.06, -0.095], [0.092, -0.05], [0.105, 0.04], [0.11, 0.14], [0.1, 0.23], [0.07, 0.3], [0.001, 0.325]].map(([r, y]) => new THREE.Vector2(r, y));
  const skull = mk(new THREE.LatheGeometry(sk, 22), s, 0, 0, 0, head); skull.scale.set(0.95, 1, 1.08);
  sph(0.1, bone, 0, 0.125, 0.07, head, 1.05, 0.22, 0.45);
  [-1, 1].forEach(sd => { sph(0.028, bone, sd * 0.07, 0.04, 0.075, head, 1.1, 0.8, 0.9); sph(0.03, MAT.black, sd * 0.042, 0.085, 0.088, head, 1.25, 0.95, 0.6); sph(0.0085, MAT.eye, sd * 0.042, 0.083, 0.106, head); sph(0.009, MAT.black, sd * 0.012, 0.025, 0.11, head, 1, 1.6, 0.6); });
  sph(0.05, MAT.mouth, 0, -0.03, 0.065, head, 0.75, 0.9, 0.45);
  for (let i = 0; i < 9; i++) { const a2 = (i / 8 - 0.5) * 1.6, t2 = mk(new THREE.ConeGeometry(0.006, 0.028 + (i % 3) * 0.01, 4), MAT.teeth, Math.sin(a2) * 0.05, -0.012, 0.07 + Math.cos(a2) * 0.035, head); t2.rotation.x = Math.PI; }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.02, 0.0); head.add(jaw);
  sph(0.065, s, 0, -0.06, 0.04, jaw, 0.85, 0.55, 1.05);
  for (let i = 0; i < 8; i++) { const a2 = (i / 7 - 0.5) * 1.5; mk(new THREE.ConeGeometry(0.0055, 0.026 + (i % 2) * 0.01, 4), MAT.teeth, Math.sin(a2) * 0.046, -0.035, 0.075 + Math.cos(a2) * 0.03, jaw); }
  const hair = [];
  for (let i = 0; i < 30; i++) { const a2 = Math.PI * 0.15 + (i / 30) * Math.PI * 1.7, el = 0.12 + (i % 4) * 0.045, len = 0.3 + ((i * 37) % 10) / 10 * 0.45, hg = new THREE.Group(); hg.position.set(Math.cos(a2) * 0.1 * 0.95, el + 0.1, -Math.abs(Math.sin(a2)) * 0.105 + (Math.sin(a2) > 0 ? 0 : 0.02)); hg.position.z = Math.sin(a2) * 0.105; head.add(hg); if (hg.position.z > 0.05) { hg.position.z = 0.05; } const st = cyl(0.004, 0.0015, len, 3, hairM, 0, -len / 2, 0, hg); st.castShadow = false; hg.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3); hair.push(hg); }
  const fingers = [];
  const arm = sd => {
    const sh = new THREE.Group(); sh.position.set(sd * 0.27, 0.95, 0); torso.add(sh); sph(0.075, s, 0, 0, 0, sh, 1, 0.9, 0.9);
    cap(0.04, 0.78, s, 0, -0.43, 0, sh); sph(0.048, bone, 0, -0.86, -0.01, sh);
    const el = new THREE.Group(); el.position.y = -0.86; sh.add(el); cap(0.03, 0.74, s, 0, -0.41, 0, el); cap(0.016, 0.6, bone, 0.02 * sd, -0.4, -0.02, el); sph(0.034, bone, 0, -0.8, 0, el);
    const hd = new THREE.Group(); hd.position.y = -0.83; el.add(hd); sph(0.045, grime, 0, -0.03, 0, hd, 1, 1.4, 0.45);
    for (let f = 0; f < 5; f++) { const thumb = f === 4, fg = new THREE.Group(); fg.position.set(thumb ? sd * 0.04 : (f - 1.5) * 0.02, thumb ? -0.04 : -0.085, thumb ? 0.02 : 0); fg.rotation.z = thumb ? sd * 0.5 : (f - 1.5) * 0.06; hd.add(fg); const l1 = thumb ? 0.08 : 0.13; cap(0.008, l1, grime, 0, -l1 / 2, 0, fg); const f2 = new THREE.Group(); f2.position.y = -l1; fg.add(f2); cap(0.007, l1 * 0.85, grime, 0, -l1 * 0.42, 0, f2); const nl = mk(new THREE.ConeGeometry(0.007, 0.05, 4), nail, 0, -l1 * 0.85 - 0.02, 0.003, f2); nl.rotation.x = Math.PI; fingers.push(fg, f2); }
    return { sh, el };
  };
  const leg = sd => {
    const hp = new THREE.Group(); hp.position.set(sd * 0.12, 0, 0); hips.add(hp); cap(0.058, 0.62, s, 0, -0.38, 0, hp); sph(0.058, bone, 0, -0.76, 0.02, hp);
    const kn = new THREE.Group(); kn.position.y = -0.76; hp.add(kn); cap(0.04, 0.62, s, 0, -0.37, 0, kn); cap(0.015, 0.5, bone, 0, -0.36, 0.035, kn); sph(0.035, bone, 0, -0.74, 0, kn);
    const ft = new THREE.Group(); ft.position.y = -0.76; kn.add(ft); sph(0.05, grime, 0, 0.01, 0.06, ft, 0.8, 0.45, 1.9);
    for (let k = 0; k < 4; k++) { const tz = cap(0.009, 0.07, grime, (k - 1.5) * 0.02, -0.005, 0.17, ft); tz.rotation.x = Math.PI / 2 + 0.2; }
    return { hp, kn };
  };
  const c = { g, hips, torso, neck, head, jaw, hair, fingers, aL: arm(-1), aR: arm(1), lL: leg(-1), lR: leg(1), cur: {} };
  g.visible = false; scene.add(g); return c;
}
// pose targets, lerped smoothly every frame
const POSE = {
  idle: (ph, tw) => ({ hy: 1.55, tx: 0.16, nx: 0.25, hz: tw.z, hyw: tw.y, sLx: -0.05, sLz: 0.12, sRx: -0.05, sRz: -0.12, eL: -0.12, eR: -0.12, tL: 0, tR: 0, kL: 0, kR: 0 }),
  stalk: (ph, tw) => ({ hy: 1.5, tx: 0.3, nx: 0.05, hz: tw.z, hyw: tw.y, sLx: -0.25 + Math.sin(ph) * 0.1, sLz: 0.18, sRx: -0.25 - Math.sin(ph) * 0.1, sRz: -0.18, eL: -0.3, eR: -0.3, tL: -Math.sin(ph) * 0.4, tR: Math.sin(ph) * 0.4, kL: Math.max(0, Math.sin(ph)) * 0.5, kR: Math.max(0, -Math.sin(ph)) * 0.5 }),
  run: (ph, tw) => ({ hy: 1.55 + Math.abs(Math.sin(ph)) * 0.07, tx: 0.45, nx: -0.35, hz: tw.z * 0.6, hyw: 0, sLx: -1.15 + Math.sin(ph) * 0.4, sLz: 0.22, sRx: -1.15 - Math.sin(ph) * 0.4, sRz: -0.22, eL: -0.35, eR: -0.35, tL: -Math.sin(ph) * 0.85, tR: Math.sin(ph) * 0.85, kL: Math.max(0, Math.sin(ph)) * 1.2, kR: Math.max(0, -Math.sin(ph)) * 1.2 }),
  crawl: (ph, tw) => ({ hy: 0.74 + Math.abs(Math.sin(ph)) * 0.05, tx: 1.42, nx: -1.3, hz: tw.z * 0.5, hyw: 0, sLx: -1.9 + Math.sin(ph) * 0.55, sLz: 0.25, sRx: -1.9 - Math.sin(ph) * 0.55, sRz: -0.25, eL: 0.45, eR: 0.45, tL: 0.35 + Math.sin(ph) * 0.35, tR: 0.35 - Math.sin(ph) * 0.35, kL: 1.55, kR: 1.55 }),
  climb: (ph, tw) => ({ hy: 1.55, tx: -0.1, nx: -0.5, hz: tw.z * 0.4, hyw: 0, sLx: -2.75 + Math.sin(ph) * 0.35, sLz: 0.15, sRx: -2.75 - Math.sin(ph) * 0.35, sRz: -0.15, eL: -0.5 - Math.max(0, Math.sin(ph)) * 0.6, eR: -0.5 - Math.max(0, -Math.sin(ph)) * 0.6, tL: -0.7 - Math.sin(ph) * 0.45, tR: -0.7 + Math.sin(ph) * 0.45, kL: 1.0, kR: 1.0 }),
  lunge: (ph, tw) => ({ hy: 1.5, tx: 0.55, nx: -0.4, hz: tw.z, hyw: 0, sLx: -1.6, sLz: 0.45, sRx: -1.6, sRz: -0.45, eL: -0.2, eR: -0.2, tL: -0.3, tR: 0.5, kL: 0.4, kR: 0.2 })
};
function poseCreature(c, mode, ph, tw, dt) {
  const t = POSE[mode](ph, tw), k = 1 - Math.exp(-dt * 11), cu = c.cur;
  for (const key in t) cu[key] = cu[key] == null ? t[key] : cu[key] + (t[key] - cu[key]) * k;
  c.hips.position.y = cu.hy; c.torso.rotation.x = cu.tx; c.neck.rotation.x = cu.nx; c.head.rotation.z = cu.hz; c.head.rotation.y = cu.hyw;
  c.aL.sh.rotation.set(cu.sLx, 0, cu.sLz); c.aR.sh.rotation.set(cu.sRx, 0, cu.sRz); c.aL.el.rotation.x = cu.eL; c.aR.el.rotation.x = cu.eR;
  c.lL.hp.rotation.x = cu.tL; c.lR.hp.rotation.x = cu.tR; c.lL.kn.rotation.x = cu.kL; c.lR.kn.rotation.x = cu.kR;
  const now = performance.now() * 0.001;
  if (c.jaw) { const jt = mode === 'lunge' ? 0.8 : (mode === 'run' || mode === 'crawl') ? 0.5 + Math.sin(now * 9) * 0.08 : 0.26 + Math.sin(now * 1.3) * 0.07; c.jaw.rotation.x += (jt - c.jaw.rotation.x) * k; }
  if (c.fingers) c.fingers.forEach((f, i) => { const ft = mode === 'lunge' ? -0.15 : 0.3 + Math.sin(now * 2.2 + i * 0.7) * 0.18 + (Math.sin(now * 13 + i) > 0.97 ? 0.4 : 0); f.rotation.x += (ft - f.rotation.x) * k; });
  if (c.hair) c.hair.forEach((h, i) => { h.rotation.x += ((mode === 'run' ? -0.6 : mode === 'crawl' ? 0.9 : 0) + Math.sin(now * 1.7 + i) * 0.06 - h.rotation.x) * k * 0.5; });
}
function makeAnimal(type) {
  const g = new THREE.Group(), deer = type === 'deer', m = deer ? MAT.deer : MAT.wolf, body = new THREE.Group(); g.add(body);
  const bh = deer ? 1.05 : 0.62, ll = deer ? 0.52 : 0.33;
  sph(1, m, 0, bh, 0, body, deer ? 0.32 : 0.25, deer ? 0.36 : 0.27, deer ? 0.78 : 0.62);
  const neck = new THREE.Group(); neck.position.set(0, bh + (deer ? 0.15 : 0.05), deer ? 0.6 : 0.5); body.add(neck);
  if (deer) { const n = cyl(0.09, 0.13, 0.6, 8, m, 0, 0.25, 0.05, neck); n.rotation.x = 0.45; }
  const head = new THREE.Group(); head.position.set(0, deer ? 0.55 : 0.08, deer ? 0.22 : 0.12); neck.add(head);
  sph(1, m, 0, 0, 0, head, deer ? 0.1 : 0.14, deer ? 0.11 : 0.13, deer ? 0.2 : 0.17);
  const snout = sph(1, deer ? MAT.deer : MAT.wolf, 0, deer ? -0.03 : -0.03, deer ? 0.2 : 0.2, head, deer ? 0.06 : 0.07, deer ? 0.06 : 0.06, deer ? 0.11 : 0.14);
  if (!deer) { sph(1, MAT.bloodMuzzle, 0, -0.07, 0.26, head, 0.06, 0.03, 0.08); [-1, 1].forEach(sd => { sph(0.02, MAT.wolfEye, sd * 0.07, 0.04, 0.14, head); const e = mk(new THREE.ConeGeometry(0.045, 0.12, 4), m, sd * 0.07, 0.15, -0.02, head); }); }
  else { [-1, 1].forEach(sd => { const e = sph(1, m, sd * 0.09, 0.08, -0.04, head, 0.03, 0.08, 0.02); e.rotation.z = sd * 0.6; sph(0.015, MAT.black, sd * 0.07, 0.03, 0.08, head); }); if (rand() < 0.5) [-1, 1].forEach(sd => { const a = new THREE.Group(); a.position.set(sd * 0.05, 0.1, -0.02); a.rotation.z = sd * -0.4; head.add(a); cyl(0.012, 0.018, 0.4, 4, MAT.antler, 0, 0.2, 0, a); const b = cyl(0.01, 0.012, 0.2, 4, MAT.antler, 0, 0.28, 0.06, a); b.rotation.x = 0.8; const c = cyl(0.01, 0.012, 0.16, 4, MAT.antler, sd * 0.05, 0.35, 0, a); c.rotation.z = sd * -0.7; }); }
  const tail = cyl(deer ? 0.04 : 0.05, deer ? 0.03 : 0.025, deer ? 0.15 : 0.45, 5, deer ? MAT.paper : m, 0, bh + 0.08, deer ? -0.78 : -0.75, body); tail.rotation.x = deer ? -0.6 : -0.9;
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => { const hp = new THREE.Group(); hp.position.set(sx * (deer ? 0.15 : 0.12), bh - 0.08, sz * (deer ? 0.5 : 0.4)); body.add(hp); cyl(deer ? 0.045 : 0.045, deer ? 0.03 : 0.035, ll, 5, m, 0, -ll / 2, 0, hp); const kn = new THREE.Group(); kn.position.y = -ll; hp.add(kn); cyl(0.025, 0.02, ll, 5, m, 0, -ll / 2, 0, kn); sph(0.03, MAT.black, 0, -ll, 0.01, kn); return { hp, kn }; });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return { g, body, neck, head, legs, deer, bh };
}
// guns
function makePistol() { const g = new THREE.Group(); bx(0.035, 0.045, 0.2, MAT.gun, 0, 0.02, -0.05, g); bx(0.03, 0.1, 0.045, MAT.gun, 0, -0.045, 0.02, g).rotation.x = 0.25; const b = cyl(0.008, 0.008, 0.04, 6, MAT.black, 0, 0.025, -0.165, g); b.rotation.x = Math.PI / 2; bx(0.006, 0.01, 0.01, MAT.metal, 0, 0.05, -0.13, g); return g; }
function makeShotgun() { const g = new THREE.Group(); const b1 = cyl(0.014, 0.014, 0.62, 8, MAT.gun, 0, 0.02, -0.33, g); b1.rotation.x = Math.PI / 2; const b2 = cyl(0.013, 0.013, 0.5, 8, MAT.gun, 0, -0.01, -0.28, g); b2.rotation.x = Math.PI / 2; const pump = cyl(0.022, 0.022, 0.16, 8, MAT.gunwood, 0, -0.01, -0.3, g); pump.rotation.x = Math.PI / 2; bx(0.04, 0.06, 0.18, MAT.gun, 0, 0.005, 0.02, g); const st = bx(0.035, 0.08, 0.28, MAT.gunwood, 0, -0.03, 0.22, g); st.rotation.x = 0.15; return g; }
function makeFlareGun() { const g = new THREE.Group(); bx(0.045, 0.06, 0.16, MAT.orange, 0, 0.02, -0.04, g); const b = cyl(0.022, 0.022, 0.1, 10, MAT.orange, 0, 0.03, -0.15, g); b.rotation.x = Math.PI / 2; bx(0.035, 0.1, 0.045, MAT.orange, 0, -0.05, 0.03, g).rotation.x = 0.25; return g; }
function makeCan() { const g = new THREE.Group(); bx(0.34, 0.42, 0.17, MAT.red, 0, 0.21, 0, g); bx(0.06, 0.05, 0.14, MAT.red, 0.1, 0.45, 0, g); const sp = cyl(0.025, 0.03, 0.16, 6, MAT.metal, -0.12, 0.47, 0, g); sp.rotation.z = 0.6; bx(0.2, 0.03, 0.04, MAT.black, 0, 0.44, 0, g); return g; }
function makeAmmo() { const g = new THREE.Group(); bx(0.3, 0.16, 0.18, MAT.ammo, 0, 0.08, 0, g); return g; }


// ---------- more places & details ----------
// first-aid kit model
function makeMedkit() { const g = new THREE.Group(); bx(0.34, 0.2, 0.22, MSM({ color: 0xd8d4cc, roughness: 0.5 }), 0, 0.1, 0, g); const rm = MSM({ color: 0xb01010, roughness: 0.5 }); bx(0.16, 0.012, 0.05, rm, 0, 0.206, 0, g); bx(0.05, 0.012, 0.16, rm, 0, 0.206, 0, g); bx(0.12, 0.04, 0.005, rm, 0, 0.12, 0.112, g); bx(0.04, 0.12, 0.005, rm, 0, 0.12, 0.112, g); bx(0.12, 0.03, 0.02, MAT.black, 0, 0.22, 0, g); return g; }
// outhouse at the camp
{ const g = grp(9, -8, -0.4); bx(1.3, 2.3, 1.3, MAT.dwood, 0, 1.15, 0, g); const rf = bx(1.6, 0.08, 1.7, MAT.rust, 0, 2.4, 0, g); rf.rotation.x = 0.15; bx(0.7, 1.9, 0.05, MAT.wood, 0, 0.97, 0.67, g); bx(0.12, 0.12, 0.06, MAT.black, 0, 1.75, 0.7, g); BOX.push([9, -8, 0.75, 0.75]); }
// power poles with sagging wires from the generator up the trail to the tower
{
  const poles = []; for (let i = 2; i < POWER_PTS.length - 1; i += 4) { const a = POWER_PTS[i - 1], b = POWER_PTS[i], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, x = b.x - dz / l * 3.3, z = b.z + dx / l * 3.3; poles.push({ x, z, y: H(x, z), a: Math.atan2(dx, dz) }); }
  poles.unshift({ x: L.gen.x + 2.6, z: L.gen.z + 2.5, y: H(L.gen.x, L.gen.z), a: 0 }); poles.push({ x: T.x + 2.6, z: T.z + 6, y: H(T.x, T.z), a: 0 });
  const wm = new THREE.LineBasicMaterial({ color: 0x0c0c0c });
  poles.forEach((p, i) => { const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.a; scene.add(g); const t = cyl(0.11, 0.15, 7.5, 7, MAT.dwood, 0, 3.75, 0, g); t.rotation.z = (hash(i, 9) - 0.5) * 0.06; bx(1.6, 0.12, 0.12, MAT.dwood, 0, 7.0, 0, g); [-0.65, 0.65].forEach(x => cyl(0.04, 0.05, 0.14, 6, MSM({ color: 0x3a5a6a, roughness: 0.2 }), x, 7.12, 0, g)); addCol(p.x, p.z, 0.25); p.g = g; });
  for (let i = 1; i < poles.length; i++) for (const off of [-0.65, 0.65]) { const a = poles[i - 1], b = poles[i], pa = new THREE.Vector3(off, 7.18, 0).applyAxisAngle(V3(0, 1, 0), a.a).add(V3(a.x, a.y, a.z)), pb = new THREE.Vector3(off, 7.18, 0).applyAxisAngle(V3(0, 1, 0), b.a).add(V3(b.x, b.y, b.z)); const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; pts.push(new THREE.Vector3().lerpVectors(pa, pb, t).add(V3(0, -Math.sin(t * Math.PI) * 0.9, 0))); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wm)); }
}
// Jess & Marco's wrecked campsite
W.oldcamp = (() => {
  const c = L.oldcamp, g = grp(c.x, c.z, 0.6);
  const tent = mk(new THREE.ConeGeometry(1.7, 1.2, 4, 1, true), MSM({ color: 0x2e5a7a, roughness: 0.9, side: THREE.DoubleSide }), 0, 0.5, 0, g); tent.rotation.set(0.5, Math.PI / 4, 0.35);
  const flap = mk(new THREE.PlaneGeometry(1.4, 1.1), MSM({ color: 0x2e5a7a, roughness: 0.9, side: THREE.DoubleSide }), 1.4, 0.06, 0.8, g); flap.rotation.set(-Math.PI / 2, 0, 0.8);
  bx(0.8, 0.12, 1.9, MSM({ color: 0x8a2a1a, roughness: 1 }), -1.8, 0.06, 1.2, g); bx(0.45, 0.55, 0.3, MAT.cloth2, 1.6, 0.27, -1.5, g);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const st = mk(new THREE.DodecahedronGeometry(0.16, 0), MAT.rock, 3 + Math.cos(a) * 0.6, 0.08, 1.6 + Math.sin(a) * 0.6, g); }
  const lan = cyl(0.08, 0.1, 0.25, 8, MAT.rust, 2.4, 0.12, -0.4, g); lan.rotation.z = Math.PI / 2;
  [[0.5, 1.4, 0.7], [-0.6, -0.9, 0.5], [2.1, 0.4, 0.35]].forEach(([x, z, r]) => { const b = mk(new THREE.CircleGeometry(r, 16), MAT.blood, x, 0.03, z, g, false); b.rotation.x = -Math.PI / 2; b.material = MAT.blood.clone(); b.material.opacity = 0.9; });
  BOX.push([c.x, c.z, 1.1, 1.1]); return g;
})();
// Harlan's barn (doors hanging open)
W.barn = (() => {
  const b = L.barn, g = grp(b.x, b.z); const wm = MSM({ map: TX.wood, normalMap: NRM.wood, color: 0x7a3a2a, roughness: 0.9 });
  bx(10, 4.6, 0.25, wm, 0, 2.3, -4, g); bx(0.25, 4.6, 8, wm, -5, 2.3, 0, g); bx(0.25, 4.6, 8, wm, 5, 2.3, 0, g); bx(3.5, 4.6, 0.25, wm, -3.25, 2.3, 4, g); bx(3.5, 4.6, 0.25, wm, 3.25, 2.3, 4, g); bx(3, 1.3, 0.25, wm, 0, 3.95, 4, g);
  const r1 = bx(10.8, 0.15, 5.0, MAT.rust, 0, 5.6, -2.1, g); r1.rotation.x = 0.55; const r2 = bx(10.8, 0.15, 5.0, MAT.rust, 0, 5.6, 2.1, g); r2.rotation.x = -0.55;
  bx(9.8, 1.9, 0.2, wm, 0, 5.5, 3.9, g); bx(9.8, 1.9, 0.2, wm, 0, 5.5, -3.9, g);
  const d1 = bx(1.5, 3.2, 0.1, wm, -2.1, 1.6, 4.8, g); d1.rotation.y = 1.3; const d2 = bx(1.5, 3.2, 0.1, wm, 2.4, 1.6, 4.6, g); d2.rotation.y = -0.6;
  for (let i = 0; i < 6; i++) bx(1.1, 0.5, 0.6, MSM({ color: 0x9a8040, roughness: 1 }), -3.8 + (i % 2) * 1.2, 0.25 + Math.floor(i / 2) * 0.5, -3.2, g);
  bx(0.8, 0.5, 0.5, MSM({ color: 0x3a2e24, roughness: 0.8 }), 3.5, 0.25, -3, g); bx(0.7, 0.45, 0.45, MSM({ color: 0x2a3a4a, roughness: 0.8 }), 3.6, 0.72, -3, g);
  BOX.push([b.x, b.z - 4, 5, 0.15], [b.x - 5, b.z, 0.15, 4], [b.x + 5, b.z, 0.15, 4], [b.x - 3.25, b.z + 4, 1.75, 0.15], [b.x + 3.25, b.z + 4, 1.75, 0.15], [b.x - 3.2, b.z - 3.2, 1.3, 0.5]);
  return g;
})();
// hunting stand near the cabin
{ const s = L.stand, g = grp(s.x, s.z, 0.3); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const p = beam(V3(a * 1.1, 0, b * 1.1), V3(a * 0.9, 4.2, b * 0.9), 0.08, MAT.dwood, g); addCol(s.x + a * 1.1, s.z + b * 1.1, 0.2); }); bx(2.2, 0.12, 2.2, MAT.wood, 0, 4.2, 0, g); [[0, -1.05, 2.2, 0.08], [-1.05, 0, 0.08, 2.2], [1.05, 0, 0.08, 2.2]].forEach(([x, z, w, d]) => bx(w, 0.9, d, MAT.dwood, x, 4.7, z, g)); const rf = bx(2.5, 0.08, 2.5, MAT.rust, 0, 5.9, 0, g); rf.rotation.x = 0.12; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(0.04, 0.04, 1.7, 5, MAT.dwood, a * 1.0, 5.05, b * 1.0, g)); beam(V3(-0.3, 0, 1.9), V3(-0.3, 4.2, 1.1), 0.03, MAT.dwood, g); beam(V3(0.3, 0, 1.9), V3(0.3, 4.2, 1.1), 0.03, MAT.dwood, g); for (let y = 0.4; y < 4.2; y += 0.45) { const zz = lerp(1.9, 1.1, y / 4.2); const r = cyl(0.02, 0.02, 0.62, 4, MAT.dwood, 0, y, zz, g); r.rotation.z = Math.PI / 2; } }
// the Tall Man's footprints in the mud along the trail to the ranger station
{
  const pg = (() => { const parts = [new THREE.CircleGeometry(0.11, 12).scale(1, 1.9, 1)]; [-1, 0, 1].forEach(k => { const c = new THREE.CircleGeometry(0.025, 6).scale(1, 3.2, 1); c.rotateZ(-k * 0.35); c.translate(k * 0.06, 0.29, 0); parts.push(c); }); const m = merge(parts); m.rotateX(-Math.PI / 2); return m; })();
  const fm = MSM({ color: 0x140e08, roughness: 0.15, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2 });
  const pts = PRINT_PTS; let side = 1;
  for (let i = Math.floor(pts.length * 0.25); i < Math.floor(pts.length * 0.75); i++) { const a = pts[i], b = pts[i + 1]; if (!b) break; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz); for (let t = 0; t < l; t += 1.9) { side = -side; const x = a.x + dx * t / l - dz / l * 0.28 * side, z = a.z + dz * t / l + dx / l * 0.28 * side; const m = new THREE.Mesh(pg, fm); m.position.set(x, H(x, z) + 0.025, z); m.rotation.y = Math.atan2(-dx, -dz) + Math.PI; m.receiveShadow = true; scene.add(m); } }
}

// first person rig
W.rig = new THREE.Group(); camera.add(W.rig);
W.hand = new THREE.Group(); W.hand.position.set(-0.27, -0.27, -0.5); W.rig.add(W.hand);
{ const b = cyl(0.026, 0.022, 0.2, 10, MAT.metal, 0, 0, 0, W.hand); b.rotation.x = Math.PI / 2; const l = cyl(0.034, 0.03, 0.045, 10, MAT.metal, 0, 0, -0.11, W.hand); l.rotation.x = Math.PI / 2; W.lensMat = new THREE.MeshBasicMaterial({ color: 0x222222 }); const lens = mk(new THREE.CircleGeometry(0.028, 12), W.lensMat, 0, 0, -0.134, W.hand, false); lens.rotation.y = Math.PI; }
const flash = new THREE.SpotLight(0xffe6c4, 0, 50, 0.46, 0.6, 1.25); flash.position.set(-0.27, -0.25, -0.4); camera.add(flash); { const ft = new THREE.Object3D(); ft.position.set(-0.1, -0.2, -8); camera.add(ft); flash.target = ft; }
flash.castShadow = settings.shadows; flash.shadow.mapSize.set(1024, 1024); flash.shadow.camera.near = 0.3; flash.shadow.camera.far = 40; flash.shadow.bias = -0.0006;
W.gunHold = new THREE.Group(); W.gunHold.position.set(0.24, -0.25, -0.46); W.rig.add(W.gunHold);
W.fpGuns = { pistol: makePistol(), shotgun: makeShotgun(), flare: makeFlareGun() };
for (const k in W.fpGuns) { W.fpGuns[k].visible = false; W.gunHold.add(W.fpGuns[k]); }
W.fpGuns.shotgun.position.set(0.02, 0, 0.05);
W.fpCan = makeCan(); W.fpCan.position.set(-0.3, -0.62, -0.6); W.fpCan.rotation.y = 0.5; W.fpCan.visible = false; W.rig.add(W.fpCan);
W.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glint, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); W.muzzle.position.set(0, 0.025, -0.25); W.muzzle.scale.set(0.35, 0.35, 0.35); W.gunHold.add(W.muzzle);
W.muzzleL = new THREE.PointLight(0xffb060, 0, 14, 1.5); W.muzzleL.position.set(0.25, -0.2, -0.8); camera.add(W.muzzleL);
noCast(W.rig);

// helicopter
const heli = { g: new THREE.Group(), t: -1 };
{
  const g = heli.g; sph(1, MAT.heli, 0, 0, 0, g, 1.3, 1.2, 2.6); sph(0.9, MAT.glass, 0, 0.15, -1.6, g, 1.1, 0.9, 1.1);
  const tail = cyl(0.18, 0.35, 6, 8, MAT.heli, 0, 0.3, 4.8, g); tail.rotation.x = Math.PI / 2;
  heli.rot = new THREE.Group(); heli.rot.position.y = 1.5; g.add(heli.rot); bx(11, 0.05, 0.3, MAT.black, 0, 0, 0, heli.rot); bx(0.3, 0.05, 11, MAT.black, 0, 0, 0, heli.rot); cyl(0.12, 0.12, 0.4, 8, MAT.metal, 0, -0.2, 0, heli.rot);
  heli.trot = bx(0.06, 1.6, 0.15, MAT.black, 0.25, 0.5, 7.8, g);
  [-1, 1].forEach(sd => { const sk = cyl(0.05, 0.05, 4, 6, MAT.metal, sd * 1.1, -1.5, 0, g); sk.rotation.x = Math.PI / 2; cyl(0.04, 0.04, 0.5, 5, MAT.metal, sd * 1.0, -1.25, 1, g); cyl(0.04, 0.04, 0.5, 5, MAT.metal, sd * 1.0, -1.25, -1, g); });
  heli.spot = new THREE.SpotLight(0xffffff, 0, 90, 0.38, 0.4, 1); heli.spot.position.set(0, -1.2, -1.5); g.add(heli.spot); const st = new THREE.Object3D(); st.position.set(0, -30, -3); g.add(st); heli.spot.target = st;
  heli.ladder = new THREE.Group(); heli.ladder.position.set(0, -1.2, 0.6); g.add(heli.ladder);
  const LLEN = 13.5; [-0.22, 0.22].forEach(x => cyl(0.015, 0.015, LLEN, 4, MAT.rope, x, -LLEN / 2, 0, heli.ladder));
  for (let y = 0.4; y < LLEN; y += 0.4) { const r = cyl(0.02, 0.02, 0.46, 4, MAT.dwood, 0, -y, 0, heli.ladder); r.rotation.z = Math.PI / 2; }
  heli.LLEN = LLEN; heli.ladder.scale.y = 0.001; g.visible = false; scene.add(g);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
}

// flare
W.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glint, color: 0xff2a10, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W.flare.scale.set(5, 5, 5); W.flare.visible = false; scene.add(W.flare);
W.flareL = new THREE.PointLight(0xff3018, 0, 120, 1); scene.add(W.flareL);

// blood particles + pools
function makeParticles(color, n, size) { const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-999); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: true })); pts.frustumCulled = false; scene.add(pts); return { pts, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), n, i: 0 }; }
const BLOOD = makeParticles(0x7a0000, 500, 0.07), BLACKB = makeParticles(0x140303, 250, 0.08);
function spray(sys, x, y, z, n, sp, dirx = 0, diry = 0, dirz = 0) { for (let k = 0; k < n; k++) { const i = sys.i = (sys.i + 1) % sys.n; sys.pos[i * 3] = x; sys.pos[i * 3 + 1] = y; sys.pos[i * 3 + 2] = z; sys.vel[i * 3] = dirx * 2 + (rand() - 0.5) * sp; sys.vel[i * 3 + 1] = diry * 2 + rand() * sp * 0.8; sys.vel[i * 3 + 2] = dirz * 2 + (rand() - 0.5) * sp; sys.life[i] = 0.6 + rand() * 0.8; } }
function stepParticles(sys, dt) { const p = sys.pos, v = sys.vel; let any = false; for (let i = 0; i < sys.n; i++) { if (sys.life[i] <= 0) continue; any = true; sys.life[i] -= dt; v[i * 3 + 1] -= 9.8 * dt; p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt; const gy = p[i * 3 + 1] < TB.y + 5 ? TB.y + 0.02 : H(p[i * 3], p[i * 3 + 2]) + 0.02; if (p[i * 3 + 1] < gy) { p[i * 3 + 1] = gy; v[i * 3] *= 0.3; v[i * 3 + 1] = 0; v[i * 3 + 2] *= 0.3; } if (sys.life[i] <= 0) p[i * 3 + 1] = -999; } if (any) sys.pts.geometry.attributes.position.needsUpdate = true; }
const POOLS = []; { const pg = new THREE.CircleGeometry(1, 18); pg.rotateX(-Math.PI / 2); for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(pg, MAT.blood); m.visible = false; m.receiveShadow = true; scene.add(m); POOLS.push({ m, t: 0, max: 1, grow: 0 }); } }
let poolI = 0;
function bloodPool(x, z, size, grow, y) { const p = POOLS[poolI = (poolI + 1) % POOLS.length]; p.m.position.set(x + (rand() - 0.5) * 0.2, (y != null ? y : H(x, z)) + 0.03, z + (rand() - 0.5) * 0.2); p.m.rotation.y = rand() * 6; p.max = size; p.grow = grow; p.t = 0; p.m.scale.setScalar(grow ? 0.05 : size); p.m.visible = true; }
function stepPools(dt) { for (const p of POOLS) { if (!p.m.visible || !p.grow) continue; p.t += dt; const s = p.max * smooth(0, p.grow, p.t); p.m.scale.set(s, 1, s * 0.8); } }

// deer hung high in the branches (Harlan's hunting log warned about this)
W.hung = [[L.cabin.x + 15, L.cabin.z - 7, 0.4], [Gv.x - 22, Gv.z + 15, 2.2], [L.oldcamp.x - 9, L.oldcamp.z + 5, 1.2]].map(([x, z, ry], i) => {
  const g = grp(x, z, ry); cyl(0.22, 0.34, 9, 8, MAT.bark, 0, 4.5, 0, g); const br = cyl(0.07, 0.12, 3.2, 6, MAT.bark, 1.5, 5.6, 0, g); br.rotation.z = Math.PI / 2 - 0.1; addCol(x, z, 0.4);
  cyl(0.012, 0.012, 1.4, 4, MAT.rope, 2.4, 4.85, 0, g);
  const d = makeAnimal('deer'); scene.remove(d.g); g.add(d.g); d.g.position.set(2.4, 4.25, 0); d.g.rotation.set(Math.PI, 0, 0.15); d.legs.forEach((l, k) => { l.hp.rotation.x = (k < 2 ? 0.4 : -0.4); }); d.neck.rotation.x = 1.0;
  const p = mk(new THREE.CircleGeometry(0.9, 16), MAT.blood.clone(), 2.4, 0.03, 0.1, g, false); p.rotation.x = -Math.PI / 2; p.material.opacity = 0.85;
  return { g, x, z };
});
W.makeMedkit = makeMedkit;

// ================= CHAPTER 2: THE HELICOPTER + THE SWAMP =================
const SW = { x: 2000, z: 0 };
const SW_ISL = [{ x: 95, z: -10, r: 9, h: 0.4 }, { x: 110, z: -190, r: 15, h: 0.7 }, { x: -90, z: -20, r: 10, h: 0.45 }, { x: 16, z: -8, r: 10, h: 0.45 }, { x: -28, z: -62, r: 15, h: 0.6 }, { x: 34, z: -152, r: 13, h: 0.75 }, { x: -52, z: 12, r: 8, h: 0.4 }, { x: 62, z: -58, r: 9, h: 0.4 }, { x: -72, z: -112, r: 10, h: 0.5 }, { x: 90, z: -120, r: 8, h: 0.35 }, { x: 80, z: -166, r: 8, h: 0.4 }];
const SW_WALK = (() => { const a = { x: -16, z: -72 }, b = { x: 27, z: -143 }, pts = []; const n = 28; for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ x: a.x + (b.x - a.x) * t + Math.sin(t * 9) * 4 * Math.sin(t * Math.PI), z: a.z + (b.z - a.z) * t + Math.cos(t * 7) * 3 * Math.sin(t * Math.PI) }); } return pts; })();
function walkInfo(lx, lz) { let best = 99, bs = 0, acc = 0; for (let i = 1; i < SW_WALK.length; i++) { const a = SW_WALK[i - 1], b = SW_WALK[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, l = Math.sqrt(l2), t = clamp(((lx - a.x) * dx + (lz - a.z) * dz) / l2, 0, 1), d = Math.hypot(lx - a.x - dx * t, lz - a.z - dz * t); if (d < best) { best = d; bs = acc + t * l; } acc += l; } return { d: best, s: bs, len: acc }; }
function swampGround(lx, lz) {
  let h = (vnoise(lx * 0.045 + 300, lz * 0.045) - 0.62) * 2.6 + (vnoise(lx * 0.13, lz * 0.13 + 50) - 0.5) * 0.5;
  for (const i of SW_ISL) { const d = Math.hypot(lx - i.x, lz - i.z); if (d < i.r * 1.4) h = Math.max(h, i.h - smooth(i.r * 0.55, i.r * 1.4, d) * (i.h + 1.6) + (vnoise(lx * 0.3, lz * 0.3) - 0.5) * 0.15); }
  return Math.max(h, -0.95);
}
const SW_PLAT = []; // walkable decks and floors (local rects)
function swampH(x, z) { const lx = x - SW.x, lz = z - SW.z; let h = swampGround(lx, lz); for (const p of SW_PLAT) if (lx > p.x0 && lx < p.x1 && lz > p.z0 && lz < p.z1) h = Math.max(h, p.h); if (lz < -60 && lz > -155 && walkInfo(lx, lz).d < 0.95) return Math.max(h, 0.52); return h; }
W.swamp = new THREE.Group(); W.swamp.visible = false; scene.add(W.swamp);
{
  const SWG = W.swamp;
  // ground + still black water
  const gg = new THREE.PlaneGeometry(320, 340, 160, 170); gg.rotateX(-Math.PI / 2); gg.translate(SW.x, 0, SW.z - 60);
  const gp = gg.attributes.position, gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), h = swampGround(x - SW.x, z - SW.z); gp.setY(i, h); const wet = smooth(0.2, -0.4, h), k = 0.7 + vnoise(x * 0.2, z * 0.2) * 0.5; gc[i * 3] = k * lerp(0.95, 0.55, wet); gc[i * 3 + 1] = k * lerp(1.05, 0.6, wet); gc[i * 3 + 2] = k * lerp(0.75, 0.45, wet); }
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const gm = new THREE.Mesh(gg, MSM({ map: GROUND.map, normalMap: GROUND.nrm, color: 0x6e6a4a, vertexColors: true, roughness: 0.42 })); gm.receiveShadow = true; SWG.add(gm);
  const ripC = mkc(256), rg = ripC.getContext('2d'); rg.fillStyle = '#808080'; rg.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 22; W9(256, (ox, oy) => { const gr = rg.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); rg.fillStyle = gr; rg.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); }); }
  W.rippleN = normalTex(ripC, 2.5, [26, 26]);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(320, 340).rotateX(-Math.PI / 2), MSM({ color: 0x1a2112, roughness: 0.08, metalness: 0.12, envMapIntensity: 1.1, transparent: true, opacity: 0.94, normalMap: W.rippleN, normalScale: new THREE.Vector2(0.35, 0.35) })); water.position.set(SW.x, 0, SW.z - 60); SWG.add(water); W.swampWater = water;
  // bald cypress trees draped with moss
  const trunk = new THREE.LatheGeometry([[1.0, 0], [0.62, 0.35], [0.4, 1.1], [0.3, 3], [0.22, 7], [0.12, 11], [0.02, 12]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const mossParts = [], leafParts = [];
  for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.3, y = 6 + i * 0.9, L2 = 2.6 - i * 0.25; const br = new THREE.CylinderGeometry(0.05, 0.1, L2, 5); br.rotateZ(Math.PI / 2 - 0.25); br.translate(L2 / 2, y, 0); br.rotateY(an); mossParts.push(br);
    for (let k = 0; k < 9; k++) { const ml = 1.3 + ((i * 7 + k * 3) % 5) * 0.55, m = new THREE.CylinderGeometry(0.035, 0.004, ml, 3); const d = 0.35 + k * 0.26; m.translate(d, y - ml / 2 + d * 0.1, ((k % 3) - 1) * 0.08); m.rotateY(an); mossParts.push(m); }
    for (const roll of [0, Math.PI / 2]) { const p = new THREE.PlaneGeometry(L2 * 0.9, 1.0); p.translate(L2 * 0.5, 0, 0); p.rotateX(-Math.PI / 2 + roll); p.rotateZ(-0.15); p.rotateY(an); p.translate(0, y + 0.2, 0); leafParts.push(p); } }
  const mossGeo = merge(mossParts), leafGeo = merge(leafParts);
  const pos = []; for (let i = 0; i < 14000 && pos.length < 470; i++) { const lx = (rand() - 0.5) * 300, lz = -60 + (rand() - 0.5) * 320; if (Math.hypot(lx - 120, lz + 133) < 19 || Math.hypot(lx - 110, lz + 192) < 17 || Math.hypot(lx - 110, lz + 223) < 9 || Math.hypot(lx - 80, lz + 166) < 8 || Math.hypot(lx, lz) < 9 || Math.hypot(lx + 28, lz + 62) < 9 || Math.hypot(lx - 34, lz + 152) < 9) continue; if (lz < -55 && lz > -160 && walkInfo(lx, lz).d < 3) continue; pos.push([lx, lz, 0.7 + rand() * 0.7, rand() * 6]); }
  const mats = [MSM({ map: BARK.map, normalMap: BARK.nrm, color: 0x7a7266, roughness: 0.9 }), MSM({ color: 0x6a7258, roughness: 1 }), windify(MSM({ map: TX.branch, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, color: 0x9a8a5a }), 0.01, 4, 'cyp')];
  [trunk, mossGeo, leafGeo].forEach((geo, gi) => { const im = new THREE.InstancedMesh(geo, mats[gi], pos.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); pos.forEach(([lx, lz, sc, ry], i) => { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(V3(SW.x + lx, swampGround(lx, lz) - 0.3, SW.z + lz), q, V3(sc, sc, sc)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; im.castShadow = gi !== 1; im.receiveShadow = true; SWG.add(im); });
  pos.forEach(([lx, lz, sc]) => addCol(SW.x + lx, SW.z + lz, 0.55 * sc));
  // cypress knees poking out of the water around every trunk
  { const parts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28 + hash(k, 3), r = 1.3 + hash(k, 7) * 1.8, h = 0.5 + hash(3, k) * 0.7, c = new THREE.ConeGeometry(0.09 + hash(k, k) * 0.07, h, 6); c.translate(Math.cos(a) * r, h / 2 - 0.2, Math.sin(a) * r); parts.push(c); } const kg = merge(parts);
    const im = new THREE.InstancedMesh(kg, mats[0], pos.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); pos.forEach(([lx, lz, sc, ry], i) => { q.setFromAxisAngle(V3(0, 1, 0), ry); m4.compose(V3(SW.x + lx, Math.max(swampGround(lx, lz), -0.9), SW.z + lz), q, V3(sc, sc, sc)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; im.receiveShadow = true; SWG.add(im); }
  // cattails and tall reeds in the shallows
  { const stalks = [], heads = []; for (let k = 0; k < 6; k++) { const a = k * 1.1, r = 0.12 + hash(k, 2) * 0.25, h = 1.3 + hash(k, 5) * 0.8, x = Math.cos(a) * r, z = Math.sin(a) * r, lean = (hash(2, k) - 0.5) * 0.25;
      const st = new THREE.CylinderGeometry(0.008, 0.014, h, 4); st.translate(0, h / 2, 0); st.rotateZ(lean); st.translate(x, 0, z); stalks.push(st);
      if (k % 2 === 0) { const hd = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6); hd.translate(0, h - 0.12, 0); hd.rotateZ(lean); hd.translate(x, 0, z); heads.push(hd); }
      const bl = new THREE.PlaneGeometry(0.05, h * 0.9); bl.translate(0, h * 0.45, 0); bl.rotateY(a); bl.rotateZ(-lean * 1.5 + (k % 2 ? 0.2 : -0.2)); bl.translate(x, 0, z); stalks.push(bl); }
    const sg = merge(stalks), hg = merge(heads), spots = [];
    for (let i = 0; i < 9000 && spots.length < 900; i++) { const lx = (rand() - 0.5) * 300, lz = -60 + (rand() - 0.5) * 320, h = swampGround(lx, lz); if (h < -0.75 || h > 0.25) continue; if (lz < -55 && lz > -160 && walkInfo(lx, lz).d < 2) continue; if (Math.hypot(lx, lz) < 4) continue; spots.push([lx, lz, h]); }
    const sm = windify(MSM({ color: 0x5a6a34, roughness: 0.8, side: THREE.DoubleSide }), 0.05, 0.3, 'reed'), hm = windify(MSM({ color: 0x4a2e18, roughness: 0.9 }), 0.05, 0.3, 'reedh');
    [[sg, sm], [hg, hm]].forEach(([geo, mt]) => { const im = new THREE.InstancedMesh(geo, mt, spots.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); spots.forEach(([lx, lz, h], i) => { q.setFromAxisAngle(V3(0, 1, 0), rand() * 6.28); const sc = 0.7 + rand() * 0.6; m4.compose(V3(SW.x + lx, Math.max(h, -0.8) - 0.05, SW.z + lz), q, V3(sc, sc, sc)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; im.receiveShadow = true; SWG.add(im); });
  }
  // fallen trees half-sunk in the water, and dead snags
  for (let i = 0; i < 46; i++) { const lx = (rand() - 0.5) * 290, lz = -60 + (rand() - 0.5) * 300; if (lz < -55 && lz > -160 && walkInfo(lx, lz).d < 3) continue; const L3 = 6 + rand() * 7, t = cyl(0.22, 0.42, L3, 8, MAT.dead, SW.x + lx, Math.max(swampGround(lx, lz), -0.8) + 0.1, SW.z + lz, SWG); t.rotation.order = 'YXZ'; t.rotation.set(Math.PI / 2 - 0.12 - rand() * 0.15, rand() * 6.28, 0); }
  for (let i = 0; i < 40; i++) { const lx = (rand() - 0.5) * 290, lz = -60 + (rand() - 0.5) * 300; if (lz < -55 && lz > -160 && walkInfo(lx, lz).d < 3) continue; const h = 3 + rand() * 6, sn = cyl(0.06, 0.25, h, 6, MAT.dead, SW.x + lx, swampGround(lx, lz) + h / 2 - 0.3, SW.z + lz, SWG); sn.rotation.z = (rand() - 0.5) * 0.3; addCol(SW.x + lx, SW.z + lz, 0.25); }

  // lily pads, scum and floating logs
  { const lp = new THREE.CircleGeometry(0.28, 9, 0.3, Math.PI * 1.85); lp.rotateX(-Math.PI / 2); const pads = []; for (let i = 0; i < 2500 && pads.length < 520; i++) { const lx = (rand() - 0.5) * 300, lz = -60 + (rand() - 0.5) * 320, h = swampGround(lx, lz); if (h > -0.1 || h < -0.9) continue; const c = vnoise(lx * 0.08, lz * 0.08); if (c < 0.45) continue; pads.push([lx, lz]); }
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4).scale(1, 0.6, 1), MSM({ color: 0xf0e8f0, emissive: 0x302830, roughness: 0.5 }), pads.length); const fm4 = new THREE.Matrix4(); let nf = 0;
    const im = new THREE.InstancedMesh(lp, MSM({ color: 0x2c4a22, roughness: 0.4 }), pads.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); pads.forEach(([lx, lz], i) => { if (i % 7 === 0) { fm4.makeTranslation(SW.x + lx + 0.08, 0.05, SW.z + lz); fl.setMatrixAt(nf++, fm4); } q.setFromAxisAngle(V3(0, 1, 0), rand() * 6.28); const sc = 0.6 + rand() * 1.1; m4.compose(V3(SW.x + lx, 0.012, SW.z + lz), q, V3(sc, 1, sc)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; SWG.add(im); fl.count = nf; fl.frustumCulled = false; SWG.add(fl);
    const duck = MSM({ color: 0x3e5e22, roughness: 0.8, transparent: true, opacity: 0.85, depthWrite: false }); for (let i = 0; i < 90; i++) { const lx = (rand() - 0.5) * 290, lz = -60 + (rand() - 0.5) * 310, h = swampGround(lx, lz); if (h > -0.05 || h < -0.5) continue; const m = new THREE.Mesh(new THREE.CircleGeometry(1 + rand() * 2.5, 12).rotateX(-Math.PI / 2), duck); m.scale.z = 0.4 + rand() * 0.6; m.position.set(SW.x + lx, 0.01, SW.z + lz); m.rotation.y = rand() * 6; SWG.add(m); }
    const scum = MSM({ color: 0x2a3418, roughness: 0.7, transparent: true, opacity: 0.75, depthWrite: false }); for (let i = 0; i < 170; i++) { const lx = (rand() - 0.5) * 290, lz = -60 + (rand() - 0.5) * 310; if (swampGround(lx, lz) > -0.15) continue; const m = new THREE.Mesh(new THREE.CircleGeometry(1.5 + rand() * 3.5, 14).rotateX(-Math.PI / 2), scum); m.scale.z = 0.5 + rand() * 0.7; m.position.set(SW.x + lx, 0.008, SW.z + lz); m.rotation.y = rand() * 6; SWG.add(m); }
    for (let i = 0; i < 26; i++) { const lx = (rand() - 0.5) * 280, lz = -60 + (rand() - 0.5) * 300; if (swampGround(lx, lz) > -0.2) continue; const l = cyl(0.25, 0.3, 4 + rand() * 3, 8, MAT.dead, SW.x + lx, 0.05, SW.z + lz, SWG); l.rotation.set(0, rand() * 6, Math.PI / 2); }
  }
  // the boardwalk out of the swamp
  for (let i = 1; i < SW_WALK.length; i++) { const a = SW_WALK[i - 1], b = SW_WALK[i], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), an = Math.atan2(dx, dz);
    for (let t = 0; t < l; t += 0.55) { if (hash(i, t * 7) < 0.04) continue; const p = bx(1.7, 0.06, 0.42, MAT.dwood, SW.x + a.x + dx * t / l, 0.49, SW.z + a.z + dz * t / l, SWG); p.rotation.y = an + (hash(t, i) - 0.5) * 0.06; }
    for (const sd of [-0.8, 0.8]) { const px = SW.x + a.x - dz / l * sd, pz = SW.z + a.z + dx / l * sd; cyl(0.07, 0.08, 2.2, 6, MAT.dwood, px, -0.55, pz, SWG); if (i % 2) { const r = cyl(0.035, 0.035, l, 5, MAT.dwood, px + dx / 2, 1.05, pz + dz / 2, SWG); r.rotation.order = 'YXZ'; r.rotation.set(Math.PI / 2, an, 0); cyl(0.04, 0.04, 0.6, 5, MAT.dwood, px, 0.75, pz, SWG); } } }
  // crash site: the helicopter wreck burning on the island
  const CR = { x: SW.x - 28, z: SW.z - 62 }; const cy = swampGround(-28, -62); W.crash = CR;
  const wg = new THREE.Group(); wg.position.set(CR.x, cy, CR.z); SWG.add(wg);
  const body = sph(1, MSM({ color: 0x1c2420, roughness: 0.6, metalness: 0.5 }), 0, 0.7, 0, wg, 1.3, 1.15, 2.6); body.rotation.set(0.2, 0.6, 1.25);
  const tb = cyl(0.18, 0.32, 5, 8, MAT.heli, 5, 0.4, 4, wg); tb.rotation.set(0.3, 0.9, Math.PI / 2 - 0.2);
  const blade = bx(5.5, 0.05, 0.3, MAT.black, -3, 1.4, -2.5, wg); blade.rotation.set(0.2, 0.7, -0.6); const b2 = bx(4, 0.05, 0.3, MAT.black, 2, 0.3, -4, wg); b2.rotation.set(0.1, 2.1, 0.15);
  for (let i = 0; i < 14; i++) { const d = bx(0.2 + rand() * 0.6, 0.05 + rand() * 0.2, 0.2 + rand() * 0.5, i % 3 ? MAT.heli : MAT.metal, (rand() - 0.5) * 12, 0.1, (rand() - 0.5) * 12, wg); d.rotation.set(rand(), rand() * 6, rand()); }
  const helmet = sph(0.16, MSM({ color: 0xd8d8d0, roughness: 0.3 }), 3.5, 0.15, 2.5, wg, 1, 0.9, 1.1);
  for (let i = 0; i < 9; i++) { const b = mk(new THREE.CircleGeometry(0.35 + rand() * 0.3, 12).rotateX(-Math.PI / 2), MAT.blood, 3.5 + i * 0.9, 0.04, 2.8 + i * 0.6 + (rand() - 0.5) * 0.4, wg, false); }
  W.fireL = W.fireL; W.crashFire = new THREE.PointLight(0xff7a30, 0, 40, 1.4); W.crashFire.position.set(CR.x, cy + 2, CR.z); SWG.add(W.crashFire);
  const fm = new THREE.SpriteMaterial({ map: TX.glint, color: 0xff8a30, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  W.flames = []; for (let i = 0; i < 9; i++) { const f = new THREE.Sprite(fm); f.position.set(CR.x + (rand() - 0.5) * 2.5, cy + 0.6 + rand() * 1.2, CR.z + (rand() - 0.5) * 2.5); f.userData = { by: f.position.y, ph: rand() * 6 }; SWG.add(f); W.flames.push(f); }
  const smM = new THREE.SpriteMaterial({ map: TX.mist, color: 0x1a1a1a, transparent: true, opacity: 0.5, depthWrite: false });
  W.smoke = []; for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(smM); sp.userData = { t: i / 10 }; SWG.add(sp); W.smoke.push(sp); }
  BOX.push([CR.x, CR.z, 2.2, 2.2]);
  // the fishing shack at the end of the boardwalk
  const SH = { x: SW.x + 34, z: SW.z - 152 }; W.shack = SH; const sy = swampGround(34, -152); const sg = new THREE.Group(); sg.position.set(SH.x, sy, SH.z); SWG.add(sg);
  bx(4.4, 2.6, 4, MAT.dwood, 0, 1.5, -1, sg); const r1 = bx(5, 0.12, 2.6, MAT.rust, 0, 3.0, -2.0, sg); r1.rotation.x = 0.35; const r2 = bx(5, 0.12, 2.6, MAT.rust, 0, 3.0, 0, sg); r2.rotation.x = -0.35;
  bx(4.4, 0.12, 2, MAT.wood, 0, 0.25, 1.9, sg); [-2, 2].forEach(x => cyl(0.06, 0.06, 2.4, 5, MAT.dwood, x, 1.3, 2.8, sg)); bx(4.6, 0.1, 2.2, MAT.rust, 0, 2.5, 1.9, sg);
  W.shackDoor = bx(1, 2, 0.06, MAT.black, 0, 1.2, 1.02, sg);
  W.shackWin = MSM({ color: 0x000000, emissive: 0xffa040, emissiveIntensity: 0.9 }); bx(0.9, 0.7, 0.06, W.shackWin, 1.4, 1.6, 1.02, sg);
  W.shackL = new THREE.PointLight(0xffb060, 0, 18, 1.6); W.shackL.position.set(SH.x - 1.4, sy + 2.2, SH.z + 2.2); SWG.add(W.shackL);
  cyl(0.05, 0.07, 0.25, 8, MSM({ color: 0x222222, emissive: 0xffaa50, emissiveIntensity: 2 }), -1.4, 2.25, 2.4, sg);
  BOX.push([SH.x, SH.z - 1, 2.2, 2]);
}
// helicopter cabin you can walk around in
W.cabin = new THREE.Group(); W.cabin.position.set(1600, 150, -600); W.cabin.visible = false; scene.add(W.cabin);
{
  const c = W.cabin, hull = MSM({ color: 0x3a4236, roughness: 0.6, metalness: 0.4 }), fabric = MSM({ color: 0x4a5236, roughness: 1 }), glassM = MSM({ color: 0x1a2630, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.28, depthWrite: false });
  bx(2.6, 0.1, 6.6, MSM({ color: 0x2a2c2a, roughness: 0.8, metalness: 0.4 }), 0, -0.05, -0.6, c); bx(2.6, 0.1, 6.6, hull, 0, 2.1, -0.6, c);
  // left wall with windows
  bx(0.08, 0.9, 5.4, hull, -1.3, 0.45, 0, c); bx(0.08, 0.5, 5.4, hull, -1.3, 1.85, 0, c); [-2.6, -0.9, 0.9, 2.6].forEach(z => bx(0.08, 0.7, 0.25, hull, -1.3, 1.25, z, c)); bx(0.03, 0.7, 5.2, glassM, -1.3, 1.25, 0, c);
  // right wall: big sliding door hanging open
  bx(0.08, 2.1, 2.2, hull, 1.3, 1.05, 1.6, c); bx(0.08, 2.1, 1.7, hull, 1.3, 1.05, -1.95, c); bx(0.08, 0.15, 1.6, hull, 1.3, 2.0, -0.1, c);
  W.cabinDoor = bx(0.06, 1.9, 1.6, hull, 1.42, 1.0, 1.9, c);
  bx(2.6, 1.05, 0.08, hull, 0, 0.52, 2.7, c); bx(2.6, 0.45, 0.08, hull, 0, 1.88, 2.7, c); bx(0.8, 0.62, 0.08, hull, -0.9, 1.35, 2.7, c); bx(0.8, 0.62, 0.08, hull, 0.9, 1.35, 2.7, c); W.backGlass = bx(1.0, 0.62, 0.02, glassM, 0, 1.35, 2.7, c);
  for (let z = -1.8; z <= 2.0; z += 0.9) { bx(0.5, 0.08, 0.7, fabric, -1.0, 0.5, z, c); bx(0.08, 0.6, 0.7, fabric, -1.22, 0.85, z, c); }
  cyl(0.08, 0.08, 0.5, 10, MAT.red, 1.15, 0.3, 2.4, c); bx(0.3, 0.2, 0.08, MSM({ color: 0xd8d4cc }), -1.24, 1.6, 2.2, c);
  for (let i = 0; i < 5; i++) { const st = bx(0.04, 0.6, 0.04, MSM({ color: 0x6a6a30 }), -1.2, 1.7, -1.5 + i * 0.8, c); st.rotation.z = 0.2; }
  // cockpit
  bx(2.4, 0.7, 0.5, MSM({ color: 0x1a1c1e, roughness: 0.6 }), 0, 0.9, -3.4, c);
  const scr = MSM({ color: 0x000000, emissive: 0x40ff90, emissiveIntensity: 0.6 }), scr2 = MSM({ color: 0x000000, emissive: 0xffb040, emissiveIntensity: 0.6 }); W.cabinScreens = [scr, scr2];
  bx(0.4, 0.25, 0.02, scr, -0.6, 1.15, -3.14, c); bx(0.4, 0.25, 0.02, scr2, 0.1, 1.15, -3.14, c); bx(0.25, 0.25, 0.02, scr, 0.65, 1.15, -3.14, c);
  const ws = mk(new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI, 0, Math.PI / 2), glassM, 0, 0.9, -3.4, c, false); ws.rotation.y = Math.PI; ws.scale.set(0.9, 0.8, 0.8);
  [-0.6, 0.6].forEach(x => { bx(0.55, 0.1, 0.55, fabric, x, 0.45, -2.6, c); bx(0.55, 0.75, 0.1, fabric, x, 0.85, -2.3, c); });
  // the pilot
  const pil = new THREE.Group(); pil.position.set(-0.6, 0.5, -2.65); c.add(pil); W.pilot = pil;
  const suit = MSM({ color: 0x4a5a3a, roughness: 0.9 }); bx(0.4, 0.55, 0.25, suit, 0, 0.35, 0.05, pil); sph(0.11, MSM({ color: 0xc09070, roughness: 0.6 }), 0, 0.78, 0, pil); sph(0.13, MSM({ color: 0xe0e0d8, roughness: 0.3 }), 0, 0.83, 0.02, pil, 1, 0.95, 1.05); bx(0.2, 0.06, 0.05, MAT.black, 0, 0.78, -0.1, pil);
  [-1, 1].forEach(sd => { const a = cap(0.05, 0.35, suit, sd * 0.25, 0.35, -0.15, pil); a.rotation.x = 1.1; });
  W.cabinL = new THREE.PointLight(0x9ab4ff, 0, 7, 1.5); W.cabinL.position.set(0, 1.9, 0); c.add(W.cabinL);
  W.alarmL = new THREE.PointLight(0xff1a10, 0, 8, 1.5); W.alarmL.position.set(0, 1.9, -1); c.add(W.alarmL);
  c.traverse(o => { if (o.isMesh) o.castShadow = false; });
}

// ---------- Chapter 2 expansion: nest, blood trail, houseboat, stilt village, sunken church, pump station ----------
{
  const SWG = W.swamp, L2 = (x, z) => ({ x: SW.x + x, z: SW.z + z }), gy = (x, z) => swampGround(x, z);
  const plat = (x0, x1, z0, z1, h) => SW_PLAT.push({ x0, x1, z0, z1, h });
  const boxW = (x, z, hw, hd) => BOX.push([SW.x + x, SW.z + z, hw, hd]);
  const bone = MSM({ color: 0xd8d0bc, roughness: 0.6 }), bloodM = MAT.blood;
  // the nest where the pilot was dragged
  W.nest = L2(-90, -20);
  { const g = new THREE.Group(); g.position.set(W.nest.x, gy(-90, -20), W.nest.z); SWG.add(g);
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + rand() * 0.2, r = 2.6 + rand() * 0.8, b = cyl(0.06 + rand() * 0.06, 0.08, 2.5 + rand() * 1.5, 5, MAT.dead, Math.cos(a) * r, 0.25 + rand() * 0.4, Math.sin(a) * r, g); b.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.6, a + Math.PI / 2 + (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4); }
    for (let i = 0; i < 18; i++) { const b = cyl(0.025, 0.03, 0.25 + rand() * 0.35, 5, bone, (rand() - 0.5) * 3.6, 0.06, (rand() - 0.5) * 3.6, g); b.rotation.set(Math.PI / 2, rand() * 6, 0); }
    for (let i = 0; i < 6; i++) sph(0.06, bone, (rand() - 0.5) * 3, 0.05, (rand() - 0.5) * 3, g, 1.3, 0.8, 1);
    sph(0.14, bone, 1.2, 0.12, -0.8, g, 0.8, 0.7, 1.5); [-1, 1].forEach(sd => { const an = cyl(0.015, 0.02, 0.5, 4, MAT.antler, 1.2 + sd * 0.12, 0.35, -1.0, g); an.rotation.z = sd * 0.5; });
    bx(0.6, 0.06, 0.45, MSM({ color: 0x4a5a3a, roughness: 1 }), -0.8, 0.05, 0.6, g).rotation.y = 0.7;
    sph(0.15, MSM({ color: 0xd8d8d0, roughness: 0.3 }), 0.4, 0.13, 1.3, g, 1, 0.9, 1.1);
    [[0, 0, 1.2], [1.6, 0.8, 0.6], [-1.2, -1.1, 0.7]].forEach(([x, z, r]) => { mk(new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2), bloodM, x, 0.03, z, g, false); });
    W.radioItem = new THREE.Group(); W.radioItem.position.set(-0.4, 0.12, -0.2); g.add(W.radioItem); bx(0.12, 0.22, 0.06, MSM({ color: 0x2a2a28, roughness: 0.5 }), 0, 0, 0, W.radioItem); cyl(0.008, 0.008, 0.18, 4, MAT.black, 0.04, 0.2, 0, W.radioItem); mk(new THREE.SphereGeometry(0.012, 6, 4), MSM({ color: 0x220000, emissive: 0xff2010, emissiveIntensity: 2 }), -0.03, 0.08, 0.032, W.radioItem, false);
    W.radioItem.userData.gl = glint(W.nest.x - 0.4, g.position.y + 0.6, W.nest.z - 0.2);
  }
  // blood trail from the wreck to the nest
  { const a = { x: -24, z: -58 }, b = { x: -88, z: -21 }, n = 30; for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(a.x, b.x, t) + Math.sin(t * 11) * 2.5, z = lerp(a.z, b.z, t) + Math.cos(t * 7) * 2; for (let k = 0; k < 2; k++) { const px = x + (rand() - 0.5) * 0.8, pz = z + (rand() - 0.5) * 0.8, m = new THREE.Mesh(new THREE.CircleGeometry(0.18 + rand() * 0.28, 10).rotateX(-Math.PI / 2), bloodM); m.scale.z = 0.5 + rand(); m.rotation.y = rand() * 6; m.position.set(SW.x + px, Math.max(gy(px, pz), 0) + 0.025, SW.z + pz); SWG.add(m); } } }
  // abandoned houseboat beached on an island to the east
  W.houseboat = L2(95, -10);
  { const g = new THREE.Group(); g.position.set(W.houseboat.x, 0, W.houseboat.z); SWG.add(g); const paint = MSM({ map: TX.wood, normalMap: NRM.wood, color: 0x6a8a8a, roughness: 0.85 });
    bx(9, 1.0, 3.8, MAT.rust, 0, 0.45, 0, g); bx(9.2, 0.08, 4, MAT.wood, 0, 0.98, 0, g);
    bx(5, 2.2, 0.1, paint, -0.5, 2.1, -1.45, g); bx(5, 2.2, 0.1, paint, -0.5, 2.1, 1.45, g); bx(0.1, 2.2, 3, paint, -3, 2.1, 0, g); bx(0.1, 2.2, 0.95, paint, 2, 2.1, -1.0, g); bx(0.1, 2.2, 0.95, paint, 2, 2.1, 1.0, g); bx(0.1, 0.5, 1.1, paint, 2, 2.95, 0, g);
    const rf = bx(5.6, 0.1, 3.6, MAT.rust, -0.5, 3.25, 0, g); rf.rotation.z = 0.04; bx(0.9, 0.6, 0.05, MAT.glass, -0.5, 2.3, 1.48, g); bx(0.9, 0.6, 0.05, MAT.glass, -0.5, 2.3, -1.48, g);
    bx(1.2, 0.08, 2.4, MAT.wood, 5.1, 0.55, 0, g).rotation.z = -0.45; bx(1.4, 0.7, 0.8, MSM({ color: 0x5a4a3a }), -2.2, 1.35, -0.9, g);
    plat(95 - 4.5, 95 + 4.5, -10 - 1.9, -10 + 1.9, 1.0); plat(95 + 4.5, 95 + 5.8, -11, -9, 0.6);
    boxW(94.5, -11.45, 2.5, 0.08); boxW(94.5, -8.55, 2.5, 0.08); boxW(92, -10, 0.08, 1.5); boxW(97, -11.0, 0.08, 0.48); boxW(97, -9.0, 0.08, 0.48);
  }
  // flooded stilt village to the south-west
  W.village = L2(-95, -165);
  { const V = [[0, 0, 0], [12, -6, 0.4], [4, 11, -0.3]], fl = 1.5;
    V.forEach(([ox, oz, ry], i) => { const g = new THREE.Group(); g.position.set(W.village.x + ox, 0, W.village.z + oz); SWG.add(g);
      [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => cyl(0.1, 0.12, 3, 6, MAT.dwood, a, 0, b, g));
      bx(4.4, 0.12, 4.4, MAT.wood, 0, fl, 0, g); bx(4.2, 2.2, 0.1, MAT.dwood, 0, fl + 1.1, -2.1, g); bx(0.1, 2.2, 4.2, MAT.dwood, -2.1, fl + 1.1, 0, g); bx(0.1, 2.2, 4.2, MAT.dwood, 2.1, fl + 1.1, 0, g); bx(1.4, 2.2, 0.1, MAT.dwood, -1.4, fl + 1.1, 2.1, g); bx(1.4, 2.2, 0.1, MAT.dwood, 1.4, fl + 1.1, 2.1, g);
      const r1 = bx(4.8, 0.1, 2.6, MAT.rust, 0, fl + 2.55, -1.1, g); r1.rotation.x = 0.35; const r2 = bx(4.8, 0.1, 2.6, MAT.rust, 0, fl + 2.55, 1.1, g); r2.rotation.x = -0.35;
      const cx = 0 - 95 + ox, cz = -165 + oz; plat(cx - 2.2, cx + 2.2, cz - 2.2, cz + 2.2, fl);
      boxW(cx, cz - 2.1, 2.1, 0.08); boxW(cx - 2.1, cz, 0.08, 2.1); boxW(cx + 2.1, cz, 0.08, 2.1); boxW(cx - 1.4, cz + 2.1, 0.7, 0.08); boxW(cx + 1.4, cz + 2.1, 0.7, 0.08);
      for (let k = 0; k < 4; k++) { const sx = cx, sz = cz + 2.6 + k * 0.9, h = fl - 0.38 * (k + 1); plat(sx - 0.7, sx + 0.7, sz - 0.45, sz + 0.45, h); bx(1.4, 0.08, 0.85, MAT.wood, ox, h, oz + 2.6 + k * 0.9, g.parent === SWG ? new THREE.Group() : g); const st = bx(1.4, 0.08, 0.85, MAT.wood, W.village.x + sx + 95, h, W.village.z + sz + 165, SWG); }
    });
    const walk = (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz); for (let t = 0; t < l; t += 0.5) { const x = x0 + dx * t / l, z = z0 + dz * t / l; const p = bx(1.3, 0.06, 0.4, MAT.dwood, SW.x + x, fl - 0.04, SW.z + z, SWG); p.rotation.y = Math.atan2(dx, dz); plat(x - 0.65, x + 0.65, z - 0.65, z + 0.65, fl); } };
    walk(-95 + 2.2, -165, -95 + 12 - 2.2, -165 - 6); walk(-95, -165 + 2.2, -95 + 4, -165 + 11 - 2.2);
  }
  // sunken church steeple
  W.church = L2(70, -95);
  { const g = new THREE.Group(); g.position.set(W.church.x, -2.5, W.church.z); g.rotation.set(0.12, 0.6, 0.2); SWG.add(g); bx(3.2, 9, 3.2, MAT.stone, 0, 4.5, 0, g); const sp = mk(new THREE.ConeGeometry(2.4, 5, 4), MAT.rust, 0, 11.5, 0, g); sp.rotation.y = Math.PI / 4; bx(0.15, 1.6, 0.15, MAT.dwood, 0, 14.8, 0, g); bx(0.9, 0.15, 0.15, MAT.dwood, 0, 15.1, 0, g); [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(a => { const w = bx(0.9, 1.8, 0.05, MAT.black, Math.sin(a) * 1.62, 7, Math.cos(a) * 1.62, g); w.rotation.y = a; }); sph(0.45, MSM({ color: 0x6a5a30, metalness: 0.8, roughness: 0.35 }), 0, 6.6, 0, g, 1, 1.1, 1); addCol(W.church.x, W.church.z, 2.4); }
  // the old pump station
  W.pump = L2(110, -190);
  { const g = new THREE.Group(); g.position.set(W.pump.x, gy(110, -190), W.pump.z); SWG.add(g);
    bx(6, 4.5, 5, MAT.conc, 0, 2.25, 0, g); bx(6.4, 0.3, 5.4, MAT.conc, 0, 4.6, 0, g); bx(1.3, 2.3, 0.08, MAT.rust, 0, 1.15, 2.52, g); bx(1.6, 0.9, 0.05, MAT.warn, 0, 3.4, 2.53, g);
    for (let i = 0; i < 3; i++) { const pp = cyl(0.45, 0.45, 9, 12, MAT.rust, -2 + i * 2, 0.6, -6.5, g); pp.rotation.x = Math.PI / 2; }
    W.pumpGen = { x: W.pump.x - 4.5, z: W.pump.z + 3.5 }; bx(1.4, 0.9, 0.9, MAT.yellow, -4.5, 0.45, 3.5, g); const tk = cyl(0.3, 0.3, 1.2, 10, MAT.yellow, -4.5, 1.1, 3.5, g); tk.rotation.z = Math.PI / 2;
    beam(V3(4.5, 0, 4.5), V3(4.5, 7.5, 4.5), 0.09, MAT.metal, g); bx(1.6, 0.4, 0.4, MAT.metal, 4.5, 7.5, 4.5, g); W.pumpLampM = MSM({ color: 0x222222, emissive: 0x000000 }); bx(1.4, 0.3, 0.05, W.pumpLampM, 4.5, 7.5, 4.72, g);
    W.pumpL = new THREE.SpotLight(0xe8f0ff, 0, 80, 0.8, 0.5, 1); W.pumpL.position.set(4.5, 7.4, 4.8); g.add(W.pumpL); const tg = new THREE.Object3D(); tg.position.set(-2, 0, 18); g.add(tg); W.pumpL.target = tg;
    const horn = mk(new THREE.ConeGeometry(0.3, 0.6, 10, 1, true), MAT.metal, 4.5, 6.6, 4.4, g); horn.rotation.x = -Math.PI / 2;
    boxW(110, -190, 3.1, 2.6); boxW(110 - 4.5, -190 + 3.5, 0.7, 0.45);
    for (let a = 0; a < 6.28; a += 0.28) { if (Math.abs(wrapA(a - 1.6)) < 0.35) continue; cyl(0.03, 0.03, 1.4, 4, MAT.metal, Math.cos(a) * 11, 0.7, Math.sin(a) * 11, g).castShadow = false; }
  }
}

// the old water tower over the swamp — the Hollow One waits on top of it
{
  const tw = { x: SW.x + 80, z: SW.z - 166 }; W.wtower = tw; const g = new THREE.Group(); g.position.set(tw.x, swampGround(80, -166), tw.z); W.swamp.add(g);
  const LEGH = 26, sp = 3.2;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { beam(new THREE.Vector3(a * sp, -1, b * sp), new THREE.Vector3(a * 1.9, LEGH, b * 1.9), 0.16, MAT.rust, g); addCol(tw.x + a * sp, tw.z + b * sp, 0.4); });
  for (let y = 3; y < LEGH; y += 5.5) { const k = 1 - y / LEGH * 0.41, r = sp * k; [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([a, b, c, d]) => { beam(new THREE.Vector3(a * r, y, b * r), new THREE.Vector3(c * r, y, d * r), 0.06, MAT.rust, g); beam(new THREE.Vector3(a * r, y, b * r), new THREE.Vector3(c * (sp * (1 - (y + 5.5) / LEGH * 0.41)), Math.min(LEGH, y + 5.5), d * (sp * (1 - (y + 5.5) / LEGH * 0.41))), 0.04, MAT.rust, g); }); }
  const tank = cyl(3.6, 3.6, 7, 20, MAT.rust, 0, LEGH + 4.6, 0, g); const roof = mk(new THREE.ConeGeometry(3.8, 2.4, 20), MAT.rust, 0, LEGH + 9.3, 0, g);
  const deck = cyl(4.6, 4.6, 0.15, 24, MAT.metal, 0, LEGH + 1.0, 0, g); cyl(2.2, 2.2, 1.2, 12, MAT.rust, 0, LEGH + 0.4, 0, g);
  for (let a = 0; a < 6.28; a += 0.26) cyl(0.03, 0.03, 1.1, 4, MAT.metal, Math.cos(a) * 4.5, LEGH + 1.6, Math.sin(a) * 4.5, g).castShadow = false;
  const rail = mk(new THREE.TorusGeometry(4.5, 0.04, 4, 40), MAT.metal, 0, LEGH + 2.1, 0, g); rail.rotation.x = Math.PI / 2;
  for (let y = 0; y < LEGH + 1; y += 0.45) bx(0.6, 0.04, 0.04, MAT.metal, 0, y, 2.2 + (1 - y / LEGH) * 1.2 - 0.1, g).castShadow = false;
  const words = ctex(512, 128, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.font = 'bold 74px Oswald, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(210,200,180,.55)'; c.fillText('BAYOU NOIR', w / 2, 92); });
  const wm = new THREE.Mesh(new THREE.CylinderGeometry(3.62, 3.62, 1.6, 24, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: words, transparent: true, roughness: 0.9 })); wm.position.set(0, LEGH + 5, 0); g.add(wm);
  W.wtLampM = new THREE.MeshBasicMaterial({ color: 0x400000 }); W.wtLamp = mk(new THREE.SphereGeometry(0.25, 8, 6), W.wtLampM, 0, LEGH + 10.6, 0, g); W.wtLampL = new THREE.PointLight(0xff2010, 0, 30, 2); W.wtLampL.position.set(0, LEGH + 10.8, 0); g.add(W.wtLampL);
  W.wtTop = LEGH + 1.08; W.wtG = g;
}
