'use strict';
/* Hollow Pines — Chapter 2 monsters.
   The Hollow One: rips a deer in half, kills the Tall Man, leaps off the water tower and chases you.
   The Mire Walker: grabs your legs in the deep water, gets burned by acid, and dies with a shot to the head. */
const HOL = MON.makeHollow(); HOL.g.scale.setScalar(0.85);
const MIRE = MON.makeMire(); MIRE.g.scale.setScalar(0.9);
// only the big body parts cast shadows (so the flashlight throws a real shadow of them) — the small bits would just cost speed
[HOL.g, MIRE.g].forEach(g => g.traverse(o => { if (o.isMesh) o.castShadow = !!(o.geometry.attributes.position && o.geometry.attributes.position.count > 1500); }));
cr.g.rotation.order = 'YXZ';
const HOLL = new THREE.PointLight(0xc8d4ff, 0, 14, 1.6); scene.add(HOLL);
const HS = { state: 'off', x: 0, z: 0, yaw: 0, t: 0, stag: 0, scrT: 6, tx: 0, tz: 0 };
const MS = { state: 'off', x: 0, z: 0, yaw: 0, hp: 3, t: 0, tugT: 3, tug: null, stag: 0, goreT: 0 };
const SWL = (lx, lz) => ({ x: SW.x + lx, z: SW.z + lz });
const ACIDP = makeParticles(0x9cff40, 400, 0.13), MUDP = makeParticles(0x2c261a, 300, 0.12);
const FLESH = MSM({ color: 0x5a0606, roughness: 0.22, metalness: 0.05, emissive: 0x120000, side: THREE.DoubleSide });
const GUTS = MSM({ color: 0x9a4646, roughness: 0.28 }), BONEM = MSM({ color: 0xd8cfbc, roughness: 0.5 });
const GOREOBJ = [], CHUNKS = [];
const V2 = new THREE.Vector3(), V4 = new THREE.Vector3(), V5 = new THREE.Vector3();
let SCN = null;
function runScene(f, data) { SCN = Object.assign({ f, t: 0, ev: {} }, data || {}); }
const at = (S, t, key) => S.t >= t && !S.ev[key] && (S.ev[key] = true);
function lookAtPt(x, y, z) { const dx = x - P.x, dz = z - P.z; return { yaw: Math.atan2(-dx, -dz), pitch: clamp(Math.atan2(y - (P.y + 1.65), Math.hypot(dx, dz)), -1.2, 1.3) }; }
const wadeAt = (x, z) => clamp(1 + Math.min(0, H(x, z)) * 0.55, 0.5, 1);

// ---------- props: intake valves, acid jugs, pour point ----------
const VALVES = [SWL(107, -123), SWL(121, -121.5), SWL(134, -127), SWL(113, -138), SWL(129, -139)];
const GRATES = [SWL(104, -145.5), SWL(117, -147.5), SWL(129, -146)];
const ACIDJ = SWL(113.4, -186.4), POURP = SWL(106.5, -146.5), ACIDC = SWL(114, -134);
const valveM = VALVES.map(v => {
  const g = new THREE.Group(); g.position.set(v.x, 0, v.z); W.swamp.add(g);
  cyl(0.12, 0.14, 2.2, 8, MAT.rust, 0, -0.5, 0, g); cyl(0.2, 0.2, 0.12, 10, MAT.rust, 0, 0.55, 0, g);
  const wheel = new THREE.Group(); wheel.position.y = 0.72; g.add(wheel); const wm = MSM({ color: 0x7a1a12, roughness: 0.6, metalness: 0.4 });
  const ring = mk(new THREE.TorusGeometry(0.32, 0.035, 6, 20), wm, 0, 0, 0, wheel); ring.rotation.x = Math.PI / 2;
  for (let k = 0; k < 3; k++) { const sp = cyl(0.02, 0.02, 0.64, 5, wm, 0, 0, 0, wheel); sp.rotation.set(Math.PI / 2, 0, k * Math.PI / 3); }
  g.userData.gl = glint(v.x, 1.4, v.z); g.userData.gl.visible = false; g.userData.wheel = wheel; return g;
});
const gunkM = MSM({ color: 0x2a1c12, roughness: 0.35 }), gunkB = MSM({ color: 0x4a0808, roughness: 0.25, emissive: 0x0a0000 });
const grateM = GRATES.map(v => {
  const g = new THREE.Group(); g.position.set(v.x, 0, v.z); g.rotation.y = rand() * 0.6 - 0.3; W.swamp.add(g);
  bx(2.2, 0.16, 0.3, MAT.rust, 0, 0.75, 0, g); bx(2.2, 0.16, 0.3, MAT.rust, 0, -0.4, 0, g); bx(0.16, 1.4, 0.3, MAT.rust, -1.05, 0.15, 0, g); bx(0.16, 1.4, 0.3, MAT.rust, 1.05, 0.15, 0, g);
  for (let k = -3; k <= 3; k++) cyl(0.03, 0.03, 1.2, 5, MAT.rust, k * 0.28, 0.15, 0, g).castShadow = false;
  const gunk = new THREE.Group(); g.add(gunk); for (let k = 0; k < 7; k++) sph(0.22 + rand() * 0.18, k % 3 ? gunkM : gunkB, (rand() - 0.5) * 1.5, 0.05 + rand() * 0.45, 0.25, gunk, 1, 0.7, 0.6);
  for (let k = 0; k < 3; k++) { const b = cyl(0.025, 0.03, 0.5, 5, BONEM, (rand() - 0.5) * 1.2, 0.4 + rand() * 0.3, 0.32, gunk); b.rotation.z = rand() * 3; }
  g.userData.gunk = gunk; g.userData.gl = glint(v.x, 1.6, v.z); g.userData.gl.visible = false; return g;
});
function nearestGrate() { let b = null, bd = 1e9; GRATES.forEach((v, i) => { if ((G.grates || []).includes(i)) return; const d = Math.hypot(v.x - P.x, v.z - P.z); if (d < bd) { bd = d; b = v; } }); return b || GRATES[0]; }
function clearGrate(i) {
  G.grates = G.grates || []; G.grates.push(i); const g = grateM[i]; g.userData.gunk.visible = false; g.userData.gl.visible = false; refreshObj();
  SND.splat(0); SND.crunch(0); spray(BLOOD, GRATES[i].x, 0.5, GRATES[i].z, 30, 2.5); chunk(GRATES[i].x, 0.5, GRATES[i].z, 3, FLESH, 0.1); chunk(GRATES[i].x, 0.5, GRATES[i].z, 3, BONEM, 0.07); bloodPool(GRATES[i].x, GRATES[i].z, 1.4, 2, 0.02);
  const n = G.grates.length;
  const lines = ['Ugh — bones. Deer bones… I think.', 'That’s a HAND. A human hand… with a wedding ring on it.', 'That’s the last one. Something’s been dragging bodies down here and stuffing them in the pipes.'];
  say(lines[n - 1], 3.6, 'You'); MS.tugT = Math.min(MS.tugT, 2);
  if (n < 3) { checkpoint(); return; }
  G.mode = 'cut'; SND.thud(); setTimeout(() => SND.sputter(), 700);
  setTimeout(() => { SND.radioBlip(); say('Kid, you still there? If that pump’s still choking, something is NESTING in that basin.', 4.4, 'Radio'); say('There’s acid in the pump house — the stuff we used to clear the pipes. Grab a jug and dump it in the basin.', 4.6, 'Radio'); say('It’ll burn out anything living in there.', 2.8, 'Radio'); G.mode = 'play'; setObj(29); }, 1600);
}
GRATES.forEach((v, i) => addIt({ x: v.x, z: v.z, r: 2.4, hold: 3.4, label: 'Pull the rotten gunk out of the grate', cond: () => G.obj === 33 && !(G.grates || []).includes(i) && !MS.tug, act: () => clearGrate(i) }));
function makeJug() { const g = new THREE.Group(); const jm = MSM({ color: 0x4a9a32, roughness: 0.35 }); bx(0.26, 0.36, 0.18, jm, 0, 0.18, 0, g); cyl(0.04, 0.05, 0.08, 8, MSM({ color: 0x111111 }), 0.06, 0.4, 0, g); bx(0.04, 0.12, 0.12, jm, -0.08, 0.38, 0, g); const lab = bx(0.18, 0.14, 0.005, MSM({ color: 0xf0d020, roughness: 0.6 }), 0, 0.2, 0.093, g); bx(0.06, 0.06, 0.004, MSM({ color: 0x111111 }), 0, 0.2, 0.097, g); return g; }
const acidPick = makeJug(); acidPick.position.set(ACIDJ.x, H(ACIDJ.x, ACIDJ.z) + 0.72, ACIDJ.z); W.swamp.add(acidPick); acidPick.userData.gl = glint(ACIDJ.x, H(ACIDJ.x, ACIDJ.z) + 1.4, ACIDJ.z); acidPick.userData.gl.visible = false;
{ [[0, 0], [0.75, 0.3], [-0.7, 0.2]].forEach(([a, b], i) => { const d = cyl(0.3, 0.3, 0.9, 14, MSM({ color: i ? 0x2f6a24 : 0x3a7a2a, roughness: 0.55, metalness: 0.3 }), ACIDJ.x + a, H(ACIDJ.x, ACIDJ.z) + 0.25, ACIDJ.z + b - 0.15, W.swamp); d.position.y = H(ACIDJ.x + a, ACIDJ.z + b) + 0.25 - 0.05 + 0.2; }); }
W.fpAcid = makeJug(); W.fpAcid.position.set(-0.28, -0.6, -0.55); W.fpAcid.rotation.y = 0.5; W.fpAcid.visible = false; W.rig.add(W.fpAcid);
const acidPool = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fb81c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); acidPool.position.set(ACIDC.x, 0.03, ACIDC.z); W.swamp.add(acidPool);
const shock = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfb8a0, transparent: true, opacity: 0, depthWrite: false })); scene.add(shock);
function nearestValve() { let b = null, bd = 1e9; VALVES.forEach((v, i) => { if ((G.valves || []).includes(i)) return; const d = Math.hypot(v.x - P.x, v.z - P.z); if (d < bd) { bd = d; b = v; } }); return b || VALVES[0]; }
function ch2Hint() {
  if (G.obj === 28) { const v = nearestValve(); return { k: 'valve' + (G.valves || []).length, p: { x: v.x, y: 0.9, z: v.z } }; }
  if (G.obj === 29) return { k: 'acid', p: { x: ACIDJ.x, y: H(ACIDJ.x, ACIDJ.z) + 0.7, z: ACIDJ.z } };
  if (G.obj === 30) return { k: 'pour', p: { x: POURP.x, y: 0.4, z: POURP.z } };
  if (G.obj === 33) { const v = nearestGrate(); return { k: 'grate' + (G.grates || []).length, p: { x: v.x, y: 1.1, z: v.z } }; }
  return null;
}
VALVES.forEach((v, i) => addIt({ x: v.x, z: v.z, r: 2.4, hold: 4.2, label: 'Turn the flood valve', cond: () => G.obj === 28 && !(G.valves || []).includes(i) && !MS.tug, act: () => turnValve(i) }));
addIt({ x: ACIDJ.x, z: ACIDJ.z, r: 2.4, label: 'Take the jug of acid', cond: () => G.obj === 29, act: () => { G.acid = true; hideItem(acidPick); W.fpAcid.visible = true; SND.clink(); say('“DANGER — CORROSIVE.” Perfect.', 3, 'You'); setObj(30); } });
addIt({ x: POURP.x, z: POURP.z, r: 3, hold: 2, label: 'Pour the acid into the water', cond: () => G.obj === 30 && G.acid, act: acidScene });

// ---------- deer that the Hollow One tears in half ----------
function makeRipDeer() {
  const m = makeAnimal('deer'); scene.remove(m.g); const bh = m.bh;
  const front = new THREE.Group(), back = new THREE.Group(); scene.add(front); scene.add(back);
  const hemi = dir => { const g = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(dir * Math.PI / 2); const me = new THREE.Mesh(g, MAT.deer); me.scale.set(0.32, 0.36, 0.78); me.castShadow = true; return me; };
  front.add(hemi(1)); back.add(hemi(-1));
  [[front, Math.PI], [back, 0]].forEach(([g, ry]) => { const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 18), FLESH); cap.scale.set(0.31, 0.35, 1); cap.rotation.y = ry; g.add(cap);
    for (let i = 0; i < 3; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.014, 4, 12, Math.PI * 1.1), BONEM); rib.position.z = (ry ? 0.03 : -0.03) * (i + 1); rib.rotation.z = -0.05; rib.scale.set(1, 1.15, 1); g.add(rib); } });
  const guts = []; [front, back].forEach((g, j) => { for (let i = 0; i < 4; i++) { const pv = new THREE.Group(); pv.position.set((i - 1.5) * 0.08, -0.08 + (i % 2) * 0.1, j ? 0.03 : -0.03); g.add(pv); const L = 0.25 + rand() * 0.45; const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.035 + rand() * 0.02, L, 3, 6), i % 2 ? GUTS : FLESH); c.position.y = -L / 2; pv.add(c); guts.push({ pv, ph: rand() * 6 }); } });
  const kids = [...m.body.children]; kids.forEach(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && o.scale.z > 0.7) return; const toFront = o === m.neck || o.position.z > 0.1; (toFront ? front : back).add(o); o.position.y -= bh; });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), GUTS); rope.visible = false; scene.add(rope);
  const rope2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), FLESH); rope2.visible = false; scene.add(rope2);
  GOREOBJ.push(front, back, rope, rope2);
  return { front, back, guts, legs: m.legs, neck: m.neck, head: m.head, bh, rope, rope2, fv: null, bv: null };
}
function stretch(mesh, a, b, sag) { V4.subVectors(b, a); const L = V4.length(); mesh.position.copy(a).addScaledVector(V4, 0.5); mesh.position.y -= sag || 0; mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), V4.normalize()); mesh.scale.set(1, L, 1); }
function dropHalf(h, v) { h.userData.v = v; h.userData.spin = (rand() - 0.5) * 6; }
function stepHalf(h, dt) { const v = h.userData.v; if (!v) return; v.y -= 9.8 * dt; h.position.addScaledVector(v, dt); h.rotation.z += h.userData.spin * dt; const gy = Math.max(H(h.position.x, h.position.z), -0.2) + 0.22; if (h.position.y < gy) { h.position.y = gy; if (Math.abs(v.y) > 2) { SND.thud(); spray(BLOOD, h.position.x, gy, h.position.z, 20, 2); bloodPool(h.position.x, h.position.z, 0.9, 2); } v.set(0, 0, 0); h.userData.v = null; h.rotation.z = Math.sign(h.rotation.z || 1) * 1.45; } }

// ---------- Hollow One helpers ----------
function hShow(v) { HOL.g.visible = v; if (!v) { HS.state = 'off'; } HOL.walk = 0; HOL.speed = 0; HOL.armPose = null; HOL.look = null; HOL.crouch = 0; HOL.scream = 0; HOL.jawT = null; HOL.grip = false; HOL.bodyTilt = 0; HOL.monster.rotation.set(0, 0, 0); }
function hPlace(x, z, yaw, y) { HS.x = x; HS.z = z; if (yaw != null) HS.yaw = yaw; HOL.g.position.set(x, y != null ? y : H(x, z), z); HOL.g.rotation.y = HS.yaw; }
function hFace(x, z, dt) { const t = Math.atan2(x - HS.x, z - HS.z); HS.yaw += wrapA(t - HS.yaw) * (dt ? Math.min(1, dt * 6) : 1); HOL.g.rotation.y = HS.yaw; }
function hMove(x, z, sp, dt, col) { const dx = x - HS.x, dz = z - HS.z, d = Math.hypot(dx, dz); if (d < 0.08) { HOL.walk += (0 - HOL.walk) * Math.min(1, dt * 5); return d; }
  const st = Math.min(d, sp * dt); let nx = HS.x + dx / d * st, nz = HS.z + dz / d * st; if (col) [nx, nz] = collide(nx, nz, 0.6); HS.x = nx; HS.z = nz; hFace(x, z, dt); HOL.walk += (1 - HOL.walk) * Math.min(1, dt * 4); HOL.speed = sp; HOL.g.position.set(HS.x, Math.max(H(HS.x, HS.z), -0.95), HS.z); return d; }
HOL.stepCb = () => { if (!HOL.g.visible) return; const d = Math.hypot(HS.x - P.x, HS.z - P.z), v = clamp(1 - d / 50, 0, 1); if (v <= 0) return; SND.stomp(v * (HOL.speed > 3 ? 1 : 0.55), panOf(HS.x, HS.z)); if (H(HS.x, HS.z) < -0.2) SND.splash(HOL.speed > 3); if (HOL.speed > 3) P.shake = Math.max(P.shake, v * 0.22); };
function gripPos(i, out) { return HOL.arms[i].grip.getWorldPosition(out); }
function resetTallMan() { if (cr.head.parent !== cr.neck) { cr.neck.add(cr.head); cr.head.position.set(0, 0.3, 0); cr.head.rotation.set(0, 0, 0); cr.head.scale.set(1, 1, 1); } cr.g.rotation.set(0, 0, 0); }

// ---------- chapter reset / restore ----------
function ch2Reset() {
  SCN = null; hShow(false); HS.state = 'off'; MS.state = 'off'; MS.tug = null; MIRE.g.visible = false; MIRE.head.visible = true; MIRE.burn = 0; MIRE.reach = 0; MIRE.roar = 0; MIRE.rise.rotation.set(0, 0, 0); MIRE.burnMats.forEach(m => { m.color.setHex(0xa4aa96); m.emissive.setHex(0); m.roughness = 0.42; m.bumpScale = 0.022; }); MIRE.mossMat.color.setHex(0x3e5c22);
  resetTallMan(); GOREOBJ.forEach(o => scene.remove(o)); GOREOBJ.length = 0; CHUNKS.forEach(c => scene.remove(c.m)); CHUNKS.length = 0;
  P.held = false; P.sinkY = 0; tugEl.style.display = 'none'; acidPool.material.opacity = 0; shock.material.opacity = 0; SND.set('sizzle', 0, 0.2); W.fpAcid.visible = false;
}
function ch2Restore() {
  ch2Reset(); G.valves = G.valves || [];
  valveM.forEach((g, i) => { const done = G.valves.includes(i); g.userData.wheel.rotation.y = done ? 4 : 0; g.userData.gl.visible = !done && G.obj === 28; });
  G.grates = G.grates || []; grateM.forEach((g, i) => { const done = G.grates.includes(i) || [29, 30, 31, 26, 32, 27].includes(G.obj); g.userData.gunk.visible = !done; g.userData.gl.visible = !done && G.obj === 33; });
  showItem(acidPick, G.obj <= 29); acidPick.userData.gl.visible = G.obj === 29; W.fpAcid.visible = G.obj === 30;
  if ((G.obj >= 28 && G.obj <= 31) || G.obj === 33) { C.state = 'off'; showC(false); }
  pumpOn([26, 27, 32].includes(G.obj));
  if (G.obj === 32) towerPerch();
}

// ---------- the Hollow One: first sighting, the deer ----------
function hollowDeer() {
  G.h1 = true; G.mode = 'cut'; clearSubs(); C.state = 'off'; showC(false);
  const a = Math.atan2(W.pump.x - P.x, W.pump.z - P.z), ux = Math.sin(a), uz = Math.cos(a);
  const D = { x: P.x + ux * 7.5, z: P.z + uz * 7.5 }; const dy = Math.max(H(D.x, D.z), -0.6);
  const deer = makeRipDeer(); const dyaw = a + Math.PI / 2; [deer.front, deer.back].forEach(h => { h.position.set(D.x, dy + deer.bh, D.z); h.rotation.set(0, dyaw, 0); }); deer.neck.rotation.x = 0.9;
  hShow(true); HS.state = 'scene'; hPlace(D.x + ux * 7, D.z + uz * 7, a + Math.PI); HOL.crouch = 0.9;
  P.look = lookAtPt(D.x, dy + 1.4, D.z); SND.set('drone', 0, 0.5);
  runScene((S, dt) => {
    const t = S.t, hold = S.hold;
    if (at(S, 1.0, 'alert')) { deer.neck.rotation.x = 0.1; SND.snap(panOf(D.x, D.z)); }
    if (at(S, 0.2, 'bolt0')) { FX.strike && FX.strike(); }
    if (at(S, 4.5, 'bolt1')) { FX.strike && FX.strike(); }
    if (at(S, 2.0, 'charge')) { HOL.crouch = 0.1; HOL.scream = 0.7; SND.hollowScream(0.8); SND.bleat(panOf(D.x, D.z)); P.shake = 0.3; }
    if (t > 2.0 && t < 2.8) { hMove(D.x + ux * 1.5, D.z + uz * 1.5, 11, dt); HOL.scream = Math.max(0, HOL.scream - dt); [deer.front, deer.back].forEach(h => { h.position.x += Math.cos(a) * dt * 1.5; h.position.z -= Math.sin(a) * dt * 1.5; }); }
    if (at(S, 2.8, 'grab')) { HOL.walk = 0; HOL.scream = 0; HOL.grip = true; HOL.armPose = { L: [-1.3, -0.14], R: [-1.3, -0.14] }; HOL.crouch = 0.15; SND.crunch(0); SND.bleat(0); spray(BLOOD, D.x, dy + 1.2, D.z, 25, 2.5); S.hold = true; S.sep0 = -1; }
    if (S.hold) {
      HOL.g.updateMatrixWorld(true); const gl = gripPos(0, V2), gr = gripPos(1, V5), mid = V4.addVectors(gl, gr).multiplyScalar(0.5).clone(), u = V5.clone().sub(gl).normalize(), sep = gl.distanceTo(gr);
      if (S.sep0 < 0) S.sep0 = sep; const open = Math.max(0, sep - S.sep0) * 0.5;
      if (!S.dropB) { deer.back.position.copy(mid).addScaledVector(u, -open); deer.back.lookAt(V4.copy(deer.back.position).add(u)); deer.back.rotateX(open * 0.8); }
      if (!S.eat) { deer.front.position.copy(mid).addScaledVector(u, open); deer.front.lookAt(V4.copy(deer.front.position).add(u)); deer.front.rotateX(-open * 0.6); }
      if (t < 4.4) { deer.legs.forEach((l, i) => { l.hp.rotation.x = Math.sin(t * 22 + i * 1.7) * 0.7; l.kn.rotation.x = Math.abs(Math.sin(t * 19 + i)) * 0.9; }); deer.neck.rotation.x = -0.6 + Math.sin(t * 15) * 0.4; HOL.look = mid; if (rand() < dt * 3) SND.bleat(0); }
      if (open > 0.05 && !S.dropB) { const c1 = deer.front.localToWorld(V3(0, 0, 0)), c2 = deer.back.localToWorld(V3(0, 0, 0)); deer.rope.visible = deer.rope2.visible = true; stretch(deer.rope, c1, c2, 0.15 + open * 0.2); stretch(deer.rope2, V3(c1.x, c1.y - 0.1, c1.z), V3(c2.x, c2.y - 0.12, c2.z), 0.3 + open * 0.3); spray(BLOOD, mid.x, mid.y - 0.1, mid.z, 7, 3.2, 0, -0.3, 0); if (!S.ripped) { S.ripped = true; SND.rip(); SND.gore(); P.shake = 0.45; rumble(0.7, 0.9, 500); deer.neck.rotation.x = 1.2; deer.legs.forEach(l => { l.hp.rotation.x = 0.2; l.kn.rotation.x = 0.3; }); } if (rand() < dt * 6) bloodPool(mid.x + (rand() - 0.5) * 1.5, mid.z + (rand() - 0.5) * 1.5, 0.3 + rand() * 0.4, 1.5); }
    }
    if (at(S, 4.4, 'pull')) { HOL.armPose = { L: [-1.25, 0.75], R: [-1.25, 0.75] }; HOL.jawT = 0.6; SND.growl(0, 1.2); }
    if (at(S, 5.6, 'drop')) { S.dropB = true; deer.rope.visible = deer.rope2.visible = false; dropHalf(deer.back, V3((rand() - 0.5) * 2, 1, (rand() - 0.5) * 2)); HOL.armPose = { L: [0.1, 0.12], R: [-2.35, -0.38] }; S.eat = true; bloodPool(D.x, D.z, 2.2, 3); }
    if (S.eat && !S.dropF) { HOL.g.updateMatrixWorld(true); const g = gripPos(1, V2), hp = HOL.headPos(V5); deer.front.position.copy(g); deer.front.lookAt(V4.copy(g).multiplyScalar(2).sub(hp)); HOL.look = g.clone(); HOL.jawT = 0.25 + Math.abs(Math.sin(t * 8)) * 0.7;
      S.chT = (S.chT || 0) - dt; if (S.chT <= 0 && t > 6) { S.chT = 0.42; SND.chomp(0); SND.crunch(0); const mp = deer.front.localToWorld(V3(0, 0, -0.1)); spray(BLOOD, mp.x, mp.y, mp.z, 16, 3, 0, -0.2, 0); P.shake = Math.max(P.shake, 0.08); } }
    if (at(S, 8.6, 'notice')) { S.dropF = true; dropHalf(deer.front, V3(0, 0.5, 0)); HOL.armPose = null; HOL.grip = false; HOL.jawT = null; HOL.look = camera.position; HOL.twitchT = 0.9; SND.stinger(); P.shake = 0.2; P.look = lookAtPt(HS.x, HOL.headPos(V2).y, HS.z); }
    if (at(S, 9.4, 'scream')) { HOL.scream = 1; SND.hollowScream(1.1); P.shake = 0.5; rumble(0.8, 1, 900); }
    if (at(S, 11.2, 'leave')) { HOL.scream = 0; HOL.look = null; HS.state = 'leave'; HS.tx = HS.x + uz * 45; HS.tz = HS.z - ux * 45; HS.t = 0; G.mode = 'play'; P.look = null; SCN = null;
      say('What… what WAS that?!', 2.6, 'You'); say('That wasn’t the Tall Man. That was something else. Something worse.', 4, 'You'); say('It tore that deer apart like paper…', 3, 'You'); checkpoint(); }
    stepHalf(deer.front, dt); stepHalf(deer.back, dt); deer.guts.forEach(gu => { gu.pv.rotation.x = Math.sin(G.time * 2 + gu.ph) * 0.3; gu.pv.rotation.z = Math.sin(G.time * 1.6 + gu.ph) * 0.25; });
  });
  S_DEER = deer;
}
let S_DEER = null, DARK = 0;
// keep the game smooth: if the frame rate stays low, step the graphics down by itself
const PERF = { acc: 0, n: 0, t: 0, step: 0 };
(function perfWatch(now) { requestAnimationFrame(perfWatch); const dt = (now - (PERF.last || now)) / 1000; PERF.last = now; if (!(G.mode === 'play' || G.mode === 'cut') || dt <= 0 || dt > 0.5) return; PERF.acc += dt; PERF.n++;
  if (PERF.acc > 3) { const fps = PERF.n / PERF.acc; PERF.acc = 0; PERF.n = 0; if (fps < 32 && PERF.step < 3) { PERF.step++;
    if (PERF.step === 1) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1)); FX.resize && FX.resize(); }
    else if (PERF.step === 2 && HQ()) { settings.quality = 'low'; FX.setQuality(); saveSettings(); hint('Switched to faster graphics for smoother play', 3); }
    else if (PERF.step === 3) { settings.shadows = false; flash.castShadow = false; saveSettings(); } } } })(performance.now());

// ---------- the Mire Walker: tugging in the deep water ----------
const tugEl = document.createElement('div'); tugEl.id = 'tug'; tugEl.innerHTML = '<b>SOMETHING HAS YOUR LEG!</b><span id="tugK"></span><div class="bar"><i id="tugBar"></i></div><div class="bar drag"><i id="tugDrag"></i></div>'; document.body.appendChild(tugEl);
function startTug() {
  MS.tug = { t: 0, prog: 0, drag: 0, sp: 0 }; P.held = true; SND.splash(true); SND.bigSplash(); SND.hurt(); rumble(1, 0.8, 600); P.shake = 0.7; hurt(9, 'mire');
  if (G.mode !== 'play') return; P.pitch = Math.max(-1.2, P.pitch - 0.5);
  say(pick(['AAH! Something grabbed my leg!', 'It’s pulling me under!', 'NO — let GO of me!', 'It’s got me! IT’S GOT ME!']), 2.4, 'You');
  $('tugK').textContent = touch ? 'HOLD the USE button to break free!' : padOn ? 'HOLD ✕ to break free!' : 'HOLD E or SPACE to break free!'; tugEl.style.display = 'block';
  MIRE.g.visible = true; MIRE.head.visible = true; MIRE.emerge = 0; MIRE.burn = 0; MIRE.reach = 0; MIRE.roar = 0; MS.state = 'tug';
}
function updateTug(dt) {
  const T = MS.tug; T.t += dt; const held = useHeld();
  if (held) T.prog += dt * 0.42; T.drag += dt * (held ? 0.085 : 0.34);
  P.sinkY = T.drag * 1.25; P.shake = Math.max(P.shake, 0.12 + T.drag * 0.2); P.pitch += (-0.75 - P.pitch) * Math.min(1, dt * 1.5); P.yaw += Math.sin(T.t * 9) * dt * 0.4;
  T.sp -= dt; if (T.sp <= 0) { T.sp = 0.35 + rand() * 0.25; SND.splash(true); rumble(0.6, 0.4, 150); spray(MUDP, P.x + (rand() - 0.5), 0.05, P.z + (rand() - 0.5), 8, 2.5); }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); MIRE.g.position.set(P.x + fx * 1.7, 0, P.z + fz * 1.7); MIRE.g.rotation.y = Math.atan2(P.x - MIRE.g.position.x, P.z - MIRE.g.position.z); MIRE.emerge = 0; MIRE.look = camera.position;
  $('tugBar').style.width = Math.min(100, T.prog * 100) + '%'; $('tugDrag').style.width = Math.min(100, T.drag * 100) + '%';
  if (T.prog >= 1) breakFree(); else if (T.drag >= 1) dragUnder();
}
function mireWatch() { if (MS.tug || MS.state !== 'off') return; const a = P.yaw + (rand() - 0.5) * 1.2, d = 7 + rand() * 3; const x = P.x - Math.sin(a) * d, z = P.z - Math.cos(a) * d; if (H(x, z) > -0.3) return; MIRE.g.visible = true; MIRE.head.visible = true; MIRE.burn = 0; MIRE.reach = 0; MIRE.roar = 0; MIRE.emerge = 0; MIRE.g.position.set(x, 0, z); MIRE.g.rotation.y = Math.atan2(P.x - x, P.z - z); MS.state = 'watch'; MS.t = 0; SND.bubble(panOf(x, z)); SND.plop(panOf(x, z)); setTimeout(() => { if (MS.state === 'watch') { SND.stinger(); remark(['There — in the water. Its EYES.', 'It’s watching me…', 'Don’t move. Don’t… move.'], 1); } }, 900); }
function breakFree() { MS.tug = null; P.held = false; tugEl.style.display = 'none'; SND.splash(true); SND.mireRoar(0.35); MS.state = 'sink'; MS.t = 0; MS.tugT = 3.5 + rand() * 3.5; say(pick(['Get OFF me!', 'I’m loose — move, MOVE!', 'Let go… LET GO! …Okay. Okay. Keep going.', 'Its hand… it had WEBBED fingers.']), 2.6, 'You'); }
function dragUnder() { MS.tug = null; MS.state = 'off'; MIRE.g.visible = false; tugEl.style.display = 'none'; G.mode = 'cut'; SND.bigSplash(); SND.mireRoar(0.7); fade(1, 'water'); setTimeout(() => { fade(0); P.held = false; P.sinkY = 0; G.mode = 'play'; die('mire'); }, 1200); }
function turnValve(i) {
  G.valves = G.valves || []; G.valves.push(i); valveM[i].userData.gl.visible = false; SND.creak(0); SND.clang(); refreshObj();
  const n = G.valves.length;
  if (n < 5) { say(['One open. Water’s moving. Four more.', 'Two down. It knows where I am now…', 'Three. I can feel it circling me.', 'Four… one more. Please let that be the last time it grabs me.'][n - 1], 3.2, 'You'); checkpoint(); MS.tugT = Math.min(MS.tugT, 2.5); if (n === 3) mireWatch(); return; }
  G.mode = 'cut'; SND.thud(); setTimeout(() => { SND.sputter(); }, 700);
  setTimeout(() => { say('That’s all five… but nothing’s flowing. The grates on the south side must be clogged.', 4.2, 'You'); G.mode = 'play'; setObj(33); MS.tugT = 2.5; }, 1400);
}

// ---------- the acid ----------
function acidScene() {
  G.acid = false; W.fpAcid.visible = false; G.mode = 'cut'; clearSubs(); MS.state = 'acid'; MS.t = 0; P.held = false; P.sinkY = 0;
  const ax = ACIDC.x, az = ACIDC.z; P.look = lookAtPt(ax, 0.5, az); SND.pour(); SND.set('sizzle', 0.18, 0.4);
  MIRE.g.visible = true; MIRE.head.visible = true; MIRE.emerge = 0; MIRE.burn = 0; MIRE.reach = 0; MIRE.g.position.set(ax, 0, az); MIRE.g.rotation.y = Math.atan2(P.x - ax, P.z - az); MIRE.look = camera.position;
  runScene((S, dt) => {
    const t = S.t; acidPool.material.opacity = Math.min(0.22, t * 0.1) * (0.75 + rand() * 0.25); acidPool.scale.setScalar(Math.min(5.5, 1 + t * 1.6));
    for (let k = 0; k < 4; k++) { const r = rand() * acidPool.scale.x, an = rand() * 6.28; spray(ACIDP, ax + Math.cos(an) * r, 0.05, az + Math.sin(an) * r, 1, 1.2); }
    if (rand() < dt * 10) SND.bubble(panOf(ax, az));
    if (at(S, 1.6, 'l1')) say('It’s working — the water’s boiling…', 2.6, 'You');
    if (at(S, 3.0, 'rise')) { SND.mireRoar(1.1); SND.bigSplash(); SND.stinger(); P.shake = 0.6; rumble(1, 1, 800); MIRE.roar = 1; P.look = lookAtPt(ax, 3, az); spray(MUDP, ax, 0.1, az, 60, 6); SND.set('sizzle', 0.32, 0.3); }
    if (t > 3.0) { MIRE.emerge = Math.min(1, (t - 3.0) / 1.8); MIRE.burn = Math.min(1, (t - 3.0) / 3.5); mireGore(dt, 1); }
    if (at(S, 4.4, 'r0')) MIRE.roar = 0.3;
    if (at(S, 5.2, 'r2')) { MIRE.roar = 1; SND.mireRoar(1); say('It’s ALIVE — the acid’s eating it alive!', 3, 'You'); }
    if (at(S, 6.4, 'r3')) MIRE.roar = 0.2;
    if (at(S, 7.0, 'fight')) { SCN = null; MIRE.reach = 1; MIRE.roar = 0.6; SND.mireRoar(0.9); mireFightStart(false); }
  });
}
function mireFightStart(fromSave) {
  MS.state = 'fight'; MS.hp = 4; MS.stag = 0; MS.t = 0; G.mode = 'play'; P.look = null; MIRE.g.visible = true; MIRE.head.visible = true; MIRE.reach = 1; MIRE.burn = 1; MIRE.emerge = 1; MIRE.look = camera.position;
  if (fromSave) { const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); MIRE.g.position.set(P.x + fx * 11, 0, P.z + fz * 11); SND.mireRoar(1); SND.set('sizzle', 0.3, 0.3); }
  MS.x = MIRE.g.position.x; MS.z = MIRE.g.position.z;
  if (!G.guns.pistol && !G.guns.shotgun) G.guns.pistol = true;
  if (G.guns.shotgun) { G.am.s = Math.max(G.am.s, 4); G.am.sr = Math.max(G.am.sr, 6); } G.am.p = Math.max(G.am.p, 12); G.am.pr = Math.max(G.am.pr, 12);
  if (WS.cur === 'none' || WS.cur === 'flare') equip(G.guns.shotgun ? 'shotgun' : 'pistol');
  setObj(31); say('It’s still coming! SHOOT IT IN THE HEAD!', 3, 'You'); hint('Aim for the HEAD!', 3);
}
function mireGore(dt, rate) {
  MS.goreT -= dt; if (MS.goreT > 0) return; MS.goreT = 0.08 / rate;
  const g = MIRE.g.position, an = rand() * 6.28, r = 0.6 + rand() * 0.5, y = g.y + (MIRE.rise.position.y + 1.2 + rand() * 2.3) * 0.9;
  const x = g.x + Math.cos(an) * r, z = g.z + Math.sin(an) * r;
  spray(BLOOD, x, y, z, 5, 2.4, Math.cos(an) * 0.5, 0.2, Math.sin(an) * 0.5); spray(BLACKB, x, y, z, 3, 2); spray(ACIDP, x, y, z, 6, 1.4, 0, 1.2, 0);
  if (rand() < 0.18) chunk(x, y, z, 2 + rand() * 3, rand() < 0.5 ? MIRE.burnMats[0] : FLESH, 0.06 + rand() * 0.08);
}
function chunk(x, y, z, sp, mat, s) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat); m.position.set(x, y, z); m.scale.set(1, 0.6 + rand() * 0.8, 1 + rand()); scene.add(m); GOREOBJ.push(m); const an = rand() * 6.28; CHUNKS.push({ m, v: V3(Math.cos(an) * sp * (0.4 + rand()), sp * (0.6 + rand() * 0.8), Math.sin(an) * sp * (0.4 + rand())), w: V3(rand() * 9, rand() * 9, rand() * 9), rest: false }); }
function stepChunks(dt) { for (const c of CHUNKS) { if (c.rest) continue; c.v.y -= 9.8 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; const gy = Math.max(H(c.m.position.x, c.m.position.z), 0) + 0.02; if (c.m.position.y < gy) { if (H(c.m.position.x, c.m.position.z) < 0) { if (rand() < 0.4) SND.plop(panOf(c.m.position.x, c.m.position.z)); c.m.position.y = -0.3; } else { c.m.position.y = gy; spray(BLOOD, c.m.position.x, gy, c.m.position.z, 4, 1); } c.rest = true; } } }
function mireShot(o, d, dmg) {
  if (MS.state !== 'fight') return false; const hp = MIRE.headPos(V2), g = MIRE.g.position;
  const th = raySphere(o, d, hp.x, hp.y, hp.z, 0.5); const tb = raySphere(o, d, g.x, g.y + 1.9, g.z, 1.0);
  if (th > 0 && (tb < 0 || th <= tb + 0.6)) { const hx = o.x + d.x * th, hy = o.y + d.y * th, hz = o.z + d.z * th; spray(BLOOD, hx, hy, hz, 26, 3.5, d.x, 0.4, d.z); spray(BLACKB, hx, hy, hz, 10, 2.5); SND.splat(0); SND.crunch(0); MS.hp -= dmg; MS.stag = 0.45; MIRE.roar = 0.8; SND.mireRoar(0.6); if (MS.hp <= 0) mireExplode(); else remark(['Again! Hit it again!', 'Its head — keep shooting its head!'], 1); return true; }
  if (tb > 0) { const hx = o.x + d.x * tb, hy = o.y + d.y * tb, hz = o.z + d.z * tb; spray(BLOOD, hx, hy, hz, 14, 2.6, d.x, 0.3, d.z); spray(BLACKB, hx, hy, hz, 8, 2); SND.splat(0); MS.stag = 0.2; hint('Aim for the HEAD!', 2); return true; }
  return false;
}
function mireExplode() {
  MS.state = 'dying'; MS.t = 0; G.mode = 'cut'; const hp = MIRE.headPos(V2).clone(); MIRE.head.visible = false; MIRE.eyeLight.intensity = 0; MIRE.reach = 0;
  SND.gore(); SND.crunch(0); SND.mireRoar(0.4); P.shake = 0.9; rumble(1, 1, 700); hint('', 0.01);
  spray(BLOOD, hp.x, hp.y, hp.z, 200, 7.5); spray(BLACKB, hp.x, hp.y, hp.z, 90, 6); spray(ACIDP, hp.x, hp.y, hp.z, 50, 4);
  for (let i = 0; i < 18; i++) chunk(hp.x, hp.y, hp.z, 5 + rand() * 5, i % 3 === 0 ? BONEM : i % 3 === 1 ? FLESH : MIRE.burnMats[1], 0.06 + rand() * 0.12);
  for (let i = 0; i < 8; i++) bloodPool(hp.x + (rand() - 0.5) * 7, hp.z + (rand() - 0.5) * 7, 0.3 + rand() * 0.6, 0.6, 0.02);
  P.look = lookAtPt(hp.x, hp.y - 0.6, hp.z);
  runScene((S, dt) => {
    const t = S.t; if (t < 3) { MIRE.neck.updateMatrixWorld(true); const n = MIRE.neck.getWorldPosition(V4); spray(BLOOD, n.x, n.y + 0.2, n.z, 6, 2.2, 0, 2.2, 0); if (t < 1.6) spray(BLACKB, n.x, n.y + 0.2, n.z, 2, 1.5, 0, 2, 0); }
    if (t > 0.8) { MIRE.rise.rotation.x = -Math.min(1.35, (t - 0.8) * 1.1); MIRE.emerge = Math.max(0, 1 - (t - 0.8) / 2.8); }
    if (at(S, 1.9, 'fall')) { SND.bigSplash(); P.shake = 0.4; spray(MUDP, MIRE.g.position.x, 0.1, MIRE.g.position.z, 50, 5); }
    if (at(S, 2.4, 'l1')) { say('…', 1, 'You'); say('It’s dead. Its whole head just… popped.', 3, 'You'); }
    if (at(S, 4.2, 'lights')) { SCN = null; MIRE.g.visible = false; MS.state = 'off'; SND.set('sizzle', 0, 1); acidPool.material.opacity = 0; SND.sputter(); setTimeout(() => SND.sputter(), 600);
      setTimeout(() => { pumpOn(true); SND.boom(); P.look = null; G.mode = 'play'; say('The intake’s clear — the floodlights are ON!', 3, 'You'); say('I see your light! Hang on, kid, I’m coming!', 3, 'Radio'); setObj(26); G.surviveT = 45; C.final = true; C.rush = false; C.scripted = false; C.state = 'hidden'; C.timer = 6; }, 1300); }
  });
}
function updateMire(dt) {
  if (MS.tug) { if (G.mode === 'play') updateTug(dt); }
  else if ([28, 33, 29, 30].includes(G.obj) && G.mode === 'play' && P.x > 1000 && H(P.x, P.z) < -0.35 && MS.state !== 'acid') { MS.tugT -= dt; if (MS.tugT <= 0) startTug(); }
  else if (G.mode === 'play' && MS.tugT < 2.5) MS.tugT = 2.5;
  if (MS.state === 'watch') { MS.t += dt; MIRE.look = camera.position; MIRE.emerge = MS.t < 2.5 ? Math.min(0.3, MS.t * 0.3) : Math.max(0, 0.3 - (MS.t - 2.5) * 0.3); if (MS.t > 3.6) { MIRE.g.visible = false; MS.state = 'off'; } }
  if (MS.state === 'off' && [28, 33].includes(G.obj) && G.mode === 'play' && !MS.tug && P.x > 1000 && Math.hypot(P.x - ACIDC.x, P.z - ACIDC.z) < 30) { MS.watchT = (MS.watchT == null ? 12 : MS.watchT) - dt; if (MS.watchT <= 0) { MS.watchT = 14 + rand() * 10; mireWatch(); } }
  if (MS.state === 'sink') { MS.t += dt; MIRE.g.position.y = -MS.t * 1.5; if (MS.t > 2) { MIRE.g.visible = false; MS.state = 'off'; MIRE.g.position.y = 0; } }
  if (MS.state === 'fight' && G.mode === 'play') {
    MS.stag = Math.max(0, MS.stag - dt); const dx = P.x - MS.x, dz = P.z - MS.z, d = Math.hypot(dx, dz);
    const sp = MS.stag > 0 ? -0.6 : 1.15; MS.x += dx / d * sp * dt; MS.z += dz / d * sp * dt; MIRE.g.position.set(MS.x, Math.max(0, H(MS.x, MS.z)), MS.z); MIRE.g.rotation.y += wrapA(Math.atan2(dx, dz) - MIRE.g.rotation.y) * Math.min(1, dt * 3);
    MIRE.burn = 0.85 + Math.sin(G.time * 7) * 0.15; mireGore(dt, 0.45); MIRE.roar = Math.max(0, MIRE.roar - dt * 0.8); MS.t += dt; if (MS.t > 3.5) { MS.t = 0; MIRE.roar = 0.9; SND.mireRoar(0.8); }
    if (d < 2.8) mireCatch();
  }
  if (MIRE.g.visible) MIRE.update(dt);
}
function mireCatch() { MS.state = 'off'; G.mode = 'cut'; SND.mireRoar(1.2); P.shake = 1; rumble(1, 1, 900); P.look = lookAtPt(MS.x, 2.6, MS.z); setTimeout(() => { SND.bigSplash(); fade(1, 'water'); }, 600); setTimeout(() => { fade(0); MIRE.g.visible = false; G.deaths++; showDead('The Mire Walker dragged you under. Shoot its HEAD — body shots only slow it down.'); }, 1700); }

// ---------- the Hollow One: second sighting, it kills the Tall Man ----------
function tallManDeath() {
  G.mode = 'cut'; clearSubs(); C.final = false; C.state = 'scripted'; C.mode = 'stalk'; showC(true); resetTallMan(); cr.g.scale.set(1, 1, 1);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let tx = P.x + fx * 17, tz = P.z + fz * 17; [tx, tz] = collide(tx, tz, 0.6); C.x = tx; C.z = tz;
  const TM = { x: tx, z: tz, y: H(tx, tz), vy: 0, fall: 0, lift: 0 };
  cr.g.position.set(tx, TM.y, tz); cr.g.rotation.set(0, Math.atan2(P.x - tx, P.z - tz), 0);
  hShow(true); HS.state = 'scene'; hPlace(tx + rx * 15 + fx * 3, tz + rz * 15 + fz * 3, 0); hFace(tx, tz); HOL.crouch = 0.6;
  P.look = lookAtPt(tx, TM.y + 2.6, tz); SND.stinger(); SND.set('drone', 0.2, 0.5);
  runScene((S, dt) => {
    const t = S.t;
    if (t < 2.6) { const dx = P.x - TM.x, dz = P.z - TM.z, d = Math.hypot(dx, dz); if (d > 9) { TM.x += dx / d * 1.7 * dt; TM.z += dz / d * 1.7 * dt; } else C.mode = 'idle'; TM.y = H(TM.x, TM.z); cr.g.position.set(TM.x, TM.y, TM.z); P.look = lookAtPt(TM.x, TM.y + 2.6, TM.z); }
    if (at(S, 1.0, 'l1')) say('No… not him. Not again.', 2.4, 'You');
    if (at(S, 2.6, 'charge')) { SND.hollowScream(1); HOL.crouch = 0; P.shake = 0.3; C.mode = 'idle'; cr.g.rotation.y = Math.atan2(HS.x - TM.x, HS.z - TM.z); }
    if (t > 2.6 && !S.hit) { const d = hMove(TM.x, TM.z, 12, dt); P.look = lookAtPt((TM.x + HS.x) / 2, TM.y + 2.2, (TM.z + HS.z) / 2); if (d < 1.8 || t > 4) { S.hit = true; S.dir = Math.atan2(TM.x - HS.x, TM.z - HS.z); SND.thud(); SND.crunch(0); SND.splat(0); SND.shriek(); P.shake = 0.7; rumble(1, 0.8, 500); TM.vx = Math.sin(S.dir) * 7; TM.vz = Math.cos(S.dir) * 7; spray(BLACKB, TM.x, TM.y + 2, TM.z, 40, 4); C.mode = 'run'; } }
    if (S.hit && !S.lifted) { TM.fall = Math.min(1, TM.fall + dt * 3); TM.vx *= Math.max(0, 1 - dt * 3); TM.vz *= Math.max(0, 1 - dt * 3); TM.x += TM.vx * dt; TM.z += TM.vz * dt; TM.y = H(TM.x, TM.z); cr.g.position.set(TM.x, TM.y + 0.15, TM.z); cr.g.rotation.set(-1.45 * TM.fall, cr.g.rotation.y, 0);
      if (t > 4.2) { const bx = TM.x - Math.sin(cr.g.rotation.y) * 1.4, bz = TM.z - Math.cos(cr.g.rotation.y) * 1.4; hMove(bx + Math.sin(S.dir) * 0.9, bz + Math.cos(S.dir) * 0.9, 3, dt); hFace(bx, bz, dt); HOL.walk = 0; HOL.crouch = 0.8; } }
    if (t > 4.6 && t < 7.2) { HOL.armPose = { L: [-0.55 + Math.sin(t * 9) * 0.65, 0.12], R: [-0.55 - Math.sin(t * 9) * 0.65, 0.12] }; HOL.jawT = 0.6 + Math.sin(t * 9) * 0.3; S.st = (S.st || 0) - dt; if (S.st <= 0) { S.st = 0.35; cr.torso.updateMatrixWorld(true); const tp = cr.torso.getWorldPosition(V4); SND.splat(0); SND.crunch(0); spray(BLACKB, tp.x, tp.y + 0.3, tp.z, 28, 3.2, 0, 1.4, 0); spray(BLOOD, tp.x, tp.y + 0.3, tp.z, 10, 2.5, 0, 1, 0); P.shake = Math.max(P.shake, 0.18); bloodPool(tp.x + (rand() - 0.5), tp.z + (rand() - 0.5), 0.6 + rand() * 0.5, 1, Math.max(H(tp.x, tp.z), 0) ); } C.mode = t < 6 ? 'run' : 'idle'; if (at(S, 4.7, 'l2')) say('It’s… it’s killing him!', 2.4, 'You'); }
    if (at(S, 7.2, 'lift')) { S.lifted = true; HOL.crouch = 0; HOL.armPose = { L: [0.2, 0.2], R: [-2.8, 0.12] }; HOL.grip = true; HOL.jawT = null; C.mode = 'run'; SND.growl(0, 1.4); TM.lift = 0; }
    if (S.lifted && !S.ripped) { TM.lift = Math.min(1, TM.lift + dt * 2); HOL.g.updateMatrixWorld(true); const g = gripPos(1, V2); cr.g.rotation.set(-1.45 * (1 - TM.lift), cr.g.rotation.y, 0); cr.g.updateMatrixWorld(true); const hw = cr.head.getWorldPosition(V5); cr.g.position.x += (g.x - hw.x) * TM.lift; cr.g.position.y += (g.y - hw.y) * TM.lift; cr.g.position.z += (g.z - hw.z) * TM.lift; HOL.look = g.clone(); if (t > 8.2) C.mode = 'idle'; }
    if (at(S, 8.8, 'rip')) { S.ripped = true; scene.attach(cr.head); SND.rip(); SND.gore(); SND.crunch(0); P.shake = 0.8; rumble(1, 1, 800); TM.vy = 0; TM.by = cr.g.position.y; C.state = 'fall'; }
    if (S.ripped) { HOL.g.updateMatrixWorld(true);
      if (!S.thrown) { const g = gripPos(1, V2); cr.head.position.copy(g); }
      if (TM.by > TM.y + 0.05) { TM.vy -= 9.8 * dt; TM.by = Math.max(TM.y + 0.1, TM.by + TM.vy * dt); cr.g.position.y = TM.by; if (TM.by <= TM.y + 0.1) { SND.thud(); P.shake = Math.max(P.shake, 0.3); } }
      else cr.g.rotation.x += (-1.5 - cr.g.rotation.x) * Math.min(1, dt * 3);
      if (t < 12) { cr.neck.updateMatrixWorld(true); const n = cr.neck.getWorldPosition(V4); spray(BLACKB, n.x, n.y + 0.2, n.z, 5, 1.5, 0, 2.6, 0); spray(BLOOD, n.x, n.y + 0.2, n.z, 3, 1.8, 0, 2.2, 0); if (rand() < dt * 2) bloodPool(n.x, n.z, 1.2, 3, Math.max(H(n.x, n.z), 0)); } }
    if (at(S, 9.6, 'look')) { HOL.look = camera.position; HOL.twitchT = 0.8; P.look = lookAtPt(HS.x, HOL.headPos(V2).y, HS.z); SND.stinger(); }
    if (at(S, 10.4, 'throw')) { S.thrown = true; HOL.armPose = { L: [0.1, 0.2], R: [-1.4, 0.1] }; const fx2 = -Math.sin(P.yaw), fz2 = -Math.cos(P.yaw); const tgt = V3(P.x + fx2 * 2.2, Math.max(H(P.x + fx2 * 2.2, P.z + fz2 * 2.2), 0) + 0.12, P.z + fz2 * 2.2); const s0 = cr.head.position.clone(), T = 0.85; S.hv = V3((tgt.x - s0.x) / T, (tgt.y - s0.y + 4.9 * T * T) / T, (tgt.z - s0.z) / T); S.hy = tgt.y; SND.whoosh(); }
    if (S.thrown && S.hv) { S.hv.y -= 9.8 * dt; cr.head.position.addScaledVector(S.hv, dt); cr.head.rotation.x += dt * 11; cr.head.rotation.z += dt * 5; spray(BLACKB, cr.head.position.x, cr.head.position.y, cr.head.position.z, 1, 0.5); P.look = lookAtPt(cr.head.position.x, cr.head.position.y, cr.head.position.z); if (cr.head.position.y <= S.hy) { cr.head.position.y = S.hy; S.hv = null; SND.thud(); SND.splat(0); P.shake = 0.3; spray(BLACKB, cr.head.position.x, S.hy, cr.head.position.z, 30, 2.5); bloodPool(cr.head.position.x, cr.head.position.z, 0.7, 1, S.hy - 0.1); cr.head.rotation.set(1.3, 0.4, 0.3); say('Oh god… OH GOD!', 2.2, 'You'); } }
    if (at(S, 11.8, 'roar')) { HOL.armPose = null; HOL.grip = false; HOL.scream = 1; SND.hollowScream(1.2); P.shake = 0.5; rumble(0.8, 1, 1000); P.look = lookAtPt(HS.x, HOL.headPos(V2).y, HS.z); }
    if (at(S, 13.6, 'go')) { HOL.scream = 0; HOL.look = null; HS.state = 'leave'; HS.tx = W.wtower.x; HS.tz = W.wtower.z; HS.t = 0; SCN = null; G.mode = 'play'; P.look = null; SND.set('drone', 0, 2);
      SND.radioBlip(); say('It killed him. It killed the Tall Man… and it’s heading for the old water tower.', 4.2, 'You'); say('Kid! I SEE your lights — but I can’t get the boat through the reeds there!', 4, 'Radio'); say('Meet me at the fishing shack dock — west of you, past the old water tower!', 4, 'Radio'); say('Past the tower. Where it just went. Great.', 3, 'You');
      setObj(32); }
  });
}

// ---------- the Hollow One: last sighting, it leaps off the water tower ----------
function towerPerch() { hShow(true); HS.state = 'perch'; const tw = W.wtower, a = Math.atan2(P.x - tw.x, P.z - tw.z); hPlace(tw.x + Math.sin(a) * 3.7, tw.z + Math.cos(a) * 3.7, a, W.wtG.position.y + W.wtTop); HOL.crouch = 0.8; }
function towerJump() {
  G.mode = 'cut'; clearSubs(); HS.state = 'scene'; const tw = W.wtower; const top = V3(HS.x, HOL.g.position.y, HS.z);
  const dx = tw.x - P.x, dz = tw.z - P.z, dd = Math.hypot(dx, dz); const land = { x: P.x + dx / dd * 10, z: P.z + dz / dd * 10 }; const ly = Math.max(H(land.x, land.z), -0.95);
  SND.thunder(); FX.strike && FX.strike(); SND.stinger(); P.look = lookAtPt(HS.x, top.y + 3, HS.z);
  runScene((S, dt) => {
    const t = S.t; if (t < 2.4) { hFace(P.x, P.z, dt); P.look = lookAtPt(HS.x, top.y + 2.6, HS.z); HOL.look = camera.position; }
    if (at(S, 0.4, 'l1')) say('It’s up there. On top of the tower. It’s been WAITING for me.', 3.2, 'You');
    if (at(S, 0.8, 'stand')) { HOL.crouch = 0.15; HOL.twitchT = 0.9; }
    if (at(S, 1.3, 'scream')) { HOL.scream = 1; SND.hollowScream(1.2); P.shake = 0.3; }
    if (at(S, 2.4, 'jump')) { HOL.scream = 0.3; HOL.crouch = 0.9; HOL.look = null; SND.whoosh(); }
    if (t > 2.6 && t < 4.1) { const k = (t - 2.6) / 1.5; const x = lerp(top.x, land.x, k), z = lerp(top.z, land.z, k), y = lerp(top.y, ly, k) + Math.sin(k * Math.PI) * 6; HS.x = x; HS.z = z; HOL.g.position.set(x, y, z); hFace(land.x + (land.x - top.x), land.z + (land.z - top.z)); HOL.crouch = 0.2; HOL.bodyTilt = 0.4 + k * 0.4; HOL.armPose = { L: [-2.5, 0.7], R: [-2.5, 0.7] }; HOL.scream = 1; P.look = lookAtPt(x, y + 2.2, z); }
    if (at(S, 4.1, 'land')) { HS.x = land.x; HS.z = land.z; HOL.g.position.set(land.x, ly, land.z); hFace(P.x, P.z); HOL.crouch = 1; HOL.bodyTilt = 0.2; HOL.armPose = { L: [-0.4, 0.5], R: [-0.4, 0.5] }; HOL.scream = 0;
      SND.quake(); SND.bigSplash(); SND.boom(); P.shake = 1.8; rumble(1, 1, 1400); P.pitch += 0.35; spray(MUDP, land.x, ly + 0.2, land.z, 220, 9); spray(BLACKB, land.x, ly + 0.2, land.z, 40, 5); shock.position.set(land.x, Math.max(ly, 0) + 0.05, land.z); S.sh = 0; scareDeer(P.x, P.z, 200); }
    if (S.sh != null && S.sh < 1.4) { S.sh += dt; shock.scale.setScalar(1 + S.sh * 22); shock.material.opacity = 0.7 * (1 - S.sh / 1.4); }
    if (at(S, 5.0, 'rise')) { HOL.crouch = 0; HOL.bodyTilt = 0; HOL.armPose = null; HOL.look = camera.position; P.look = lookAtPt(HS.x, ly + 3.4, HS.z); }
    if (at(S, 5.5, 'roar')) { HOL.scream = 1; SND.hollowScream(1.3); P.shake = 0.6; rumble(0.8, 1, 900); }
    if (at(S, 7.2, 'chase')) { SCN = null; shock.material.opacity = 0; HOL.scream = 0; hollowChaseStart(false); }
  });
}
function hollowChaseStart(fromSave) {
  G.mode = 'play'; P.look = null; hShow(true); HS.state = 'chase'; HS.stag = 0; HS.scrT = 4; HS.t = 0;
  if (fromSave) { const sx = W.shack.x - P.x, sz = W.shack.z + 2.2 - P.z, sd = Math.hypot(sx, sz) || 1; hPlace(P.x - sx / sd * 20, P.z - sz / sd * 20, 0); hFace(P.x, P.z); SND.hollowScream(1); }
  setObj(27); say('RUN! To the shack — RUN!', 2.6, 'You'); SND.set('drone', 0.34, 0.2);
}
function hollowShot(o, d, dmg) { if (!HOL.g.visible || HS.state !== 'chase') return false; const hp = HOL.headPos(V2), g = HOL.g.position; let t = raySphere(o, d, hp.x, hp.y, hp.z, 0.45), body = false; if (t < 0) { t = raySphere(o, d, g.x, g.y + 2.4, g.z, 0.9); body = true; } if (t < 0) return false; const hx = o.x + d.x * t, hy = o.y + d.y * t, hz = o.z + d.z * t; spray(BLOOD, hx, hy, hz, body ? 14 : 24, 3, d.x, 0.3, d.z); SND.splat(0); HS.stag = body ? 0.25 : 0.6; if (!body) { HOL.twitchT = 0.6; SND.hollowScream(0.5); } remark(['It’s not even slowing down!', 'Bullets don’t do ANYTHING to it!', 'Just RUN!'], 0.5); return true; }
function hollowCatch() {
  HS.state = 'kill'; G.mode = 'cut'; clearSubs(); SND.hollowScream(1.4); P.shake = 1.2; rumble(1, 1, 1100); HOL.scream = 1; HOL.walk = 0; HOL.armPose = { L: [-1.6, 0.5], R: [-1.6, 0.5] }; HOL.look = camera.position;
  runScene((S, dt) => { camera.getWorldDirection(FW); FW.y = 0; FW.normalize(); const k = Math.min(1, S.t / 0.25), dist = lerp(2.6, 1.05, k); HOL.g.position.set(camera.position.x + FW.x * dist, 0, camera.position.z + FW.z * dist); HOL.g.rotation.y = Math.atan2(-FW.x, -FW.z); HOL.crouch = 0.35; HOL.update(0); HOL.g.updateMatrixWorld(true); const hy = HOL.headPos(V2).y; HOL.g.position.y += camera.position.y + 0.05 - hy;
    if (S.t > 0.25 && rand() < 0.3) spray(BLOOD, camera.position.x + FW.x * 0.6, camera.position.y - 0.2, camera.position.z + FW.z * 0.6, 10, 2);
    if (at(S, 0.5, 'bite')) { SND.chomp(0); SND.crunch(0); SND.gore(); $('hurt').style.opacity = 1; }
    if (at(S, 1.15, 'dead')) { SCN = null; hShow(false); G.deaths++; showDead('The Hollow One caught you. Run straight for the shack — and don’t stop to shoot.'); } });
}
function updateHollow(dt) {
  if (!HOL.g.visible) return;
  HOLL.intensity = HS.state === 'perch' || (SCN && HS.state === 'scene' && G.obj === 32) ? 1.6 + (FX.light && FX.light.e >= 0 && FX.light.e < 0.4 ? 3 : 0) : 0; if (HOLL.intensity) HOLL.position.set(HS.x, HOL.g.position.y + 4.5, HS.z);
  if (HS.state === 'perch') { hFace(P.x, P.z, dt * 0.3); HOL.look = Math.hypot(HS.x - P.x, HS.z - P.z) < 70 ? camera.position : null; if (rand() < dt * 0.15) HOL.twitchT = 0.9; if (G.obj === 32 && G.mode === 'play' && Math.hypot(P.x - W.wtower.x, P.z - W.wtower.z) < 27) towerJump(); }
  if (HS.state === 'leave') { HS.t += dt; hMove(HS.tx, HS.tz, 2.4, dt, false); if (HS.t > 9 || Math.hypot(HS.x - P.x, HS.z - P.z) > 38) { hShow(false); if (G.obj === 32) towerPerch(); } }
  if (HS.state === 'chase' && G.mode === 'play') {
    HS.stag = Math.max(0, HS.stag - dt); const d = Math.hypot(P.x - HS.x, P.z - HS.z);
    const sp = (HS.stag > 0 ? 1.1 : d > 26 ? 6.6 : 4.7) * wadeAt(HS.x, HS.z); hMove(P.x, P.z, sp, dt, true); HOL.look = d < 14 ? camera.position : null;
    HS.scrT -= dt; if (HS.scrT <= 0) { HS.scrT = 5 + rand() * 4; HOL.scream = 1; SND.hollowScream(clamp(1 - d / 60, 0.3, 1)); } HOL.scream = Math.max(0, HOL.scream - dt * 0.7);
    if (d < 2.3) hollowCatch();
  }
  HOL.update(dt);
}

// ---------- main per-frame update (called from updateCh2) ----------
function updateMonsters(dt) {
  if (SCN) { SCN.t += dt; SCN.f(SCN, dt); }
  if (G.mode === 'play' && G.obj === 24 && !G.h1 && P.x > 1000) { const dp = Math.hypot(P.x - W.pump.x, P.z - W.pump.z); if (dp < 75 && dp > 28) hollowDeer(); }
  updateMire(dt); updateHollow(dt); stepChunks(dt); stepParticles(ACIDP, dt); stepParticles(MUDP, dt);
  if (S_DEER && !SCN) { stepHalf(S_DEER.front, dt); stepHalf(S_DEER.back, dt); }
  if (W.swamp.visible) { const on = Math.sin(G.time * 2.2) > 0.6; W.wtLampM.color.setHex(on ? 0xff2010 : 0x300000); W.wtLampL.intensity = on ? 2.2 : 0; }
  if (!P.held && P.sinkY > 0) P.sinkY = Math.max(0, P.sinkY - dt * 1.5);
  // after the Hollow One shows up the swamp night turns pitch black (darkest during the deer scene itself)
  if (W.swamp.visible && !P.inHeli) { const tgt = (SCN && HS.state === 'scene' && G.obj === 24) ? 1 : (G.h1 || G.obj >= 25) ? 0.75 : 0; DARK += (tgt - DARK) * Math.min(1, dt * 0.6);
    if (DARK > 0.01) { hemi.intensity = lerp(0.46, 0.1, DARK); moon.intensity = lerp(0.34, 0.05, DARK); scene.fog.color.copy(FOG_SWAMP).multiplyScalar(1 - DARK * 0.75); } }
}
window.HP2 = { HOL, MIRE, HS, MS, hollowDeer, tallManDeath, towerJump, towerPerch, acidScene, mireFightStart, startTug, ch2Restore, VALVES, POURP, ACIDJ };
