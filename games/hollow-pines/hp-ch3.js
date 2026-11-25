'use strict';
/* Hollow Pines — Chapter 3: the flare, the flight to the city, the drive home, and the night in your own house
   with the Grinner (FNAF 4 style: listen at the doors, hold them shut, check the halls, the closet and the bed). */
const CX = -3000, HX = -3000, HZ = 1400;            // city centre, and the bedroom (its own sealed set)
const START3 = () => ({ x: W.wtower.x + 40, z: W.wtower.z + 70 });
const HELIPAD = { x: CX + 236, z: 8 }, CAR0 = { x: CX + 226, z: 22, yaw: Math.PI / 2 }, HOME = { x: CX - 252, z: 146 };
const CITYBOX = [], CITYL = [];
let FLG = null; // where the flare gun lies
const CAR = { g: null, x: 0, z: 0, yaw: 0, v: 0, steer: 0, on: false };
const GR = { state: 'away', t: 0, side: 0, closet: 0, bed: 0, heldL: 0, heldR: 0, heldC: 0, at: null, hour: 0 };

// ---------- the city ----------
const CITY = new THREE.Group(); CITY.visible = false; scene.add(CITY);
{
  const winTx = ctex(256, 512, (c, w, h) => { c.fillStyle = '#16181c'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 6; x++) { const lit = rand() < 0.38; c.fillStyle = lit ? ['#ffd890', '#ffe8b0', '#c8e0ff', '#ffb870'][Math.floor(rand() * 4)] : '#0b0d10'; c.fillRect(8 + x * 41, 8 + y * 31, 30, 20); } });
  const winE = ctex(256, 512, (c, w, h) => { c.drawImage(winTx.image, 0, 0); }); winTx.wrapS = winTx.wrapT = winE.wrapS = winE.wrapT = THREE.RepeatWrapping;
  const bMat = [0x5a5e66, 0x6a645c, 0x4a4e56, 0x7a7068].map(col => MSM({ map: winTx, emissiveMap: winE, emissive: 0xffffff, emissiveIntensity: 0.9, color: col, roughness: 0.75 }));
  const parts = [[], [], [], []];
  for (let bxi = -4; bxi <= 3; bxi++) for (let bzi = -3; bzi <= 3; bzi++) {
    const x0 = CX + bxi * 70 + 7, z0 = bzi * 70 + 7, S = 56; // a city block between the roads
    const suburb = bxi <= -3 && bzi >= 1; if (suburb) continue;
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) { const w = 14 + rand() * 18, d = 14 + rand() * 18, hgt = 12 + rand() * (Math.abs(bxi) < 2 && Math.abs(bzi) < 2 ? 70 : 30), x = x0 + 4 + rand() * (S - w - 8) + w / 2, z = z0 + 4 + rand() * (S - d - 8) + d / 2;
      const g = new THREE.BoxGeometry(w, hgt, d); const uv = g.attributes.uv, nm = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const side = Math.abs(nm.getX(i)) > 0.5 ? d : w; uv.setXY(i, uv.getX(i) * side / 12, uv.getY(i) * hgt / 18); }
      g.translate(x, hgt / 2, z); parts[k % 4].push(g); CITYBOX.push([x, z, w / 2, d / 2]); }
  }
  parts.forEach((p, i) => { if (p.length) { const m = new THREE.Mesh(merge(p), bMat[i]); m.receiveShadow = true; CITY.add(m); } });
  // roads, sidewalks, lane lines
  const asphalt = MSM({ color: 0x1c1d20, roughness: 0.6, metalness: 0.1 }), walk = MSM({ color: 0x55534e, roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 600).rotateX(-Math.PI / 2), walk); ground.position.set(CX - 20, 0, 0); CITY.add(ground);
  for (let k = -4; k <= 4; k++) { const r1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 600).rotateX(-Math.PI / 2), asphalt); r1.position.set(CX + k * 70, 0.02, 0); CITY.add(r1); const r2 = new THREE.Mesh(new THREE.PlaneGeometry(700, 14).rotateX(-Math.PI / 2), asphalt); r2.position.set(CX - 20, 0.021, k * 70); CITY.add(r2); }
  const lane = []; for (let k = -4; k <= 4; k++) for (let s = -290; s < 290; s += 9) { const a = new THREE.PlaneGeometry(0.25, 4).rotateX(-Math.PI / 2); a.translate(CX + k * 70, 0.03, s); lane.push(a); const b = new THREE.PlaneGeometry(4, 0.25).rotateX(-Math.PI / 2); b.translate(CX - 20 + s, 0.031, k * 70); lane.push(b); }
  CITY.add(new THREE.Mesh(merge(lane), new THREE.MeshBasicMaterial({ color: 0xc8b860 })));
  // street lights (glowing bulbs; a few real lights follow you around)
  const poles = [], bulbs = []; for (let k = -4; k <= 4; k++) for (let s = -280; s <= 280; s += 35) { [[CX + k * 70 + 7.6, s], [CX - 20 + s, k * 70 + 7.6]].forEach(([x, z]) => { const p = new THREE.CylinderGeometry(0.1, 0.14, 7, 6); p.translate(x, 3.5, z); poles.push(p); const b = new THREE.SphereGeometry(0.32, 8, 6); b.translate(x, 7, z); bulbs.push(b); CITYL.push([x, z]); }); }
  CITY.add(new THREE.Mesh(merge(poles), MAT.metal)); CITY.add(new THREE.Mesh(merge(bulbs), new THREE.MeshBasicMaterial({ color: 0xffdca0 })));
  CITY.lights = []; for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xffc888, 0, 26, 1.5); CITY.add(l); CITY.lights.push(l); }
  // parked cars
  const carCols = [0x7a1a18, 0x1c2a4a, 0x2a2a2a, 0xb8b8b0, 0x3a4a2a];
  for (let i = 0; i < 70; i++) { const k = Math.floor(rand() * 9) - 4, s = (rand() - 0.5) * 520, ns = rand() < 0.5; const x = ns ? CX + k * 70 + 5.4 : CX - 20 + s, z = ns ? s : k * 70 + 5.4; if (Math.hypot(x - HELIPAD.x, z - HELIPAD.z) < 30) continue; const c = makeCarBody(carCols[i % 5]); c.position.set(x, 0, z); c.rotation.y = ns ? 0 : Math.PI / 2; CITY.add(c); CITYBOX.push([x, z, ns ? 1 : 2.2, ns ? 2.2 : 1]); }
  // heliport pad and lot
  { const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32).rotateX(-Math.PI / 2), MSM({ color: 0x2a2a2e })); pad.position.set(HELIPAD.x, 0.04, HELIPAD.z); CITY.add(pad); const hm = ctex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#e8e8e8'; c.lineWidth = 14; c.beginPath(); c.arc(128, 128, 110, 0, 7); c.stroke(); c.fillStyle = '#e8e8e8'; c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.fillText('H', 128, 180); }); const hp2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: hm, transparent: true })); hp2.position.set(HELIPAD.x, 0.05, HELIPAD.z); CITY.add(hp2); }
  // the suburb and your house
  const sid = MSM({ map: TX.wood, color: 0x8a8a90, roughness: 0.8 }), roofM = MSM({ color: 0x2a2224, roughness: 0.9 });
  [[HOME.x, HOME.z, true], [HOME.x + 30, HOME.z, false], [HOME.x - 30, HOME.z, false], [HOME.x, HOME.z + 40, false], [HOME.x + 30, HOME.z + 40, false]].forEach(([x, z, mine]) => {
    const h = new THREE.Group(); h.position.set(x, 0, z + 14); CITY.add(h); bx(14, 6, 10, mine ? sid : MSM({ color: [0x6a7a6a, 0x7a6a5a, 0x5a6a7a][Math.floor(rand() * 3)], roughness: 0.85 }), 0, 3, 0, h);
    const roof = mk(new THREE.ConeGeometry(10.4, 4, 4), roofM, 0, 8, 0, h); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.72);
    bx(1.2, 2.2, 0.1, MSM({ color: 0x3a2a1e }), 0, 1.1, -5.05, h); [-4, 4].forEach(dx => bx(1.6, 1.3, 0.08, MSM({ color: 0x000000, emissive: mine ? 0x000000 : 0xffc070, emissiveIntensity: 0.8 }), dx, 3.2, -5.05, h));
    if (mine) { CITY.porch = new THREE.PointLight(0xffd090, 0, 10, 1.5); CITY.porch.position.set(x, 2.8, z + 8.2); CITY.add(CITY.porch); const dw = new THREE.Mesh(new THREE.PlaneGeometry(5, 9).rotateX(-Math.PI / 2), asphalt); dw.position.set(x + 4.5, 0.03, z + 4.5); CITY.add(dw); }
    CITYBOX.push([x, z + 14, 7.2, 5.2]);
  });
  CITY.traverse(o => { if (o.isMesh) o.castShadow = false; });
}
function makeCarBody(col) { const g = new THREE.Group(), pm = MSM({ color: col, roughness: 0.35, metalness: 0.5 }), gl = MSM({ color: 0x0a0c10, roughness: 0.1, metalness: 0.6 }); bx(1.9, 0.7, 4.4, pm, 0, 0.6, 0, g); bx(1.7, 0.6, 2.2, gl, 0, 1.2, -0.2, g); [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]].forEach(([x, z]) => { const w = cyl(0.36, 0.36, 0.26, 12, MAT.black, x, 0.36, z, g); w.rotation.z = Math.PI / 2; }); bx(0.4, 0.15, 0.05, MSM({ color: 0xffffff, emissive: 0xfff0c0, emissiveIntensity: 0.6 }), -0.6, 0.65, 2.21, g); bx(0.4, 0.15, 0.05, MSM({ color: 0xffffff, emissive: 0xfff0c0, emissiveIntensity: 0.6 }), 0.6, 0.65, 2.21, g); bx(0.35, 0.12, 0.05, MSM({ color: 0x400000, emissive: 0xff1010, emissiveIntensity: 0.6 }), -0.65, 0.7, -2.21, g); bx(0.35, 0.12, 0.05, MSM({ color: 0x400000, emissive: 0xff1010, emissiveIntensity: 0.6 }), 0.65, 0.7, -2.21, g); return g; }
function cityCollide(x, z, r) { for (const b of CITYBOX) { if (x > b[0] - b[2] - r && x < b[0] + b[2] + r && z > b[1] - b[3] - r && z < b[1] + b[3] + r) { const px = (b[2] + r) - Math.abs(x - b[0]), pz = (b[3] + r) - Math.abs(z - b[1]); if (px < pz) x += px * Math.sign(x - b[0] || 1); else z += pz * Math.sign(z - b[1] || 1); } } return [clamp(x, CX - 330, CX + 300), clamp(z, -290, 290)]; }

// your car (you drive it from the inside)
CAR.g = new THREE.Group(); scene.add(CAR.g); CAR.g.visible = false;
{ const g = CAR.g, body = makeCarBody(0x2a3a5a); g.add(body); const dash = MSM({ color: 0x15151a, roughness: 0.7 }); bx(1.8, 0.35, 0.6, dash, 0, 1.0, 0.95, g); const wheel = mk(new THREE.TorusGeometry(0.19, 0.028, 6, 20), dash, -0.42, 1.12, 0.62, g); wheel.rotation.x = -0.4; CAR.wheel = wheel;
  CAR.speedo = bx(0.22, 0.12, 0.01, MSM({ color: 0x000000, emissive: 0x40c0ff, emissiveIntensity: 1.2 }), -0.42, 1.2, 0.66, g); CAR.speedo.rotation.x = -0.6; }

// ---------- the bedroom (and the halls, the closet, the bed) ----------
const ROOM = new THREE.Group(); ROOM.visible = false; ROOM.position.set(HX, 0, HZ); scene.add(ROOM);
const DOORS = { L: { x: -3.1, z: 0.2 }, R: { x: 3.1, z: 0.2 }, C: { x: 0, z: 2.55 }, B: { x: 0, z: -1.6 } };
{
  const wall = MSM({ map: ctex(256, 256, (c, w, h) => { c.fillStyle = '#3e4a52'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(20,26,30,.35)'; c.fillRect(x, 0, 10, h); } for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.arc(rand() * w, rand() * h, 6, 0, 7); c.fill(); } }), roughness: 0.9 });
  const floorM = MSM({ map: TX.wood, color: 0x6a4a32, roughness: 0.6 }), trim = MSM({ color: 0xd8d0c0, roughness: 0.6 }), dark = MSM({ color: 0x0a0a0c, roughness: 1 });
  const g = ROOM; bx(6.4, 0.1, 5.4, floorM, 0, -0.05, 0, g); bx(6.4, 0.1, 5.4, MSM({ color: 0x8a8884 }), 0, 2.8, 0, g);
  // back wall (closet) and front wall (window), side walls with door openings into the halls
  bx(6.4, 2.8, 0.15, wall, 0, 1.4, 2.7, g); bx(6.4, 2.8, 0.15, wall, 0, 1.4, -2.7, g);
  [-1, 1].forEach(s => { bx(0.15, 2.8, 1.9, wall, s * 3.2, 1.4, 1.75, g); bx(0.15, 2.8, 1.9, wall, s * 3.2, 1.4, -1.6, g); bx(0.15, 0.6, 1.1, wall, s * 3.2, 2.5, 0.2, g);
    // the hall: long, dark, ends in a doorway into black
    bx(7, 0.1, 1.6, floorM, s * 6.7, -0.05, 0.2, g); bx(7, 0.1, 1.6, MSM({ color: 0x5a5854 }), s * 6.7, 2.4, 0.2, g); bx(7, 2.4, 0.12, wall, s * 6.7, 1.2, -0.62, g); bx(7, 2.4, 0.12, wall, s * 6.7, 1.2, 1.02, g); bx(0.1, 2.4, 1.6, dark, s * 10.2, 1.2, 0.2, g);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), MSM({ map: ctex(64, 128, (c, w, h) => { c.fillStyle = '#5a4a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8b8a0'; c.fillRect(10, 14, 44, 56); }), roughness: 0.8 })); fr.position.set(s * 5.5, 1.5, 0.95); fr.rotation.y = Math.PI; g.add(fr);
    // the bedroom door that you hold shut
    const dp = new THREE.Group(); dp.position.set(s * 3.2, 0, 0.2 + 0.55 * s); g.add(dp); const dm = bx(0.06, 2.15, 1.1, MSM({ map: TX.wood, color: 0xb8a890 }), 0, 1.08, -0.55 * s, dp); dp.rotation.y = s * 1.4; DOORS[s < 0 ? 'L' : 'R'].door = dp; });
  // closet double doors
  DOORS.C.doors = [-1, 1].map(s => { const d = new THREE.Group(); d.position.set(s * 0.9, 0, 2.6); g.add(d); bx(0.9, 2.2, 0.05, MSM({ map: TX.wood, color: 0xc8b8a0 }), -s * 0.45, 1.1, 0, d); return d; }); bx(1.8, 2.2, 0.05, dark, 0, 1.1, 2.66, g);
  // bed, nightstand, alarm clock, a window with rain outside, toys
  bx(1.6, 0.45, 2.1, MSM({ map: TX.wood, color: 0x6a4a32 }), 0, 0.23, -1.6, g); bx(1.5, 0.2, 2, MSM({ color: 0x5a6a8a, roughness: 0.9 }), 0, 0.55, -1.6, g); bx(1.0, 0.18, 0.45, MSM({ color: 0xe8e8e0 }), 0, 0.72, -2.35, g);
  bx(0.5, 0.55, 0.45, MSM({ map: TX.wood, color: 0x5a3a22 }), 1.2, 0.28, -2.35, g); const clk = ctex(128, 64, (c, w, h) => { c.fillStyle = '#100'; c.fillRect(0, 0, w, h); }); ROOM.clockTx = clk; const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshBasicMaterial({ map: clk })); cm.position.set(1.2, 0.66, -2.12); g.add(cm);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ color: 0x141c2a })); win.position.set(-1.6, 1.6, -2.6); g.add(win); bx(1.5, 0.08, 0.1, trim, -1.6, 1.05, -2.6, g); bx(0.06, 1.1, 0.06, trim, -1.6, 1.6, -2.6, g);
  for (let i = 0; i < 5; i++) sph(0.12, MSM({ color: [0xc83a3a, 0x3a8ac8, 0xe8c040][i % 3] }), -2 + rand() * 0.8, 0.12, 1 + rand(), g);
  // the bed critters: three little grinning heads that crawl onto the blanket
  ROOM.crit = []; for (let i = 0; i < 3; i++) { const c = new THREE.Group(); g.add(c); sph(0.11, MSM({ color: 0xe8e0d0, roughness: 0.4 }), 0, 0.1, 0, c); bx(0.12, 0.02, 0.01, MAT.black, 0, 0.07, 0.105, c); [-1, 1].forEach(sd => sph(0.022, MAT.black, sd * 0.04, 0.13, 0.095, c)); c.position.set(-0.4 + i * 0.4, 0.66, -1.2 - (i % 2) * 0.5); c.visible = false; ROOM.crit.push(c); }
  ROOM.lamp = new THREE.PointLight(0x8a9cc8, 0, 11, 1.2); ROOM.lamp.position.set(-1.6, 1.8, -2.2); g.add(ROOM.lamp);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
// the Grinner — the Creeping Grinner model: crawls on all fours like a spider, never stops smiling,
// and when it grins its head turns upside down. It giggles when it notices you looking.
const CRP = MON.makeCreeper(); CRP.g.scale.setScalar(1.3); CRP.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
CRP.stepCb = () => { if (CRP.g.visible && rand() < 0.5) SND.crawl((CRP.g.position.x - HX) > 0 ? 0.5 : -0.5); };
const GRIN = CRP.g;
GRIN.userData = { head: CRP.head, gT: 0, update: (dt, scare) => { const u = GRIN.userData; u.gT = Math.max(0, u.gT - dt); CRP.grin += ((scare || u.gT > 0 ? 1 : 0) - CRP.grin) * Math.min(1, dt * (scare ? 20 : 4)); CRP.update(dt); } };
function grinGiggle() { GRIN.userData.gT = 1.6; SND.giggle && SND.giggle(9, 0.25); }

function grinAt(lx, lz, yaw, y) { GRIN.visible = true; GRIN.position.set(HX + lx, y || 0, HZ + lz); GRIN.rotation.set(0, yaw, 0); }

// ---------- chapter 3 flow ----------
function flareSpot() { const s = START3(); for (let r = 10; r < 50; r += 2) for (let a = 0; a < 6.28; a += 0.3) { const x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r, h = H(x, z); if (h > 0.1 && h < 0.7) return { x, z }; } return { x: s.x + 6, z: s.z + 6 }; }
let flareBoat = null;
function placeFlareBoat() { if (flareBoat) return; FLG = flareSpot(); flareBoat = new THREE.Group(); const y = H(FLG.x, FLG.z); flareBoat.position.set(FLG.x, y, FLG.z); flareBoat.rotation.set(0.15, 0.7, -0.25); W.swamp.add(flareBoat); const wm = MSM({ map: TX.wood, color: 0x6a5440, side: THREE.DoubleSide }); const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wm); hull.scale.set(0.7, 0.4, 1.8); hull.position.y = 0.35; flareBoat.add(hull); bx(1.2, 0.05, 0.25, wm, 0, 0.3, 0.3, flareBoat); const box = bx(0.42, 0.22, 0.3, MSM({ color: 0xc8a020 }), 0, 0.35, -0.6, flareBoat); bx(0.2, 0.05, 0.005, MSM({ color: 0xc81a1a }), 0, 0.4, -0.75, flareBoat); flareBoat.userData.gl = glint(FLG.x, y + 1.4, FLG.z); }
function playChapter3(i, fresh3) {
  const c3 = readCh3(i), m = readSlot(i); const best = !fresh3 && (m && m.obj >= 43 && !m.ch3done ? m : c3); G.slot = i;
  if (best) { G.tips = { light: 1, gun: 1 }; restore(best); checkpoint(); hideMenu(); lock(true); begin(); return; }
  const d = m || {}; Object.assign(G, fresh(), { tips: { light: 1, gun: 1 } }); const s = START3();
  const base = Object.assign(fresh(), { x: s.x, z: s.z, yaw: Math.PI * 0.75, ch1done: true, ch2done: true, obj: 43, hasLight: true, guns: Object.assign({ pistol: true, shotgun: false, flare: false }, d.guns || {}, { flare: false }), am: d.am || { p: 12, pr: 12, s: 0, sr: 0 }, wep: 'none', med: [], time: d.time || 0, deaths: d.deaths || 0 });
  restore(base); checkpoint(); hideMenu(); lock(true); begin();
  say('The rescue chopper couldn’t land in the reeds. They told me to signal them.', 3.6, 'You'); say('That old boat on the bank — boats like that always kept a flare kit.', 3.4, 'You');
}
function ch3Restore() {
  P.inRoom = false; CAR.on = false; clockEl.style.display = 'none'; if (FLARE) { FLARE.m.visible = false; FLARE_L.intensity = 0; FLARE = null; }
  if (G.obj < 43) { CITY.visible = ROOM.visible = CAR.g.visible = GRIN.visible = false; return; }
  hShow(false); C.state = 'off'; showC(false); G.dawn = true; placeFlareBoat(); flareBoat.userData.gl.visible = G.obj === 43; flareBoat.visible = true;
  if (G.obj === 45) G.obj = 44; if (G.obj === 47) G.obj = 46; if (G.obj === 49) G.obj = 48;
  if (G.obj === 43 || G.obj === 44) { if (G.obj === 44) { G.guns.flare = true; } }
  if (G.obj === 46) { P.x = CAR0.x - 2.5; P.z = CAR0.z + 3; P.y = 0; P.yaw = 0; }
  if (G.obj === 48) { enterRoom(); }
  ch3Env();
}
function ch3Env() {
  const city = P.x < -1000 && !P.inRoom, room = !!P.inRoom; CITY.visible = city; ROOM.visible = room;
  if (city) { W.swamp.visible = false; scene.fog.color.setHex(0x232838); scene.fog.density = 0.0065; hemi.intensity = 0.55; moon.intensity = 0.35; CITY.porch.intensity = 1.5; }
  if (room) { W.swamp.visible = false; scene.fog.color.setHex(0x050608); scene.fog.density = 0.03; hemi.intensity = 0.14; moon.intensity = 0; scene.environment = null; ROOM.lamp.intensity = 1; }
  if (!city) CITY.lights.forEach(l => l.intensity = 0);
}
addIt({ x: 0, z: 0, r: 2.4, label: 'Search the boat — take the flare gun', cond: () => G.obj === 43 && FLG && Math.hypot(P.x - FLG.x, P.z - FLG.z) < 2.6, act: () => { G.guns.flare = true; flareBoat.userData.gl.visible = false; SND.pickup(); equip('flare'); say('A flare gun. One shell left.', 2.4, 'You'); say('Point it straight up and pull the trigger.', 2.8, 'You'); setObj(44); hint('Fire the flare straight up into the sky', 4); } });
// the interactable above has no fixed spot; keep it on the boat
setInterval(() => { const it = IT.find(i => i.label === 'Search the boat — take the flare gun'); if (it && FLG) { it.x = FLG.x; it.z = FLG.z; } }, 500);

let FLARE = null;
const FLARE_M = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false })); FLARE_M.visible = false; scene.add(FLARE_M); const FLARE_L = new THREE.PointLight(0xff2a10, 0, 80, 1.2); FLARE_M.add(FLARE_L);
function ch3FireFlare() {
  G.guns.flare = false; equip(G.guns.shotgun ? 'shotgun' : G.guns.pistol ? 'pistol' : 'none'); SND.flare(); P.shake = 0.3;
  const m = FLARE_M; m.visible = true; FLARE_L.intensity = 6;
  m.position.set(P.x, P.y + 1.7, P.z); FLARE = { m, v: V3(-Math.sin(P.yaw) * 4, 32, -Math.cos(P.yaw) * 4), t: 0 };
  G.mode = 'cut'; P.look = { yaw: P.yaw, pitch: 1.1 };
  setTimeout(() => { say('Come on… see it. SEE IT.', 2.4, 'You'); }, 1800);
  setTimeout(() => { SND.radioBlip(); say('Millbrook Air Rescue — we see your flare! Coming in now, stay where you are.', 4, 'Radio'); ch3Heli(); }, 4600);
}
function ch3Heli() {
  const dockY = Math.max(H(P.x, P.z), 0), hover = { x: P.x + 1.5, y: dockY + 15.2, z: P.z + 3 };
  heli.g.visible = true; heli.t = 7.5; heli.ladder.scale.y = 0.001; heli.spot.intensity = 3; SND.set('heli', 0.5, 1); const from = { x: hover.x - 180, y: hover.y + 50, z: hover.z - 90 };
  runScene((S, dt) => { const t = S.t; if (t < 7) { const e = 1 - Math.pow(1 - Math.min(1, t / 7), 3); heli.g.position.set(lerp(from.x, hover.x, e), lerp(from.y, hover.y, e), lerp(from.z, hover.z, e)); heli.g.rotation.y = Math.atan2(hover.x - from.x, hover.z - from.z) * (1 - e); P.look = lookAtPt(heli.g.position.x, heli.g.position.y, heli.g.position.z); }
    if (t > 7) heli.ladder.scale.y = Math.min(1, (t - 7) / 1.2);
    if (at(S, 8.4, 'go')) { SCN = null; setObj(45, true); ch3Ladder(hover, dockY); } });
}
function ch3Ladder(hover, dockY) {
  const L = { p: 0 }; P.look = null; P.pitch = 0.5; G.mode = 'cut'; P.falling = true; say('Climb! Hold W, ↑ or USE.', 2.6, 'Tip');
  runScene((S, dt) => { const t = S.t; heli.g.position.set(hover.x + Math.sin(t * 0.8) * 0.15, hover.y + Math.sin(t * 1.1) * 0.12, hover.z); heli.ladder.updateMatrixWorld(true); const lp = heli.ladder.getWorldPosition(V2);
    const held = K.KeyW || K.ArrowUp || useHeld() || padY < -0.4 || jy < -0.4; if (held) { L.p = Math.min(1, L.p + dt * 0.1); S.rt = (S.rt || 0) - dt; if (S.rt <= 0) { S.rt = 0.42; SND.rung(); } }
    P.x = lp.x; P.z = lp.z + 0.35; P.y = lerp(dockY - 1.3, lp.y - 3.4, L.p);
    if (at(S, 3, 'l1')) remark(['Don’t look down. Don’t look down…'], 1);
    if (L.p >= 1 && !S.done) { S.done = true; SCN = null; flight(); } });
}
function flight() {
  // the flight out: over the swamp at sunrise, over Hollow Pines, then the city lights at dusk
  G.mode = 'cut'; clearSubs(); P.falling = true; heli.ladder.scale.y = 0.001; checkpoint(); $('objT').textContent = 'Fly to the city'; const seg = [
    { from: V3(W.wtower.x + 40, 60, W.wtower.z + 70), to: V3(W.wtower.x - 300, 70, W.wtower.z - 40), T: 11, lines: [['You', 'I’m in. Get me out of here.', 2.4], ['Radio', 'Hang on. Next stop, Millbrook.', 2.6]] },
    { from: V3(250, 120, 100), to: V3(-250, 110, -30), T: 12, lines: [['You', 'That’s Hollow Pines down there.', 2.4], ['You', 'I never want to see another tree again.', 2.8]] },
    { from: V3(CX + 700, 140, 40), to: V3(HELIPAD.x + 30, 30, HELIPAD.z + 20), T: 12, lines: [['You', 'The city. People. Normal things.', 2.6], ['Radio', 'Setting you down at the heliport. There’s a car waiting.', 3.2]] } ];
  let i = 0; const startSeg = () => { const s = seg[i]; G.ch3seg = s; fade(0); clearSubs(); P.inHeli = false; if (i === 2) { CITY.visible = true; W.swamp.visible = false; updateChunks(9999, 0, 0); } else if (i === 1) { W.swamp.visible = false; updateChunks(0, 0, 125); } s.lines.forEach(([w, t2, d]) => say(t2, d, w)); };
  startSeg(); SND.set('heli', 0.35, 0.5);
  runScene((S, dt) => { const s = seg[i]; const k = Math.min(1, S.t / s.T); heli.g.visible = true; heli.g.position.lerpVectors(s.from, s.to, k); heli.g.rotation.set(0, Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z) + Math.PI, Math.sin(S.t * 0.7) * 0.05);
    const side = V3(Math.cos(heli.g.rotation.y) * 14, 4, -Math.sin(heli.g.rotation.y) * 14); P.x = heli.g.position.x + side.x; P.z = heli.g.position.z + side.z; P.y = heli.g.position.y + side.y - 1.65; P.look = lookAtPt(heli.g.position.x, heli.g.position.y, heli.g.position.z);
    if (i === 2) { scene.fog.color.setHex(0x283048); scene.fog.density = 0.0035; hemi.intensity = 0.6; }
    if (k >= 1) { if (!S.fd) { S.fd = true; S.ft = 0; fade(1); } S.ft += dt; if (S.ft > 0.9) { i++; S.t = 0; S.fd = false; if (i < seg.length) startSeg(); else { SCN = null; landCity(); } } } });
}
function landCity() {
  heli.g.position.set(HELIPAD.x, 0.6, HELIPAD.z); heli.g.rotation.set(0, Math.PI, 0); P.inHeli = false; P.falling = false; P.look = null;
  P.x = HELIPAD.x - 8; P.z = HELIPAD.z + 9; P.y = 0; P.yaw = Math.atan2(-(CAR0.x - P.x), -(CAR0.z - P.z)); P.pitch = 0; ch3Env(); CAR.g.visible = true; CAR.x = CAR0.x; CAR.z = CAR0.z; CAR.yaw = CAR0.yaw; placeCar(); fade(0);
  say('Solid ground. City ground.', 2.4, 'You'); say('That’s the car they left me. Time to go home.', 3, 'You'); G.mode = 'play'; setObj(46);
  setTimeout(() => { heli.spot.intensity = 0; SND.set('heli', 0.15, 3); }, 3000);
}
function placeCar() { CAR.g.position.set(CAR.x, 0, CAR.z); CAR.g.rotation.y = CAR.yaw; }
addIt({ x: CAR0.x, z: CAR0.z, r: 3.2, label: 'Get in the car', cond: () => G.obj === 46 && !CAR.on, act: () => { CAR.on = true; P.held = true; P.falling = true; SND.door(); SND.set('hum', 0.22, 0.6); setObj(47, true); say('Home’s on the west side of town. Just follow the road.', 3.2, 'You'); hint('W / S to drive, A / D to steer', 4); } });
function updateCar(dt) {
  if (!CAR.on) return; if (G.mode !== 'play') { return; }
  const thr = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) - (padY || 0) - (jy || 0) + (padOn && navigator.getGamepads && (navigator.getGamepads()[padIdx] || {}).buttons ? ((navigator.getGamepads()[padIdx].buttons[7] || {}).value || 0) - ((navigator.getGamepads()[padIdx].buttons[6] || {}).value || 0) : 0);
  const st = (K.KeyA || K.ArrowLeft ? 1 : 0) - (K.KeyD || K.ArrowRight ? 1 : 0) - (padX || 0) - (jx || 0);
  CAR.v += clamp(thr, -1, 1) * (thr * CAR.v < 0 ? 16 : 7) * dt; CAR.v *= Math.max(0, 1 - dt * 0.35); CAR.v = clamp(CAR.v, -6, 24); if (Math.abs(thr) < 0.05) CAR.v *= Math.max(0, 1 - dt * 0.8);
  CAR.steer += (clamp(st, -1, 1) * 0.55 - CAR.steer) * Math.min(1, dt * 5); const dyaw = CAR.steer * CAR.v * 0.07 * dt; CAR.yaw += dyaw; P.yaw += dyaw;
  let nx = CAR.x + Math.sin(CAR.yaw) * CAR.v * dt, nz = CAR.z + Math.cos(CAR.yaw) * CAR.v * dt; const [cx, cz] = cityCollide(nx, nz, 1.3);
  if (Math.hypot(cx - nx, cz - nz) > 0.05) { if (Math.abs(CAR.v) > 6) { SND.thud(); SND.clang(); P.shake = Math.min(1, Math.abs(CAR.v) / 20); rumble(1, 0.6, 300); } CAR.v *= -0.25; } CAR.x = cx; CAR.z = cz; placeCar();
  CAR.wheel.rotation.z = -CAR.steer * 2; const fx = Math.sin(CAR.yaw), fz = Math.cos(CAR.yaw), rx = Math.cos(CAR.yaw), rz = -Math.sin(CAR.yaw);
  P.x = CAR.x - rx * 0.42 + fx * 0.25; P.z = CAR.z - rz * 0.42 + fz * 0.25; P.y = -0.35; P.shake = Math.max(P.shake, Math.min(0.06, Math.abs(CAR.v) * 0.003));
  SND.set('hum', 0.18 + Math.abs(CAR.v) * 0.012, 0.1);
  if (Math.hypot(CAR.x - HOME.x - 4.5, CAR.z - HOME.z - 4.5) < 9) arriveHome();
}
function arriveHome() {
  CAR.on = false; CAR.v = 0; P.held = false; G.mode = 'cut'; SND.set('hum', 0, 0.8); clearSubs();
  runScene((S, dt) => { if (at(S, 0.6, 'l1')) say('Home.', 1.8, 'You'); if (at(S, 2.2, 'l2')) { SND.door(); say('Shower. Bed. And I am never, EVER house-sitting a forest again.', 3.8, 'You'); } if (at(S, 6, 'f')) fade(1); if (at(S, 8, 'sleep')) { SCN = null; startNight(); } });
}

// ---------- the night ----------
const clockEl = document.createElement('div'); clockEl.id = 'clock3'; clockEl.style.cssText = 'display:none;position:fixed;right:18px;top:70px;z-index:20;font:600 28px Oswald,sans-serif;color:#e8e0d0;text-shadow:0 2px 8px #000;pointer-events:none'; document.body.appendChild(clockEl);
function enterRoom() { P.inRoom = true; CAR.g.visible = false; CITY.visible = false; P.x = HX; P.z = HZ - 0.4; P.y = 0; P.yaw = Math.PI; P.pitch = -0.05; P.falling = false; P.held = false; ch3Env(); }
function startNight() {
  clearSubs(); enterRoom(); setObj(48); G.night = { t: 0, hour: 0 }; Object.assign(GR, { state: 'away', t: 6, side: 0, closet: 0, bed: 0, heldL: 0, heldR: 0, heldC: 0, at: null }); GRIN.visible = false; ROOM.crit.forEach(c => c.visible = false);
  [DOORS.L, DOORS.R].forEach((d, i) => d.door.rotation.y = (i ? 1 : -1) * 1.4); DOORS.C.doors.forEach(d => d.rotation.y = 0);
  fade(0); G.mode = 'cut'; P.light = false; SND.set('rain', 0.05, 1);
  runScene((S, dt) => {
    if (at(S, 0.5, 'clk')) { SND.alarm && SND.alarm(); say('*12:00 AM*', 1.8, ''); }
    if (at(S, 1.8, 'l1')) say('…something woke me up.', 2.4, 'You');
    if (at(S, 4.4, 'l2')) { SND.creak(-0.6); say('The hallway floor just creaked. I live alone.', 3.2, 'You'); }
    if (at(S, 8, 'l3')) { say('Okay. Listen at the doors. If I hear breathing — hold the door shut. Don’t shine the light.', 4.4, 'You'); say('If it’s quiet — light the hall and check. And watch the closet. And the bed.', 4, 'You'); }
    if (at(S, 13.5, 'go')) { SCN = null; G.mode = 'play'; hint('Walk to a door · HOLD E to hold it shut · F flashlight · survive until 6 AM', 6); }
  });
}
function nearDoor() { const lx = P.x - HX, lz = P.z - HZ; for (const k of ['L', 'R', 'C', 'B']) { const d = DOORS[k]; if (Math.hypot(lx - d.x * (k === 'C' || k === 'B' ? 1 : 0.85), lz - d.z) < (k === 'B' ? 1.5 : 1.1)) return k; } return null; }
function roomMove(ox, oz, nx, nz) { const lx = clamp(nx - HX, -2.75, 2.75), lz = clamp(nz - HZ, -0.4, 2.2); return [HX + lx, HZ + lz]; }
function updateNight(dt) {
  if (G.obj !== 48 || !P.inRoom) { clockEl.style.display = 'none'; return; }
  const N = G.night; if (!N) return; clockEl.style.display = 'block'; const hr = Math.floor(N.t / 48); clockEl.textContent = (hr === 0 ? 12 : hr) + ' AM';
  if (ROOM.clockTx && ROOM.clockTx._h !== hr) { const c = ROOM.clockTx.image.getContext('2d'); c.fillStyle = '#100'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff3020'; c.font = 'bold 40px monospace'; c.textAlign = 'center'; c.fillText((hr === 0 ? 12 : hr) + ':00', 64, 46); ROOM.clockTx.needsUpdate = true; ROOM.clockTx._h = hr; }
  ROOM.lamp.intensity = 1.0 + Math.sin(G.time * 0.7) * 0.06; P.held = false;
  if (G.mode !== 'play') return; N.t += dt; if (N.t >= 48 * 6) return winNight();
  const lvl = 0.6 + hr * 0.22, at2 = nearDoor(), lx = P.x - HX, lz = P.z - HZ; const holding = useHeld() && at2;
  // facing a door with the light on?
  const fwd = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), lookingAt = k => { const d = DOORS[k]; const v = V3(d.x * 2.2 - lx, 0, d.z - lz).normalize(); return fwd.dot(v) > 0.75; };
  // doors: hold them shut
  ['L', 'R'].forEach(k => { const d = DOORS[k], shut = holding && at2 === k; d.door.rotation.y += ((shut ? 0 : (k === 'L' ? -1.4 : 1.4)) - d.door.rotation.y) * Math.min(1, dt * 10); if (shut && !d.wasShut) SND.thud(); d.wasShut = shut; });
  DOORS.C.doors.forEach((d, i) => { const open = holding && at2 === 'C' ? 0 : GR.closet * 0.18; d.rotation.y += ((i ? -1 : 1) * open - d.rotation.y) * Math.min(1, dt * 6); });
  // the Grinner's hallway track
  GR.t -= dt * lvl;
  if (GR.state === 'away') { GRIN.visible = false; if (GR.t <= 0) { GR.side = rand() < 0.5 ? 'L' : 'R'; GR.state = 'hall'; GR.t = 6 + rand() * 4; GR.T0 = GR.t; const s = GR.side === 'L' ? -1 : 1; GR.ceil = rand() < 0.45; grinAt(s * 9.4, 0.2, -s * Math.PI / 2); if (GR.ceil) { GRIN.rotation.z = Math.PI; GRIN.position.y = 2.42; } SND.crawl(s * 0.7); } }
  else if (GR.state === 'hall') { const s = GR.side === 'L' ? -1 : 1, pr = 1 - Math.max(0, GR.t) / (GR.T0 || 8); GRIN.position.x = HX + s * (9.4 - 4.4 * pr); CRP.v = (4.4 / (GR.T0 || 8)) * lvl / 1.3;
    if (P.light && at2 === GR.side && lookingAt(GR.side)) { GR.state = 'flee'; GR.ft = 1.4; CRP.v = 0; grinGiggle(); SND.stinger(); remark(['It was crawling down the hall — it SMILED at me!', 'GET BACK!'], 1); }
    else if (GR.t <= 0) { GR.state = 'door'; GR.t = 7.5 - hr * 0.5; GR.held = 0; GR.wh = 1.5; CRP.v = 0; grinAt(s * 4.4, 0.2, -s * Math.PI / 2); } }
  else if (GR.state === 'flee') { GR.ft -= dt; const s = GR.side === 'L' ? -1 : 1; if (GR.ft < 0.6) { GRIN.position.x += s * dt * 7; GRIN.rotation.y = s * Math.PI / 2; CRP.v = 3; } if (GR.ft <= 0) { GR.state = 'away'; GR.t = 5 + rand() * 5; CRP.v = 0; } }
  else if (GR.state === 'door') { const s = GR.side === 'L' ? -1 : 1, listening = at2 === GR.side && !P.light;
    SND.set('breath', listening ? 0.45 : 0, 0.2);
    GR.wh -= dt; if (listening && GR.wh <= 0) { GR.wh = 3 + rand() * 3; grinWhisper(); }
    if (P.light && at2 === GR.side && lookingAt(GR.side)) return grinScare(GR.side);
    if (holding && at2 === GR.side) { GR.held += dt; if (GR.held > 2.6) { GR.state = 'away'; GR.t = 6 + rand() * 6; SND.set('breath', 0, 0.2); SND.step(false, true); SND.crawl(s * 0.5); say('…footsteps. It’s going away.', 2.2, 'You'); } }
    else if (GR.t <= 0) return grinScare(GR.side); }
  if (GR.state !== 'door') SND.set('breath', 0, 0.3);
  if (GR.state === 'away' || GR.state === 'door') CRP.v = 0;
  // the closet: it creeps further out unless you hold the doors shut
  GR.cT = (GR.cT == null ? 25 : GR.cT) - dt * lvl; if (GR.cT <= 0) { GR.cT = 14 + rand() * 10; GR.closet++; SND.creak(0); if (GR.closet === 2) remark(['The closet door just moved…'], 1); if (GR.closet >= 4) return grinScare('C'); }
  if (holding && at2 === 'C' && GR.closet > 0) { GR.heldC += dt; if (GR.heldC > 2.4) { GR.heldC = 0; GR.closet = Math.max(0, GR.closet - 2); SND.thud(); remark(['Something pushed back from inside…'], 0.8); } }
  // the bed: little grinning heads crawl up onto the blanket — shine the light on them
  GR.bT = (GR.bT == null ? 30 : GR.bT) - dt * lvl; if (GR.bT <= 0) { GR.bT = 16 + rand() * 10; GR.bed++; SND.crawl(0); if (GR.bed >= 4) return grinScare('B'); }
  ROOM.crit.forEach((c, i) => { c.visible = i < GR.bed; c.position.y = 0.66 + Math.abs(Math.sin(G.time * 6 + i)) * 0.02; });
  if (GR.bed > 0 && P.light && at2 === 'B' && lookingAt('B')) { GR.bed = 0; SND.crawl(0); SND.whisper(0); remark(['They scattered under the bed…'], 1); }
}
function grinWhisper() { SND.whisper(GR.side === 'L' ? -0.7 : 0.7); try { if (window.speechSynthesis && settings.voice !== false) { const u = new SpeechSynthesisUtterance(pick(['let me in', 'let me in', 'I can hear you breathing', 'open the door', 'I like your room'])); u.pitch = 0.1; u.rate = 0.55; u.volume = 0.32; if (VOICE.you) u.voice = VOICE.you; speechSynthesis.speak(u); } } catch (e) {} }
function grinScare(where) {
  G.mode = 'cut'; SND.set('breath', 0, 0.1); const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  runScene((S, dt) => { const k = Math.min(1, S.t / 0.2); GRIN.visible = true; GRIN.rotation.set(0, Math.atan2(-fx, -fz), 0); GRIN.userData.update(dt, true); GRIN.updateMatrixWorld(true); const hp = GRIN.userData.head.getWorldPosition(V2), d = lerp(2.4, 0.42, k); GRIN.position.x += camera.position.x + fx * d - hp.x; GRIN.position.y += camera.position.y + 0.02 - hp.y; GRIN.position.z += camera.position.z + fz * d - hp.z; P.shake = 1;
    if (at(S, 0.02, 'scr')) { SND.giggle && SND.giggle(5, 0.3); SND.scream && SND.scream(); SND.hollowScream(1.2); rumble(1, 1, 1000); $('hurt').style.opacity = 1; }
    if (at(S, 1.1, 'dead')) { SCN = null; GRIN.visible = false; G.deaths++; showDead(where === 'C' ? 'It came out of the closet. Hold the closet doors shut when they start to open.' : where === 'B' ? 'They covered the bed. Shine your light on the bed when you hear them crawling.' : 'The Grinner got in. Listen at the door first — if you hear breathing, HOLD the door shut. Never shine the light on it.'); } });
}
function winNight() {
  G.mode = 'cut'; SND.set('breath', 0, 0.2); GRIN.visible = false; clockEl.textContent = '6 AM'; SND.bell && SND.bell(0);
  ROOM.lamp.color.setHex(0xffd8a0); ROOM.lamp.intensity = 2.5; say('6 AM. Sunlight.', 2.4, 'You'); say('It’s… gone. For now.', 2.6, 'You');
  setTimeout(() => { G.ch3done = true; checkpoint(); clearCh3(G.slot); G.mode = 'win'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; clockEl.style.display = 'none';
    $('winH').textContent = 'Chapter 3 Complete'; $('winT').innerHTML = 'You survived the night.<br>On the bedroom floor, small muddy handprints lead from the closet to the bed… and stop.<br>Out in Hollow Pines, the radio in Harlan’s cabin crackles once and goes quiet.<br><br>Time: ' + fmtT(G.time) + ' · Deaths: ' + G.deaths + '<br><br><b>Thanks for playing Hollow Pines.</b>'; $('win').style.display = 'grid'; try { document.exitPointerLock(); } catch (e) {} }, 5200);
}
// ---------- hooks ----------
function updateCh3(dt) {
  if (G.obj < 43) return;
  if (FLARE) { FLARE.t += dt; FLARE.v.y -= 6 * dt; FLARE.m.position.addScaledVector(FLARE.v, dt); spray(FIREP, FLARE.m.position.x, FLARE.m.position.y, FLARE.m.position.z, 2, 0.6); if (FLARE.t > 12) { FLARE.m.visible = false; FLARE_L.intensity = 0; FLARE = null; } }
  updateCar(dt); updateNight(dt); if (GRIN.visible && G.mode !== 'cut') GRIN.userData.update(dt, false);
  if (CITY.visible) { let best = []; for (const [x, z] of CITYL) { const d = Math.abs(x - P.x) + Math.abs(z - P.z); if (d < 120) best.push([d, x, z]); } best.sort((a, b) => a[0] - b[0]); CITY.lights.forEach((l, i) => { const b = best[i]; if (b) { l.position.set(b[1], 6.6, b[2]); l.intensity = 1.6; } else l.intensity = 0; }); }
  if (G.obj === 43 && flareBoat) flareBoat.userData.gl.visible = true;
}
function ch3Hint() { if (G.obj === 43 && FLG) return { k: 'boat', p: { x: FLG.x, y: H(FLG.x, FLG.z) + 0.8, z: FLG.z } }; if (G.obj === 46) return { k: 'car', p: { x: CAR0.x, y: 1.4, z: CAR0.z } }; return null; }
window.HP4 = { CITY, CAR, ROOM, GR, GRIN, playChapter3, ch3FireFlare, flight, landCity, arriveHome, startNight, winNight, HOME, HELIPAD, cityCollide };
