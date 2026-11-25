'use strict';
/* Hollow Pines — Chapter 3: the flare, the flight to the city, the drive home, and the night in your own house
   where you do chores while the house slowly goes wrong — and the Grinner is in there with you. */
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

// ---------- your house: bedroom, bathroom, laundry, kitchen, living room and the long hall ----------
const ROOM = new THREE.Group(); ROOM.visible = false; ROOM.position.set(HX, 0, HZ); scene.add(ROOM);
const WALLS = [], FUR = [], WH = 2.7;
const HOU = { busy: false, cab: 0, dryer: false, dT: 0, tv: false, tvT: 0, amb: 20, glimpse: false, peek: null, chase: null, flick: {} };
{
  const wallTx = (base, stripe) => ctex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { c.fillStyle = stripe; c.fillRect(x, 0, 12, h); } for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(0,0,0,.05)'; c.beginPath(); c.arc(rand() * w, rand() * h, 4 + rand() * 10, 0, 7); c.fill(); } }, [3, 1]);
  const wall = MSM({ map: wallTx('#4e5444', 'rgba(30,34,24,.3)'), roughness: 0.9 });
  const floorM = MSM({ map: TX.wood, color: 0x7a5a3a, roughness: 0.6 }), ceilM = MSM({ color: 0x9a968c, roughness: 1 }), trim = MSM({ color: 0xd8d0c0, roughness: 0.6 });
  const tile = MSM({ map: ctex(128, 128, (c, w, h) => { c.fillStyle = '#c8c4b8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a867a'; c.lineWidth = 3; for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, [6, 4]), roughness: 0.35 });
  const g = ROOM;
  bx(16.2, 0.1, 12.2, floorM, 0, -0.05, 0, g); bx(16.2, 0.1, 12.2, ceilM, 0, WH + 0.05, 0, g);
  const tf = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tile); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.005, z); g.add(m); };
  tf(-4.5, -3.5, 7, 5); tf(0, 3.5, 4, 5); tf(5, 3.5, 6, 5);
  // walls with doorway gaps
  function wallRun(x0, z0, x1, z1, gaps = []) { const hor = z0 === z1, a0 = hor ? x0 : z0, a1 = hor ? x1 : z1; const cuts = gaps.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]); let s = a0; const segs = []; for (const [c0, c1] of cuts) { segs.push([s, c0]); s = c1; } segs.push([s, a1]);
    for (const [s0, s1] of segs) { const L = s1 - s0; if (L <= 0.01) continue; const c = (s0 + s1) / 2; if (hor) { bx(L, WH, 0.15, wall, c, WH / 2, z0, g); WALLS.push([c, z0, L / 2, 0.075]); } else { bx(0.15, WH, L, wall, x0, WH / 2, c, g); WALLS.push([x0, c, 0.075, L / 2]); } }
    for (const [c0, c1] of cuts) { const c = (c0 + c1) / 2, L = c1 - c0; if (hor) bx(L, 0.5, 0.15, wall, c, WH - 0.25, z0, g); else bx(0.15, 0.5, L, wall, x0, WH - 0.25, c, g); } }
  wallRun(-8, -6, 8, -6, [[1.5, 1.0]]); WALLS.push([1.5, -6, 0.5, 0.075]); wallRun(-8, 6, 8, 6); wallRun(-8, -6, -8, 6); wallRun(8, -6, 8, 6);
  wallRun(-8, 1, 8, 1, [[-5, 1.1], [0, 1.1], [5, 1.1]]); wallRun(-8, -1, 8, -1, [[-4.5, 1.1], [3, 2.6]]);
  wallRun(-2, 1, -2, 6); wallRun(2, 1, 2, 6); wallRun(-1, -6, -1, -1);
  const fur = (w, h, d, m, x, y, z, solid = true) => { const o = bx(w, h, d, m, x, y, z, g); if (solid) FUR.push([x, z, w / 2, d / 2]); return o; };
  const wood = MSM({ map: TX.wood, color: 0x6a4a32 }), white = MSM({ color: 0xe8e6e0, roughness: 0.4 }), steel = MSM({ color: 0xa8acb0, metalness: 0.6, roughness: 0.35 }), cloth = MSM({ color: 0x4a5a7a, roughness: 0.95 });
  // bedroom
  fur(1.5, 0.45, 2.1, wood, -6.6, 0.23, 4.2); bx(1.4, 0.2, 2.0, cloth, -6.6, 0.55, 4.2, g); bx(1.0, 0.16, 0.42, white, -6.6, 0.72, 5.0, g);
  fur(0.5, 0.55, 0.45, wood, -5.5, 0.28, 5.6);
  const clk = ctex(128, 64, (c, w, h) => { c.fillStyle = '#100'; c.fillRect(0, 0, w, h); }); ROOM.clockTx = clk; const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshBasicMaterial({ map: clk })); cm.position.set(-5.5, 0.66, 5.36); cm.rotation.y = Math.PI; g.add(cm);
  fur(0.6, 2.0, 1.6, wood, -2.4, 1.0, 3.4);
  const winM = new THREE.MeshBasicMaterial({ color: 0x0c1220 }); [[-4, 5.92, Math.PI], [-7.92, 0, Math.PI / 2], [-3.5, -5.92, 0]].forEach(([x, z, r]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), winM); w.position.set(x, 1.6, z); w.rotation.y = r; g.add(w); });
  // bathroom: sink, mirror, toilet, tub + shower curtain
  fur(1.0, 0.85, 0.5, white, 0.4, 0.43, 5.7); bx(0.4, 0.06, 0.3, steel, 0.4, 0.88, 5.7, g);
  const MIR = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), MSM({ color: 0x8a949a, metalness: 0.9, roughness: 0.12 })); MIR.position.set(0.4, 1.6, 5.9); MIR.rotation.y = Math.PI; g.add(MIR);
  const smile = ctex(256, 228, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(220,230,235,.35)'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a0a08'; c.fillStyle = '#6a0a08'; c.lineWidth = 7; c.font = 'bold 54px serif'; c.textAlign = 'center'; c.fillText('SMILE', w / 2, 66); c.beginPath(); c.arc(w / 2, 100, 70, 0.25, Math.PI - 0.25); c.stroke(); for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(w / 2 + i * 12, 158); c.lineTo(w / 2 + i * 12, 172); c.stroke(); } for (let i = 0; i < 9; i++) { const x = 40 + rand() * 176; c.fillRect(x, 70 + rand() * 90, 3, 30 + rand() * 60); } });
  ROOM.smile = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial({ map: smile, transparent: true })); ROOM.smile.position.set(0.4, 1.6, 5.88); ROOM.smile.rotation.y = Math.PI; ROOM.smile.visible = false; g.add(ROOM.smile);
  fur(0.45, 0.45, 0.6, white, 1.5, 0.23, 5.6); bx(0.45, 0.4, 0.2, white, 1.5, 0.65, 5.85, g);
  fur(0.8, 0.55, 3.2, white, -1.55, 0.28, 4.3);
  const curt = (sil) => ctex(128, 128, (c, w, h) => { c.fillStyle = '#b8c8c0'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x, 0, 3, h); } if (sil) { c.fillStyle = 'rgba(10,8,8,.75)'; c.beginPath(); c.ellipse(64, 40, 13, 16, 0.2, 0, 7); c.fill(); c.beginPath(); c.ellipse(64, 74, 20, 26, 0, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = 'rgba(10,8,8,.75)'; [[-1, 1], [1, 1]].forEach(([s]) => { c.beginPath(); c.moveTo(64 + s * 16, 66); c.lineTo(64 + s * 40, 40); c.lineTo(64 + s * 48, 118); c.stroke(); c.beginPath(); c.moveTo(64 + s * 12, 96); c.lineTo(64 + s * 34, 84); c.lineTo(64 + s * 38, 126); c.stroke(); }); } });
  ROOM.curtTx = [curt(false), curt(true)]; ROOM.curtain = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.9), MSM({ map: ROOM.curtTx[0], roughness: 0.9, side: THREE.DoubleSide })); ROOM.curtain.position.set(-1.12, 1.4, 4.3); ROOM.curtain.rotation.y = Math.PI / 2; g.add(ROOM.curtain);
  // laundry
  ROOM.washer = fur(0.7, 0.9, 0.7, white, 4, 0.45, 5.6); ROOM.dryer = fur(0.7, 0.9, 0.7, white, 5, 0.45, 5.6); [4, 5].forEach(x => { const r = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), MSM({ color: 0x20262a, metalness: 0.5, roughness: 0.2 })); r.position.set(x, 0.5, 5.24); r.rotation.y = Math.PI; g.add(r); });
  fur(0.4, 1.8, 1.4, wood, 7.7, 0.9, 3.4);
  ROOM.hair = new THREE.Group(); ROOM.hair.position.set(5, 0.3, 5.15); g.add(ROOM.hair); ROOM.hair.visible = false; for (let i = 0; i < 26; i++) { const s = bx(0.012, 0.012, 0.4 + rand() * 0.7, MSM({ color: 0x0a0908, roughness: 0.4 }), (rand() - 0.5) * 0.4, -0.28 + rand() * 0.05, -0.2 - rand() * 0.4, ROOM.hair); s.rotation.y = (rand() - 0.5) * 1.4; }
  // kitchen: counters, sink, cabinets that open by themselves, fridge, table
  fur(5.4, 0.9, 0.6, wood, -5, 0.45, -5.65); bx(5.4, 0.05, 0.62, MSM({ color: 0x3a3a3c, roughness: 0.3 }), -5, 0.92, -5.65, g); bx(0.6, 0.06, 0.4, steel, -4.5, 0.95, -5.6, g);
  for (let i = 0; i < 6; i++) sph(0.11, white, -4.62 + i * 0.05, 0.98, -5.62, g, 1, 0.15, 1);
  bx(5.4, 0.7, 0.35, wood, -5, 1.95, -5.78, g);
  ROOM.cabs = []; for (let i = 0; i < 6; i++) { const p = new THREE.Group(); p.position.set(-7.6 + i * 0.9, 1.95, -5.59); g.add(p); bx(0.86, 0.66, 0.04, MSM({ map: TX.wood, color: 0x8a6a4a }), 0.43, 0, 0, p); ROOM.cabs.push(p); }
  fur(0.8, 1.9, 0.75, white, -7.5, 0.95, -3.0); fur(1.4, 0.75, 0.9, wood, -4.3, 0.38, -2.9);
  // living room: couch, TV, lamp, front door with porch outside
  fur(0.9, 0.5, 2.2, MSM({ color: 0x6a3a2a, roughness: 0.9 }), 4.6, 0.25, -3.5); bx(0.25, 0.5, 2.2, MSM({ color: 0x6a3a2a, roughness: 0.9 }), 4.2, 0.7, -3.5, g);
  fur(0.45, 0.5, 1.6, wood, 7.65, 0.25, -3.5); bx(0.08, 0.9, 1.55, MAT.black, 7.62, 1.0, -3.5, g);
  ROOM.tvTx = ctex(128, 72, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); }); ROOM.tv = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.82), new THREE.MeshBasicMaterial({ map: ROOM.tvTx })); ROOM.tv.position.set(7.57, 1.0, -3.5); ROOM.tv.rotation.y = -Math.PI / 2; g.add(ROOM.tv);
  ROOM.door = new THREE.Group(); ROOM.door.position.set(1.0, 0, -6); g.add(ROOM.door); bx(1.0, 2.2, 0.08, MSM({ map: TX.wood, color: 0x5a3020 }), 0.5, 1.1, 0, ROOM.door); sph(0.04, steel, 0.88, 1.0, 0.06, ROOM.door);
  bx(5, 0.15, 3, MSM({ map: TX.wood, color: 0x5a4a3a }), 1.5, -0.07, -7.6, g);
  // hall: back door, pictures that fall
  bx(0.08, 2.2, 1.0, MSM({ map: TX.wood, color: 0x5a3020 }), 7.9, 1.1, 0, g);
  ROOM.frames = []; [[-6, 0.92], [-2.5, -0.92], [1.8, 0.92], [6, -0.92]].forEach(([x, z], i) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), MSM({ map: ctex(64, 80, (c, w, h) => { c.fillStyle = '#3a2a1a'; c.fillRect(0, 0, w, h); c.fillStyle = ['#a8b8c0', '#c0a888', '#98a888', '#b8a8b8'][i]; c.fillRect(6, 6, 52, 68); c.fillStyle = '#4a3a30'; c.beginPath(); c.arc(32, 34, 10, 0, 7); c.fill(); c.fillRect(22, 46, 20, 28); }), roughness: 0.6 })); f.position.set(x, 1.6, z); f.rotation.y = z > 0 ? Math.PI : 0; f.userData.p0 = f.position.clone(); g.add(f); ROOM.frames.push(f); });
  // ceiling lights, one per room (made now and only dimmed later, never added mid-game)
  ROOM.lights = {}; [['bed', -5, 3.5], ['bath', 0, 3.5], ['laundry', 5, 3.5], ['kitchen', -4.5, -3.5], ['living', 3.5, -3.5], ['hall', 0, 0], ['porch', 1.5, -7.2]].forEach(([k, x, z]) => { const l = new THREE.PointLight(k === 'porch' ? 0xffc890 : 0xffd8a8, 0, k === 'hall' ? 10 : 8, 1.5); l.position.set(x, k === 'porch' ? 2.4 : 2.45, z); g.add(l); const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6), new THREE.MeshBasicMaterial({ color: 0xfff0d0 })); b.position.set(x, WH - 0.08, z); g.add(b); ROOM.lights[k] = { l, b, on: 1, base: k === 'hall' ? 0.9 : 1.15 }; });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
function houseCollide(x, z, r) { if (G.chore >= 10) return [x, z]; let lx = x - HX, lz = z - HZ; for (const [cx, cz, hx, hz] of WALLS.concat(FUR)) { const dx = lx - cx, dz = lz - cz, px = hx + r - Math.abs(dx), pz = hz + r - Math.abs(dz); if (px > 0 && pz > 0) { if (px < pz) lx += Math.sign(dx || 1) * px; else lz += Math.sign(dz || 1) * pz; } } return [HX + clamp(lx, -7.7, 7.7), HZ + clamp(lz, -5.7, 5.7)]; }
// the Grinner — the Creeping Grinner model: crawls on all fours like a spider, never stops smiling,
// and when it grins its head turns upside down. It giggles when it notices you looking.
const CRP = MON.makeCreeper(); CRP.g.scale.setScalar(1.3); CRP.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
CRP.stepCb = () => { if (CRP.g.visible && rand() < 0.5) SND.crawl(clamp((CRP.g.position.x - P.x) * 0.2, -0.8, 0.8)); };
const GRIN = CRP.g;
GRIN.userData = { head: CRP.head, gT: 0, update: (dt, scare) => { const u = GRIN.userData; u.gT = Math.max(0, u.gT - dt); CRP.grin += ((scare || u.gT > 0 ? 1 : 0) - CRP.grin) * Math.min(1, dt * (scare ? 20 : 4)); CRP.update(dt); } };
function grinGiggle() { GRIN.userData.gT = 1.6; SND.giggle && SND.giggle(9, 0.25); }

function grinAt(lx, lz, yaw, y) { CRP.limbs.forEach(l => { l.F.copy(l.rest); l.stepping = false; }); GRIN.visible = true; GRIN.position.set(HX + lx, y || 0, HZ + lz); GRIN.rotation.set(0, yaw, 0); }

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
  if (G.obj === 48) { if (G.chore == null) G.chore = 0; if (G.chore > 8) G.chore = 8; enterRoom(); resetHouse(); G.night = { t: 0 }; }
  ch3Env();
}
function ch3Env() {
  const city = P.x < -1000 && !P.inRoom, room = !!P.inRoom; CITY.visible = city; ROOM.visible = room;
  if (city) { W.swamp.visible = false; scene.fog.color.setHex(0x232838); scene.fog.density = 0.0065; hemi.intensity = 0.55; moon.intensity = 0.35; CITY.porch.intensity = 1.5; }
  if (room) { W.swamp.visible = false; scene.fog.color.setHex(0x050608); scene.fog.density = 0.03; hemi.intensity = 0.14; moon.intensity = 0; scene.environment = null; }
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

// ---------- the night: chores around the house… and things start getting wrong ----------
const clockEl = document.createElement('div'); clockEl.id = 'clock3'; clockEl.style.cssText = 'display:none;position:fixed;right:18px;top:70px;z-index:20;font:600 28px Oswald,sans-serif;color:#e8e0d0;text-shadow:0 2px 8px #000;pointer-events:none'; document.body.appendChild(clockEl);
const CHORES = [
  { t: 'Lock the front door', p: [1.5, -5.3], time: '11:00 PM', after: () => evKnock() },
  { t: 'Wash the dishes in the kitchen', p: [-4.5, -4.9], hold: 4, time: '11:15 PM', after: () => evCabinets() },
  { t: 'Close the kitchen cabinets', p: [-5, -4.9], hold: 1.2, time: '11:25 PM', after: () => { HOU.cab = 0; SND.thud(); HOU.glimpse = true; say('There. Closed. All of them.', 2.4, 'You'); } },
  { t: 'Move the wet laundry into the dryer', p: [4.4, 4.9], hold: 3, time: '11:50 PM', after: () => evDryer() },
  { t: 'Turn the dryer off', p: [5, 4.9], time: '12:10 AM', after: () => evHair() },
  { t: 'Brush your teeth', p: [0.4, 5.0], hold: 3.5, time: '12:35 AM', after: () => evMirror() },
  { t: 'Check behind the shower curtain', p: [-0.5, 4.3], hold: 1, time: '12:40 AM', after: () => evCurtain() },
  { t: 'Turn off the TV in the living room', p: [6.6, -3.5], time: '1:10 AM', after: () => evTV() },
  { t: 'Go to bed', p: [-5.6, 4.0], time: '1:30 AM', after: () => evBed() },
  { t: 'RUN — unlock the front door!', p: [1.5, -5.3], hold: 0.8, time: '3:33 AM', after: () => evEscape() }
];
CHORES.forEach((c, i) => addIt({ x: HX + c.p[0], z: HZ + c.p[1], r: i === 9 ? 1.6 : 1.5, hold: c.hold || 0, label: c.t.replace('RUN — ', ''), cond: () => G.obj === 48 && P.inRoom && G.chore === i && !HOU.busy, act: () => { SND.pickup(); G.chore = i + 1; setObj(48); CHORES[i].after(); } }));
function choreSpot() { const c = CHORES[G.chore]; return c ? { x: HX + c.p[0], y: 1, z: HZ + c.p[1] } : null; }
const LATER = []; function later(fn, ms) { LATER.push({ t: ms / 1000, fn }); }
const LX = () => P.x - HX, LZ = () => P.z - HZ, FWD = () => V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
function facing(lx, lz, dot = 0.8) { const v = V3(lx - LX(), 0, lz - LZ()); const d = v.length(); v.normalize(); return FWD().dot(v) > dot && d; }
function setLights(on) { for (const k in ROOM.lights) if (k !== 'porch') ROOM.lights[k].on = on; }
function grinCeil(lx, lz, yaw) { grinAt(lx, lz, yaw, WH - 0.02); GRIN.rotation.z = Math.PI; }
function grinWhisper(pan) { SND.whisper(pan || 0); try { if (window.speechSynthesis && settings.voice !== false) { const u = new SpeechSynthesisUtterance(pick(['I like your house', 'smile for me', 'I can see you', 'don’t go to bed', 'you left the door open', 'I live here now'])); u.pitch = 0.1; u.rate = 0.55; u.volume = 0.32; if (VOICE.you) u.voice = VOICE.you; speechSynthesis.speak(u); } } catch (e) {} }
// --- the creepy things that happen after each chore ---
function evKnock() { SND.unlock(); say('Locked. Chain on.', 2, 'You'); later(() => { if (G.obj !== 48) return; SND.knock(0); say('…', 1.2, ''); say('Who is knocking at eleven at night?', 2.8, 'You'); later(() => { if (G.obj !== 48) return; SND.knock(-0.4); later(() => { say('Nobody on the porch. I can see the whole porch.', 3, 'You'); say('Dishes. Just do the dishes.', 2.4, 'You'); }, 1500); }, 3500); }, 2200); }
function evCabinets() { SND.pour(); say('Done.', 1.4, 'You'); HOU.busy = true; later(() => { HOU.cab = 1; SND.thud(); SND.thud(); SND.stinger(); P.shake = 0.5; HOU.flick.kitchen = 0.8; later(() => { say('Every cabinet just opened. At the same time.', 3, 'You'); say('…right behind me.', 2, 'You'); HOU.busy = false; }, 900); }, 900); }
function evDryer() { SND.thud(); say('Laundry in.', 1.6, 'You'); later(() => { if (G.obj !== 48) return; HOU.dryer = true; say('…I didn’t turn it on.', 2.4, 'You'); say('Something’s banging around inside. Shoes? I didn’t put shoes in.', 3.4, 'You'); }, 1800); }
function evHair() { HOU.dryer = false; SND.creak(0.3); ROOM.hair.visible = true; SND.stinger(); say('Hair. Long black hair. Handfuls of it.', 3, 'You'); say('That is NOT mine.', 2, 'You'); later(() => { if (G.obj === 48) grinGiggle(); }, 3500); }
function evMirror() { SND.pour(); HOU.busy = true; setLights(0); SND.thud(); later(() => { setLights(1); ROOM.smile.visible = true; ROOM.curtain.material.map = ROOM.curtTx[1]; SND.stinger(); say('The lights came back on and the mirror—', 2.6, 'You'); say('“SMILE.” Written in the fog. From the INSIDE of the mirror.', 3.6, 'You'); say('…and there’s a shape behind the shower curtain.', 3, 'You'); HOU.busy = false; }, 2200); }
function evCurtain() { SND.whoosh(); ROOM.curtain.position.z = 5.0; ROOM.curtain.scale.x = 0.45; ROOM.curtain.material.map = ROOM.curtTx[0]; say('…', 1, ''); say('Empty. Just water dripping.', 2.4, 'You'); later(() => { if (G.obj !== 48) return; HOU.tv = true; SND.hiss(0.6); say('…the TV just turned on. By itself.', 2.8, 'You'); }, 3500); }
function evTV() { HOU.tv = false; drawTV(false); HOU.busy = true; G.mode = 'cut'; const y0 = P.yaw;
  runScene((S, dt) => { GRIN.userData.update(dt, S.t > 3.3);
    if (at(S, 0.3, 'a')) { say('Black screen.', 1.4, 'You'); say('…there’s a reflection in it. Above me.', 2.6, 'You'); grinCeil(4.2, -3.5, -Math.PI / 2); }
    if (S.t > 2.6) { const k = Math.min(1, (S.t - 2.6) / 0.9); P.yaw = y0 + Math.PI * (k * k * (3 - 2 * k)); P.pitch = lerp(0, 0.75, k); }
    if (at(S, 3.5, 'g')) { grinGiggle(); SND.stinger(); P.shake = 0.6; rumble(0.8, 0.8, 500); }
    if (S.t > 4.6) { CRP.v = 3; GRIN.position.x -= dt * 4.5; GRIN.rotation.y = -Math.PI / 2; }
    if (at(S, 4.6, 'run')) SND.crawl(-0.4);
    if (at(S, 6.2, 'e')) { GRIN.visible = false; CRP.v = 0; GRIN.rotation.z = 0; SCN = null; G.mode = 'play'; HOU.busy = false; P.pitch = 0; say('It was on the ceiling. It was SMILING at me.', 3, 'You'); say('Bed. Lock the bedroom door and get under the covers. Please be a dream.', 3.6, 'You'); setLights(0.35); } });
}
function evBed() { HOU.busy = true; G.mode = 'cut'; P.light = false; clearSubs();
  runScene((S, dt) => { GRIN.userData.update(dt, S.t > 9.6);
    if (at(S, 0.1, 'f')) fade(1);
    if (at(S, 1.3, 'lie')) { setLights(0); ROOM.lights.bed.l.color.setHex(0x5a74b8); ROOM.lights.bed.on = 0.55; P.x = HX - 6.6; P.z = HZ + 4.75; P.y = -0.95; P.yaw = 0; P.pitch = 1.0; G.chore = 9; G.clockOv = '3:33 AM'; }
    if (at(S, 2.2, 'u')) { fade(0); say('*3:33 AM*', 2, ''); }
    if (at(S, 3.6, 'c')) { SND.crawl(-0.3); SND.crawl(0.2); }
    if (at(S, 4.8, 'l')) say('…something is crawling on the ceiling.', 2.8, 'You');
    if (at(S, 5.2, 'sh')) { grinCeil(-6.6, 1.9, 0); }
    if (S.t > 5.2 && S.t < 9.2) { GRIN.position.z = HZ + lerp(1.9, 3.7, (S.t - 5.2) / 4); CRP.v = 0.35; P.pitch = lerp(1.0, 0.75, Math.min(1, (S.t - 5.2) / 3)); }
    if (at(S, 9.2, 'stop')) { CRP.v = 0; grinWhisper(0); }
    if (at(S, 9.7, 'grin')) { grinGiggle(); SND.stinger(); rumble(0.6, 0.6, 400); }
    if (at(S, 10.6, 'drop')) { ROOM.lights.bed.on = 0.3; SND.hollowScream(1); SND.thud(); P.shake = 1; rumble(1, 1, 700); $('hurt').style.opacity = 0.8; GRIN.rotation.z = 0; GRIN.position.set(HX - 6.6, 0.5, HZ + 3.3); }
    if (at(S, 11.1, 'up')) { P.x = HX - 5.0; P.z = HZ + 2.6; P.y = 0; P.yaw = Math.atan2(-(-5.0 + 6.6), -(2.6 - 3.3)) + Math.PI; P.pitch = -0.1; P.light = true; say('RUN!', 1.6, 'You'); }
    if (at(S, 11.9, 'go')) { SCN = null; G.mode = 'play'; HOU.busy = false; P.yaw = 0; setObj(48); $('hurt').style.opacity = 0; HOU.chase = { wait: 1.1, trail: [[P.x, P.z]], stall: 0, lit: 0 }; GRIN.position.y = 0; hint('Run to the front door! Shine your light on it to slow it down', 4); grinGiggle(); } });
}
function evEscape() { HOU.chase = null; HOU.busy = true; G.mode = 'cut'; SND.unlock(); SND.door();
  runScene((S, dt) => { GRIN.userData.update(dt, S.t > 2.6);
    ROOM.door.rotation.y = -Math.min(1.6, S.t * 4);
    if (S.t < 1.4) { const k = Math.min(1, S.t / 1.4); P.x = HX + 1.5; P.z = HZ + lerp(-5.3, -9.0, k); P.yaw = 0; P.pitch = -0.05; }
    if (at(S, 0.05, 'p')) { ROOM.lights.porch.on = 1; GRIN.visible = false; }
    if (at(S, 1.5, 't')) say('*gasp*', 1.2, 'You');
    if (S.t > 1.6) { const k = Math.min(1, (S.t - 1.6) / 0.8); P.yaw = Math.PI * k; }
    if (at(S, 2.3, 'g')) { grinAt(1.5, -4.3, Math.PI); grinGiggle(); SND.stinger(); }
    if (S.t > 4.4) ROOM.door.rotation.y = -1.6 + Math.min(1.6, (S.t - 4.4) * 0.55);
    if (at(S, 4.4, 'w')) grinWhisper(0);
    if (at(S, 7.4, 'cl')) { SND.thud(); GRIN.visible = false; }
    if (at(S, 8.2, 'end')) { SCN = null; winNight(); } });
}
function drawTV(on) { const c = ROOM.tvTx.image.getContext('2d'), w = 128, h = 72; if (!on) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); ROOM.tvTx.needsUpdate = true; return; } const im = c.createImageData(w, h); for (let i = 0; i < im.data.length; i += 4) { const v = rand() * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); if (rand() < 0.35) { c.fillStyle = 'rgba(230,225,215,.85)'; c.beginPath(); c.ellipse(64, 34, 16, 21, 0, 0, 7); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(57, 29, 2.5, 0, 7); c.arc(71, 29, 2.5, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(64, 32, 12, 0.3, Math.PI - 0.3); c.stroke(); } ROOM.tvTx.needsUpdate = true; }
// --- entering the house ---
function enterRoom() { P.inRoom = true; CAR.g.visible = false; CITY.visible = false; P.x = HX + 1.5; P.z = HZ - 4.6; P.y = 0; P.yaw = Math.PI; P.pitch = -0.05; P.falling = false; P.held = false; ch3Env(); }
function resetHouse() { LATER.length = 0; HOU.busy = false; HOU.cab = 0; HOU.dryer = false; HOU.tv = false; HOU.glimpse = false; HOU.peek = null; HOU.chase = null; HOU.amb = 18; HOU.flick = {}; G.clockOv = null; ROOM.cabs.forEach(c => c.rotation.y = 0); ROOM.hair.visible = G.chore >= 5; ROOM.smile.visible = G.chore >= 6; ROOM.curtain.material.map = ROOM.curtTx[0]; ROOM.curtain.position.z = G.chore >= 7 ? 5.0 : 4.3; ROOM.curtain.scale.x = G.chore >= 7 ? 0.45 : 1; ROOM.door.rotation.y = 0; ROOM.frames.forEach((f, i) => { f.position.copy(f.userData.p0); f.rotation.set(0, f.position.z > 0 ? Math.PI : 0, 0); f.userData.fell = false; }); drawTV(false); ROOM.lights.bed.l.color.setHex(0xffd8a8); for (const k in ROOM.lights) ROOM.lights[k].on = k === 'porch' ? 0 : G.chore >= 8 ? 0.35 : 1; GRIN.visible = false; GRIN.rotation.set(0, 0, 0); CRP.v = 0; }
function startNight(restored) {
  clearSubs(); if (!restored || G.chore == null) G.chore = 0; if (G.chore > 8) G.chore = 8; enterRoom(); resetHouse(); setObj(48); G.night = { t: 0 }; P.light = false; fade(0); SND.set('rain', 0.05, 1);
  if (restored) { G.mode = 'play'; say(['Okay. Lock up.', 'Dishes.', 'Close them. Close them all.', 'Laundry.', 'Turn the dryer off…', 'Teeth. Then bed.', 'The shower curtain…', 'The TV…', 'Bed. Now.'][G.chore], 2.4, 'You'); return; }
  G.mode = 'cut'; runScene((S, dt) => {
    if (at(S, 0.4, 'a')) { SND.door(); say('Home. My own house. No forest, no swamp, no monsters.', 3.4, 'You'); }
    if (at(S, 4, 'b')) say('Okay. Lock up, clean up, laundry, teeth, bed. Normal stuff.', 3.4, 'You');
    if (at(S, 7.6, 'go')) { SCN = null; G.mode = 'play'; hint('Do your chores around the house · F flashlight', 5); } });
}
// --- every frame inside the house ---
function inHall() { return Math.abs(LZ()) < 1; }
function updateNight(dt) {
  if (G.obj !== 48 || !P.inRoom) { clockEl.style.display = 'none'; return; }
  if (!G.night) return; const ch = Math.min(G.chore, 9); clockEl.style.display = 'block'; clockEl.textContent = G.clockOv || (CHORES[ch] ? CHORES[ch].time : '3:33 AM');
  const hr = clockEl.textContent; if (ROOM.clockTx._h !== hr) { const c = ROOM.clockTx.image.getContext('2d'); c.fillStyle = '#100'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff3020'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.fillText(hr.replace(/ [AP]M/, ''), 64, 44); ROOM.clockTx.needsUpdate = true; ROOM.clockTx._h = hr; }
  P.held = false;
  // lights (with flickers)
  for (const k in ROOM.lights) { const L = ROOM.lights[k]; let v = L.on * L.base; if (HOU.flick[k] > 0) { HOU.flick[k] -= dt; v *= rand() < 0.5 ? 0.05 : 1; } L.l.intensity += (v * (k === 'porch' ? 2 : 1) - L.l.intensity) * Math.min(1, dt * 18); L.b.visible = L.l.intensity > 0.15; }
  ROOM.cabs.forEach((c, i) => { c.rotation.y += (-HOU.cab * (1.2 + (i % 3) * 0.2) - c.rotation.y) * Math.min(1, dt * (HOU.cab ? 14 : 6)); });
  if (HOU.tv) { HOU.tvT -= dt; if (HOU.tvT <= 0) { HOU.tvT = 0.07; drawTV(true); if (rand() < 0.08) SND.hiss(0.6); } }
  if (HOU.dryer) { HOU.dT -= dt; ROOM.dryer.position.x = 5 + Math.sin(G.time * 40) * 0.01; if (HOU.dT <= 0) { HOU.dT = 0.5 + rand() * 0.5; SND.thud(); } }
  if (G.mode === 'play' || G.mode === 'cut') for (let i = LATER.length - 1; i >= 0; i--) { if ((LATER[i].t -= dt) <= 0) { const f = LATER[i].fn; LATER.splice(i, 1); f(); } }
  if (G.mode !== 'play') return; G.night.t += dt;
  if (curIt && curIt.hold && useHeld()) { if (G.chore === 1) HOU.flick.kitchen = Math.max(HOU.flick.kitchen || 0, rand() < 0.02 ? 0.4 : 0); if (G.chore === 5 && rand() < 0.01) SND.knock(0.5); }
  // the hallway: after the cabinets it's on the ceiling at the end of the hall, then scurries off
  if (HOU.glimpse && inHall() && !HOU.peek) { HOU.glimpse = false; const s = FWD().x > 0 ? 1 : -1, x = clamp(LX() + s * 6, -7.3, 7.3); grinCeil(x, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2); HOU.peek = { t: 0, s, kind: 'hall' }; SND.crawl(s * 0.6); }
  if (HOU.peek) { const pk = HOU.peek; pk.t += dt; GRIN.userData.update(dt, false);
    if (pk.kind === 'hall') { if (pk.t > 0.8 && !pk.g) { pk.g = 1; grinGiggle(); remark(['It’s ON THE CEILING—', 'What is THAT?!'], 1); P.shake = 0.3; } if (pk.t > 1.6) { CRP.v = 3.5; GRIN.position.x += pk.s * dt * 6; GRIN.rotation.y = pk.s > 0 ? Math.PI / 2 : -Math.PI / 2; } if (pk.t > 3.2) { GRIN.visible = false; GRIN.rotation.z = 0; CRP.v = 0; HOU.peek = null; } }
    else if (pk.t > (P.light && facing(GRIN.position.x - HX, GRIN.position.z - HZ, 0.9) ? 0.5 : 1.6)) { if (!pk.g) grinGiggle(); GRIN.visible = false; HOU.peek = null; } }
  // random creepy stuff, more and worse with every chore
  HOU.amb -= dt; if (HOU.amb <= 0 && !HOU.chase && !HOU.busy) { HOU.amb = Math.max(9, 24 - G.chore * 1.8) + rand() * 8; ambient(); }
  if (HOU.chase) updateChase(dt);
}
function ambient() {
  const c = G.chore, opts = ['knock', 'creak', 'flick'];
  if (c >= 2) opts.push('frame', 'crawl'); if (c >= 3) opts.push('whisper', 'peek'); if (c >= 5) opts.push('giggle', 'peek', 'flick');
  const e = pick(opts);
  if (e === 'knock') { SND.knock(rand() * 2 - 1); remark(['…knocking. Inside the walls?', 'Something knocked.'], 0.6); }
  if (e === 'creak') SND.creak(rand() * 2 - 1);
  if (e === 'flick') { const ks = Object.keys(ROOM.lights).filter(k => k !== 'porch'); HOU.flick[pick(ks)] = 1.2; SND.buzz && SND.buzz(0); }
  if (e === 'crawl') { for (let i = 0; i < 4; i++) later(() => SND.crawl(rand() - 0.5), i * 220); remark(['Something is crawling above the ceiling.', 'The attic. Something’s in the attic.'], 0.8); }
  if (e === 'whisper') grinWhisper(rand() - 0.5);
  if (e === 'giggle') grinGiggle();
  if (e === 'frame') { const f = ROOM.frames.find(f => !f.userData.fell); if (f) { f.userData.fell = true; f.position.y = 0.02; f.position.z *= 0.6; f.rotation.set(-Math.PI / 2, 0, rand() * 6); SND.thud(); SND.clink(); remark(['A picture just fell off the wall.'], 1); } }
  if (e === 'peek' && !HOU.peek) { const doors = [[-5, 1.6], [0, 1.6], [5, 1.6], [-4.5, -1.6], [3, -1.8], [-7.3, 0], [7.3, 0]]; const ok = doors.filter(([x, z]) => { const d = facing(x, z, 0.85); return d && d > 4 && d < 11; }); if (ok.length) { const [x, z] = pick(ok); grinAt(x, z, Math.atan2(LX() - x, LZ() - z)); HOU.peek = { t: 0, kind: 'peek' }; SND.creak(0); } }
}
// --- the chase: it follows the exact path you ran ---
function updateChase(dt) { const C2 = HOU.chase; const last = C2.trail[C2.trail.length - 1]; if (Math.hypot(P.x - last[0], P.z - last[1]) > 0.3) C2.trail.push([P.x, P.z]);
  GRIN.userData.update(dt, false);
  if (C2.wait > 0) { C2.wait -= dt; return; }
  const lit = P.light && facing(GRIN.position.x - HX, GRIN.position.z - HZ, 0.88) && Math.hypot(GRIN.position.x - P.x, GRIN.position.z - P.z) < 9; if (lit && C2.lit <= 0) { C2.stall = 0.7; C2.lit = 2.5; grinGiggle(); } C2.lit -= dt;
  let mv = (C2.stall > 0 ? 0 : 4.7) * dt; C2.stall -= dt; CRP.v = mv / dt / 1.3;
  while (mv > 0 && C2.trail.length) { const [tx, tz] = C2.trail[0], dx = tx - GRIN.position.x, dz = tz - GRIN.position.z, d = Math.hypot(dx, dz); if (d <= mv) { GRIN.position.x = tx; GRIN.position.z = tz; mv -= d; C2.trail.shift(); } else { GRIN.position.x += dx / d * mv; GRIN.position.z += dz / d * mv; GRIN.rotation.y = Math.atan2(dx, dz); mv = 0; } }
  if (!C2.trail.length) C2.trail.push([P.x, P.z]);
  if (rand() < dt * 3) SND.crawl(0); SND.set('breath', 0.3, 0.2);
  if (Math.hypot(GRIN.position.x - P.x, GRIN.position.z - P.z) < 0.85) grinScare();
}
function grinScare() {
  HOU.chase = null; G.mode = 'cut'; SND.set('breath', 0, 0.1); const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  runScene((S, dt) => { const k = Math.min(1, S.t / 0.2); GRIN.visible = true; GRIN.rotation.set(0, Math.atan2(-fx, -fz), 0); GRIN.userData.update(dt, true); GRIN.updateMatrixWorld(true); const hp = GRIN.userData.head.getWorldPosition(V2), d = lerp(2.4, 0.42, k); GRIN.position.x += camera.position.x + fx * d - hp.x; GRIN.position.y += camera.position.y + 0.02 - hp.y; GRIN.position.z += camera.position.z + fz * d - hp.z; P.shake = 1;
    if (at(S, 0.02, 'scr')) { SND.giggle && SND.giggle(5, 0.3); SND.scream && SND.scream(); SND.hollowScream(1.2); rumble(1, 1, 1000); $('hurt').style.opacity = 1; }
    if (at(S, 1.1, 'dead')) { SCN = null; GRIN.visible = false; G.deaths++; G.chore = 8; showDead('The Grinner caught you. Sprint for the front door — and shine your flashlight back at it to make it stop for a second.'); } });
}
function winNight() {
  G.mode = 'cut'; SND.set('breath', 0, 0.2); GRIN.visible = false; SND.bell && SND.bell(0);
  setTimeout(() => { G.ch3done = true; checkpoint(); clearCh3(G.slot); G.mode = 'win'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; clockEl.style.display = 'none';
    $('winH').textContent = 'Chapter 3 Complete'; $('winT').innerHTML = 'You got out of the house.<br>The neighbors found you on their porch at 3:40 AM, barefoot and shaking.<br>When the police went inside, every light was on. Every cabinet was open.<br>And on the bathroom mirror, written from the inside: <b>SEE YOU SOON.</b><br><br>Time: ' + fmtT(G.time) + ' · Deaths: ' + G.deaths + '<br><br><b>Thanks for playing Hollow Pines.</b>'; $('win').style.display = 'grid'; try { document.exitPointerLock(); } catch (e) {} }, 1200);
}
// ---------- hooks ----------
function updateCh3(dt) {
  if (G.obj < 43) return;
  if (FLARE) { FLARE.t += dt; FLARE.v.y -= 6 * dt; FLARE.m.position.addScaledVector(FLARE.v, dt); spray(FIREP, FLARE.m.position.x, FLARE.m.position.y, FLARE.m.position.z, 2, 0.6); if (FLARE.t > 12) { FLARE.m.visible = false; FLARE_L.intensity = 0; FLARE = null; } }
  updateCar(dt); updateNight(dt); if (GRIN.visible && G.mode !== 'cut') GRIN.userData.update(dt, false);
  if (CITY.visible) { let best = []; for (const [x, z] of CITYL) { const d = Math.abs(x - P.x) + Math.abs(z - P.z); if (d < 120) best.push([d, x, z]); } best.sort((a, b) => a[0] - b[0]); CITY.lights.forEach((l, i) => { const b = best[i]; if (b) { l.position.set(b[1], 6.6, b[2]); l.intensity = 1.6; } else l.intensity = 0; }); }
  if (G.obj === 43 && flareBoat) flareBoat.userData.gl.visible = true;
}
function ch3Hint() { if (G.obj === 43 && FLG) return { k: 'boat', p: { x: FLG.x, y: H(FLG.x, FLG.z) + 0.8, z: FLG.z } }; if (G.obj === 46) return { k: 'car', p: { x: CAR0.x, y: 1.4, z: CAR0.z } }; if (G.obj === 48 && !HOU.chase) { const p = choreSpot(); return p ? { k: 'ch' + G.chore, p } : null; } return null; }
window.HP4 = { CITY, CAR, ROOM, GR, GRIN, playChapter3, ch3FireFlare, flight, landCity, arriveHome, startNight, winNight, HOU, CHORES, houseCollide, evBed, HOME, HELIPAD, cityCollide };
