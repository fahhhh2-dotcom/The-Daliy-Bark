'use strict';
/* Hollow Pines — the end of Chapter 2: the shack, a nightmare, the dawn rescue that goes wrong,
   the Hollow One's cave (cages, its nest, an old mine), a powder bomb, and the escape. */
const CV = { x: 2000, y: -60, z: -520 };
const CL = (lx, lz) => ({ x: CV.x + lx, z: CV.z + lz });
const CAGE_P = { x: -11.2, z: 7.2 }, NEST = { x: 1, z: -3 }, KEGS = { x: -2, z: -33 }, PAPER = { x: 9.5, z: 8.6 }, EXIT_X = 47;
const RADIO_P = { x: W.shack.x + 1.7, z: W.shack.z + 2.3 };
const CAVE = { y: CV.y, g: new THREE.Group(), cages: [] };
CAVE.g.visible = false; scene.add(CAVE.g);
const FIREP = makeParticles(0xffa030, 220, 0.08), DUSTP = makeParticles(0x6a6258, 300, 0.12);

// ---------- build the cave ----------
{
  const g = CAVE.g; g.position.set(CV.x, CV.y, CV.z);
  const stoneTx = TX.stone.clone(); stoneTx.needsUpdate = true; stoneTx.repeat.set(7, 4); stoneTx.wrapS = stoneTx.wrapT = THREE.RepeatWrapping;
  const nrm = NRM.stone.clone(); nrm.needsUpdate = true; nrm.repeat.set(7, 4); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
  const rockM = MSM({ map: stoneTx, normalMap: nrm, color: 0x6a6056, roughness: 0.92, side: THREE.BackSide });
  const floorTx = TX.stone.clone(); floorTx.needsUpdate = true; floorTx.repeat.set(10, 10); floorTx.wrapS = floorTx.wrapT = THREE.RepeatWrapping;
  const floorM = MSM({ map: floorTx, normalMap: NRM.stone, color: 0x4e463e, roughness: 0.85 });
  const fbm = MON.fbm;
  // dome with openings for the two tunnels and a hole in the roof
  { let geo = new THREE.SphereGeometry(1, 72, 22, 0, Math.PI * 2, 0, Math.PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const wall = 1 + (1 - y) * 0.25; x *= 17 * wall; z *= 13 * wall; y = y * 9.5; const n = fbm(x * 0.18, y * 0.25, z * 0.18, 4) * 1.6 + fbm(x * 0.7, y * 0.7, z * 0.7, 2) * 0.35; const l = Math.hypot(x, z) || 1; x += x / l * n; z += z / l * n; y += n * 0.4 * (y / 9.5); p.setXYZ(i, x, Math.max(-0.3, y), z); }
    geo = geo.toNonIndexed(); const a = geo.attributes.position.array, keep = [];
    for (let i = 0; i < a.length; i += 9) { const cx = (a[i] + a[i + 3] + a[i + 6]) / 3, cy = (a[i + 1] + a[i + 4] + a[i + 7]) / 3, cz = (a[i + 2] + a[i + 5] + a[i + 8]) / 3;
      if (cx > 11 && Math.abs(cz - 2) < 1.9 && cy < 3.8) continue; if (cz < -8 && Math.abs(cx + 2) < 1.9 && cy < 3.8) continue; if (Math.hypot(cx - NEST.x, cz - NEST.z) < 1.8 && cy > 7) continue; for (let k = 0; k < 9; k++) keep.push(a[i + k]); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); const uv = []; for (let i = 0; i < keep.length; i += 3) uv.push(Math.atan2(keep[i + 2], keep[i]) / 6.28 + 0.5, keep[i + 1] / 9.5); ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ng.computeVertexNormals();
    const dome = new THREE.Mesh(ng, rockM); dome.receiveShadow = true; g.add(dome); }
  // floor
  { const fg = new THREE.PlaneGeometry(130, 90, 90, 60); fg.rotateX(-Math.PI / 2); const p = fg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, fbm(p.getX(i) * 0.3, 0, p.getZ(i) * 0.3, 3) * 0.12); fg.computeVertexNormals(); const f = new THREE.Mesh(fg, floorM); f.position.set(12, 0, -8); f.receiveShadow = true; g.add(f); }
  // tunnels: rough half-pipes
  const tunnel = (x0, z0, x1, z1, rad) => { const L = Math.hypot(x1 - x0, z1 - z0), tg = new THREE.CylinderGeometry(rad, rad, L, 18, Math.ceil(L), true, Math.PI / 2, Math.PI); const p = tg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = fbm(x * 0.6 + y * 0.3, y * 0.4, z * 0.6, 3) * 0.45, l = Math.hypot(x, z) || 1; p.setXYZ(i, x + x / l * n, y, z + z / l * n); }
    tg.rotateZ(Math.PI / 2); tg.computeVertexNormals(); const m = new THREE.Mesh(tg, rockM); m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.scale.set(1, 1.25, 1); g.add(m); return m; };
  tunnel(12, 2, EXIT_X + 6, 2, 2.0); tunnel(-2, -9, -2, -37, 1.9);
  // dead end of the mine tunnel and the daylight at the far end of the exit tunnel
  { const cap = new THREE.Mesh(new THREE.CircleGeometry(2.4, 16), rockM); cap.position.set(-2, 1, -36.6); g.add(cap); }
  CAVE.dayM = new THREE.MeshBasicMaterial({ color: 0xcfd8e0, fog: false }); { const d = new THREE.Mesh(new THREE.CircleGeometry(2.3, 20), CAVE.dayM); d.rotation.y = -Math.PI / 2; d.position.set(EXIT_X + 5.8, 1.3, 2); g.add(d); }
  CAVE.dayL = new THREE.PointLight(0xc8d4e0, 0, 24, 1.4); CAVE.dayL.position.set(EXIT_X + 3, 2, 2); g.add(CAVE.dayL);
  // the hole in the roof: grey dawn light falls on the nest
  CAVE.holeL = new THREE.SpotLight(0x9aa8c0, 0, 30, 0.45, 0.6, 1); CAVE.holeL.position.set(NEST.x, 14, NEST.z); const ht = new THREE.Object3D(); ht.position.set(NEST.x, 0, NEST.z); g.add(ht); CAVE.holeL.target = ht; g.add(CAVE.holeL);
  { const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 10, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x8090a8, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.set(NEST.x, 4.6, NEST.z); g.add(beam); }
  // fire the Hollow One keeps near its nest (old embers, bones in it)
  CAVE.fireL = new THREE.PointLight(0xff8a3a, 0, 26, 1.3); CAVE.fireL.position.set(-5.6, 1.2, 2.2); g.add(CAVE.fireL);
  { for (let i = 0; i < 7; i++) { const s2 = sph(0.22, MAT.rock, -5.6 + Math.cos(i) * 0.65, 0.1, 2.2 + Math.sin(i) * 0.65, g); } const em = MSM({ color: 0x220800, emissive: 0xff5a10, emissiveIntensity: 1.6 }); for (let i = 0; i < 6; i++) { const c = cyl(0.05, 0.06, 0.8, 5, i % 2 ? em : BONEM, -5.6, 0.12, 2.2, g); c.rotation.set(Math.PI / 2, i, 0); } CAVE.fireEm = em; }
  // stalactites and stalagmites
  const spM = MSM({ map: TX.stone, color: 0x5a524a, roughness: 0.8 });
  for (let i = 0; i < 46; i++) { const a = rand() * 6.28, r = 2 + rand() * 11, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r * 0.95; if (Math.hypot(x - NEST.x, z - NEST.z) < 3) continue; const h = 0.6 + rand() * 2.2, c = mk(new THREE.ConeGeometry(0.15 + rand() * 0.25, h, 7), spM, x, 8.2 - (r / 13) * 4 - h / 2 + 0.5, z, g); c.rotation.x = Math.PI; c.castShadow = false; }
  for (let i = 0; i < 22; i++) { const a = rand() * 6.28, r = 9 + rand() * 6, x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r * 0.85; if (Math.hypot(x - CAGE_P.x, z - CAGE_P.z) < 4 || (x > 9 && Math.abs(z - 2) < 3) || (z < -8 && Math.abs(x + 2) < 3)) continue; const h = 0.4 + rand() * 1.6; mk(new THREE.ConeGeometry(0.2 + rand() * 0.3, h, 7), spM, x, h / 2, z, g); }
  // the nest: a ring of snapped branches and bones, blood soaked
  { for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, b = cyl(0.05, 0.08, 1.6 + rand(), 5, i % 4 ? MAT.dwood : BONEM, NEST.x + Math.cos(a) * 1.6, 0.2, NEST.z + Math.sin(a) * 1.6, g); b.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.4, a + (rand() - 0.5), 0); }
    for (let i = 0; i < 14; i++) { const s2 = sph(0.07 + rand() * 0.06, BONEM, NEST.x + (rand() - 0.5) * 6, 0.05, NEST.z + (rand() - 0.5) * 6, g, 1.4, 0.8, 1); }
    for (let i = 0; i < 4; i++) { const sk = sph(0.13, BONEM, NEST.x + (rand() - 0.5) * 4, 0.12, NEST.z + (rand() - 0.5) * 4, g, 1, 1.1, 1.3); sph(0.035, MAT.black, sk.position.x + 0.05, 0.16, sk.position.z + 0.11, g); }
    const bl = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), MAT.blood); bl.rotation.x = -Math.PI / 2; bl.position.set(NEST.x, 0.05, NEST.z); g.add(bl); }
  // deer hung from the ceiling on roots
  for (let i = 0; i < 3; i++) { const d = makeAnimal('deer'); scene.remove(d.g); d.g.position.set(-5 + i * 6, 4.2 + i * 0.4, -8 + i * 2.5); d.g.rotation.set(Math.PI, i, 0.2); d.neck.rotation.x = 1; d.legs.forEach((l, k) => l.hp.rotation.x = k < 2 ? 0.4 : -0.4); g.add(d.g); cyl(0.03, 0.03, 4, 4, MAT.dwood, -5 + i * 6, 6.6 + i * 0.4, -8 + i * 2.5, g); const b = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), MAT.blood); b.rotation.x = -Math.PI / 2; b.position.set(-5 + i * 6, 0.05, -8 + i * 2.5); g.add(b); }
  // cages along the west wall — animals it's saving for later, and yours
  const barM = MSM({ map: TX.wood, color: 0x5a4632, roughness: 0.9 }), lashM = MSM({ color: 0x2a2018, roughness: 1 });
  const cagesAt = [{ x: -13.2, z: -5.5, who: 'deer' }, { x: -14.4, z: -1, who: 'wolf' }, { x: -13.6, z: 3.4, who: 'bones' }, { x: CAGE_P.x, z: CAGE_P.z, who: 'you' }];
  cagesAt.forEach(c => { const cg = new THREE.Group(); cg.position.set(c.x, 0, c.z); cg.rotation.y = Math.atan2(NEST.x - c.x, NEST.z - c.z); g.add(cg); const S2 = 0.95;
    for (let i = 0; i < 9; i++) { const a = i / 8; [[-S2, -S2 + a * 2 * S2], [S2, -S2 + a * 2 * S2], [-S2 + a * 2 * S2, -S2]].forEach(([x, z]) => cyl(0.045, 0.05, 2.2, 5, barM, x, 1.1, z, cg)); }
    [0.1, 1.1, 2.15].forEach(y => { bx(2 * S2, 0.08, 0.08, lashM, 0, y, -S2, cg); bx(0.08, 0.08, 2 * S2, lashM, -S2, y, 0, cg); bx(0.08, 0.08, 2 * S2, lashM, S2, y, 0, cg); }); bx(2 * S2, 0.08, 2 * S2, lashM, 0, 2.2, 0, cg);
    const door = new THREE.Group(); door.position.set(-S2, 0, S2); cg.add(door); for (let i = 0; i < 9; i++) cyl(0.045, 0.05, 2.2, 5, barM, i / 8 * 2 * S2, 1.1, 0, door); [0.1, 1.1, 2.15].forEach(y => bx(2 * S2, 0.08, 0.08, lashM, S2, y, 0, door));
    let an = null; if (c.who === 'deer' || c.who === 'wolf') { an = makeAnimal(c.who); scene.remove(an.g); an.g.scale.setScalar(c.who === 'deer' ? 0.8 : 1); cg.add(an.g); an.g.rotation.y = 0.6; }
    if (c.who === 'bones') { for (let i = 0; i < 9; i++) { const b = cyl(0.025, 0.03, 0.3 + rand() * 0.3, 5, BONEM, (rand() - 0.5) * 1.2, 0.05, (rand() - 0.5) * 1.2, cg); b.rotation.set(Math.PI / 2, rand() * 6, 0); } sph(0.12, BONEM, 0.2, 0.12, -0.3, cg, 1, 1.15, 1.25); bx(0.4, 0.05, 0.3, MSM({ color: 0x3a4a2a }), -0.3, 0.03, 0.2, cg); const bl = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), MAT.blood); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.03; cg.add(bl); }
    CAVE.cages.push({ c, g: cg, door, an });
  });
  // the old mine: timber frames, a lantern, black powder kegs at the end
  for (let z = -11; z > -36; z -= 3.2) { bx(0.2, 2.6, 0.2, MAT.dwood, -3.4, 1.3, z, g); bx(0.2, 2.6, 0.2, MAT.dwood, -0.6, 1.3, z, g); bx(3.2, 0.22, 0.24, MAT.dwood, -2, 2.6, z, g); }
  { const lan = MSM({ color: 0x221a08, emissive: 0xffb040, emissiveIntensity: 1.4 }); cyl(0.08, 0.1, 0.22, 8, lan, -0.8, 2.3, -26, g); CAVE.mineL = new THREE.PointLight(0xffa850, 0, 12, 1.6); CAVE.mineL.position.set(-1.2, 2, -26); g.add(CAVE.mineL); }
  const kegM = MSM({ map: TX.wood, color: 0x6a4a2a, roughness: 0.8 }), bandM = MSM({ color: 0x222222, metalness: 0.6, roughness: 0.5 });
  CAVE.kegs = []; [[-2.8, -33.4], [-1.4, -34], [-2.2, -34.6], [-0.9, -32.9]].forEach(([x, z], i) => { const k = new THREE.Group(); k.position.set(x, 0, z); g.add(k); cyl(0.32, 0.32, 0.8, 12, kegM, 0, 0.4, 0, k); [0.12, 0.68].forEach(y => cyl(0.335, 0.335, 0.05, 12, bandM, 0, y, 0, k)); const lb = bx(0.3, 0.2, 0.01, MSM({ color: 0xc8b890 }), 0, 0.45, 0.32, k); CAVE.kegs.push(k); });
  bx(1.2, 0.8, 0.8, MAT.wood, -0.6, 0.4, -30.4, g); { const sign = ctex(256, 128, (c2, w, h) => { c2.fillStyle = '#b8a878'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#4a0a0a'; c2.font = 'bold 34px serif'; c2.textAlign = 'center'; c2.fillText('BLACK POWDER', w / 2, 52); c2.font = '22px serif'; c2.fillText('— KEEP FLAME AWAY —', w / 2, 92); }); const s3 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), MSM({ map: sign })); s3.position.set(-2, 1.6, -36.3); g.add(s3); }
  // an old miner who didn't make it, still clutching yellowed newspaper
  { const sk = new THREE.Group(); sk.position.set(PAPER.x - 0.6, 0, PAPER.z + 0.3); g.add(sk); sph(0.13, BONEM, 0, 0.55, 0, sk, 1, 1.1, 1.2); cyl(0.05, 0.05, 0.6, 5, BONEM, 0, 0.25, 0.1, sk); for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 4, 10, Math.PI), BONEM); r.position.set(0, 0.15 + i * 0.07, 0.12); sk.add(r); } [-1, 1].forEach(sd => { const l = cyl(0.03, 0.03, 0.8, 5, BONEM, sd * 0.12, 0.05, 0.5, sk); l.rotation.x = Math.PI / 2; }); bx(0.3, 0.25, 0.3, MSM({ color: 0x3a2a1a }), 0.2, 0.6, -0.1, sk); }
  CAVE.paper = new THREE.Group(); CAVE.paper.position.set(PAPER.x, 0.02, PAPER.z); g.add(CAVE.paper); { const pm = MSM({ color: 0xcfc4a4, roughness: 0.95 }); for (let i = 0; i < 4; i++) { const p2 = bx(0.42, 0.012, 0.3, pm, (rand() - 0.5) * 0.15, i * 0.014, (rand() - 0.5) * 0.15, CAVE.paper); p2.rotation.y = rand() * 0.6; } }
  CAVE.charge = new THREE.Group(); CAVE.charge.position.set(NEST.x + 0.4, 0, NEST.z + 0.4); CAVE.charge.visible = false; g.add(CAVE.charge); { const k = new THREE.Group(); CAVE.charge.add(k); cyl(0.32, 0.32, 0.8, 12, kegM, 0, 0.4, 0, k); cyl(0.32, 0.32, 0.8, 12, kegM, 0.7, 0.4, 0.2, k); const f = cyl(0.015, 0.015, 1.2, 4, MSM({ color: 0xd8d0b0 }), 0.3, 0.06, 0.9, CAVE.charge); f.rotation.x = Math.PI / 2; }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
}
CAVE.paper.userData.gl = glint(CV.x + PAPER.x, CV.y + 0.8, CV.z + PAPER.z); CAVE.paper.userData.gl.visible = false;
const kegGl = glint(CV.x + KEGS.x, CV.y + 1.4, CV.z + KEGS.z); kegGl.visible = false;
// the shack porch radio
const radio2 = new THREE.Group(); radio2.position.set(RADIO_P.x, swampGround(34, -152) + 0.35, RADIO_P.z); W.swamp.add(radio2); bx(0.5, 0.5, 0.5, MAT.wood, 0, 0.25, 0, radio2); bx(0.42, 0.22, 0.26, MSM({ color: 0x2a2a28, metalness: 0.5, roughness: 0.5 }), 0, 0.61, 0, radio2); bx(0.08, 0.05, 0.01, MSM({ color: 0x000000, emissive: 0x30ff60, emissiveIntensity: 1.5 }), -0.1, 0.64, 0.135, radio2); cyl(0.008, 0.008, 0.6, 4, MAT.metal, 0.15, 1.0, 0, radio2);
const radioGl = glint(RADIO_P.x, swampGround(34, -152) + 1.6, RADIO_P.z); radioGl.visible = false;

// ---------- cave movement ----------
function caveWalk(lx, lz, mon) {
  if (G.obj === 37 && !mon) return Math.hypot(lx - CAGE_P.x, lz - CAGE_P.z) < 0.62;
  let ok = (lx / 15.6) ** 2 + (lz / 11.8) ** 2 < 1 || (lx > 11 && lx < EXIT_X + 4.5 && Math.abs(lz - 2) < 1.25) || (lz < -8 && lz > -35.8 && Math.abs(lx + 2) < 1.15);
  if (!ok) return false;
  for (const c of CAVE.cages) if (Math.abs(lx - c.c.x) < 1.15 && Math.abs(lz - c.c.z) < 1.15 && !(c.c.who === 'you' && CAVE.open)) return false;
  if (Math.hypot(lx + 5.6, lz - 2.2) < 0.9) return false;
  return true;
}
function caveMove(ox, oz, nx, nz, mon) { const l = (x, z) => caveWalk(x - CV.x, z - CV.z, mon); if (l(nx, nz)) return [nx, nz]; if (l(nx, oz)) return [nx, oz]; if (l(ox, nz)) return [ox, nz]; return [ox, oz]; }
function caveEnv(on) {
  CAVE.g.visible = on; W.swamp.visible = !on && P.x > 1000 && !P.inHeli; P.inTunnel = false;
  if (on) { scene.fog.color.setHex(0x120e0c); scene.fog.density = 0.045; scene.environment = null; hemi.intensity = 0.16; moon.intensity = 0; CAVE.holeL.intensity = 2.2; CAVE.fireL.intensity = 1.6; CAVE.mineL.intensity = 1.1; CAVE.dayL.intensity = 1.4; }
  else { CAVE.holeL.intensity = CAVE.fireL.intensity = CAVE.mineL.intensity = CAVE.dayL.intensity = 0; }
}
function enterCave(x, z) { P.falling = false; P.inCave = true; P.x = CV.x + x; P.z = CV.z + z; P.y = CV.y; caveEnv(true); hShow(false); }
function leaveCave() { P.inCave = false; caveEnv(false); }

// ---------- the shack: barricade, sleep, a nightmare, morning ----------
function shackSleep() {
  G.mode = 'cut'; clearSubs(); showC(false); C.state = 'off'; hShow(false); SND.set('drone', 0, 0.3); SND.door(); fade(1);
  runScene((S, dt) => { const t = S.t;
    if (at(S, 0.8, 'bar')) { SND.thud(); say('*slams the bar across the door*', 2, 'You'); }
    if (at(S, 2.6, 's1')) { SND.thud(); P.shake = 0.4; }
    if (at(S, 3.4, 's2')) { SND.thud(); P.shake = 0.4; SND.creak(0); }
    if (at(S, 4.4, 'l1')) say('It’s outside. It’s scraping the walls…', 2.8, 'You');
    if (at(S, 7.4, 'l2')) { SND.whisper(0); say('…then nothing. Just rain on the tin roof.', 3, 'You'); }
    if (at(S, 10.6, 'l3')) say('I’ll just close my eyes. Just for a second…', 3, 'You');
    if (at(S, 13.8, 'dream')) { dreamStart(); }
  });
}
function dreamStart() {
  // nightmare: back at Harlan's campsite. The fire is out. Harlan's chair is empty… and something is sitting in it.
  SCN = null; P.inHeli = false; P.x = 2.6; P.z = 4.2; P.y = H(2.6, 4.2); P.yaw = 0.15; P.pitch = -0.05; setEnv(false); updateChunks(P.x, P.z, 125); W.swamp.visible = false;
  fade(0); SND.set('drone', 0.12, 2); scene.fog.color.setHex(0x1a0808); scene.fog.density = 0.06;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); hShow(true); HS.state = 'scene'; hPlace(P.x + fx * 9, P.z + fz * 9, 0); hFace(P.x, P.z); HOL.crouch = 0.4; HOL.look = camera.position;
  say('…', 1.5, '');
  runScene((S, dt) => { const t = S.t;
    if (at(S, 0.5, 'd1')) say('Harlan’s campsite? How did I…', 2.6, 'You');
    if (at(S, 3.2, 'd2')) { SND.whisper(-0.5); say('kid…', 1.6, ''); }
    if (at(S, 5.0, 'd3')) { HOL.twitchT = 0.9; SND.stinger(); say('It’s here. Why is it here?!', 2.4, 'You'); }
    if (t > 6.4 && t < 7.6) { const d = hMove(P.x, P.z, 9, dt); HOL.scream = 1; if (at(S, 6.4, 'run')) SND.hollowScream(1.2); }
    if (at(S, 7.5, 'wake')) { hShow(false); $('hurt').style.opacity = 1; SND.gore(); P.shake = 1.2; fade(1); setTimeout(() => $('hurt').style.opacity = 0, 400); }
    if (at(S, 9.0, 'morning')) { SCN = null; wakeMorning(); }
  });
}
function wakeMorning() {
  P.x = W.shack.x; P.z = W.shack.z + 2.9; P.y = H(P.x, P.z); P.yaw = Math.PI; P.pitch = 0; P.light = false; setEnv(false); updateChunks(9999, 0, 0); G.dawn = true;
  fade(0); SND.set('rain', 0.04, 2); say('*gasp* …a dream. Just a dream.', 2.6, 'You'); say('It’s morning. The rain stopped. It’s… gone?', 3, 'You'); say('There’s an old radio on the porch. Maybe someone’s listening.', 3.4, 'You');
  G.mode = 'play'; setObj(34);
}

// ---------- calling for a helicopter ----------
addIt({ x: RADIO_P.x, z: RADIO_P.z, r: 2.2, label: 'Use the radio', cond: () => G.obj === 34, act: radioCall });
async function radioCall() {
  G.mode = 'cut'; radioGl.visible = false; SND.radioBlip(); SND.set('stat', 0.12, 0.05);
  const lines = [['You', 'Mayday, mayday! Anyone on this channel? I’m at the old fishing shack in the swamp!', 4.2], ['Radio', '…kkh… This is Millbrook Air Rescue. We hear you. Is anyone hurt?', 4], ['You', 'The pilot from last night — he’s dead. Please, just get me out of here.', 3.8], ['Radio', 'Copy. Bird’s already in the air, ten minutes out. Stay on that dock and wave us down.', 4.4], ['You', 'Hurry. Please hurry.', 2]];
  let tot = 0; for (const [w, t2, d] of lines) { say(t2, d, w); tot += d; } await wait(tot * 1000); await waitSubs(12000); SND.set('stat', 0, 0.1);
  G.mode = 'play'; setObj(35); G.surviveT = 40; say('Ten minutes… I can make it ten minutes.', 2.6, 'You');
}
function updateDockWait(dt) {
  if (G.obj !== 35 || G.mode !== 'play') return; G.surviveT -= dt;
  if (G.surviveT < 28 && !G.ev1) { G.ev1 = 1; SND.splash(true); remark(['What was that splash?', 'Something just moved in the water…'], 1); }
  if (G.surviveT < 16 && !G.ev2) { G.ev2 = 1; SND.creak(0); SND.thud(); P.shake = 0.3; say('Something just hit the dock pilings…', 2.6, 'You'); }
  if (G.surviveT <= 0) heliRescue();
}

// ---------- the rescue goes wrong ----------
function heliRescue() {
  G.mode = 'cut'; clearSubs(); const dockY = H(P.x, P.z), hover = { x: W.shack.x + 0.5, y: dockY + 15.2, z: W.shack.z + 6.5 };
  heli.g.visible = true; heli.t = 7.5; heli.ready = false; heli.ladder.scale.y = 0.001; heli.spot.intensity = 3.2; SND.set('heli', 0.5, 1);
  const from = { x: hover.x + 160, y: hover.y + 40, z: hover.z + 120 };
  P.look = lookAtPt(from.x, from.y, from.z);
  runScene((S, dt) => { const t = S.t;
    if (t < 7) { const e = 1 - Math.pow(1 - Math.min(1, t / 7), 3); heli.g.position.set(lerp(from.x, hover.x, e), lerp(from.y, hover.y, e), lerp(from.z, hover.z, e)); heli.g.rotation.y = Math.atan2(hover.x - from.x, hover.z - from.z) * (1 - e); P.look = lookAtPt(heli.g.position.x, heli.g.position.y, heli.g.position.z); }
    if (at(S, 1.0, 'l1')) say('THERE! Over here! OVER HERE!', 2.4, 'You');
    if (at(S, 7.2, 'drop')) { SND.rung(); say('Grab the ladder and climb, we’ll pull you in!', 3, 'Radio'); }
    if (t > 7.2) heli.ladder.scale.y = Math.min(1, (t - 7.2) / 1.2);
    if (at(S, 8.6, 'climb')) { SCN = null; startLadder(hover, dockY); }
  });
}
function startLadder(hover, dockY) {
  setObj(36, true); const L = { p: 0, hover, dockY, hollow: false, t: 0 }; P.look = null; P.pitch = 0.5; G.mode = 'cut'; P.falling = true;
  say('Climb! Hold W, ↑ or USE to climb!', 3, 'Tip');
  runScene((S, dt) => { const t = S.t; heli.g.position.set(hover.x + Math.sin(t * 0.8) * 0.15, hover.y + Math.sin(t * 1.1) * 0.12, hover.z); heli.ladder.updateMatrixWorld(true); const lp = heli.ladder.getWorldPosition(V2);
    const held = K.KeyW || K.ArrowUp || useHeld() || padY < -0.4 || jy < -0.4; if (!S.grab && held) { L.p = Math.min(0.97, L.p + dt * 0.085); P.bob += dt * 6; S.rt = (S.rt || 0) - dt; if (S.rt <= 0) { S.rt = 0.42; SND.rung(); } }
    P.x = lp.x; P.z = lp.z + 0.35; P.y = lerp(dockY - 1.3, lp.y - 3.4, L.p); P.shake = Math.max(P.shake, 0.05);
    if (L.p > 0.42 && !S.burst) { S.burst = true; S.bt = t; hShow(true); HS.state = 'scene'; hPlace(lp.x + 0.3, lp.z - 1.4, 0, -4); hFace(P.x, P.z); HOL.crouch = 0.3; HOL.look = camera.position; SND.bigSplash(); SND.hollowScream(1.3); SND.stinger(); P.shake = 0.8; rumble(1, 1, 700); say('NO — IT’S UNDER THE DOCK!', 2.2, 'You'); say('CLIMB, KID! CLIMB!', 2, 'Radio'); }
    if (S.burst && !S.grab) { const k = Math.min(1, (t - S.bt) / 3.2), gy = lerp(-4, P.y - 3.7, k); HOL.g.position.set(lp.x + 0.25 * (1 - k), gy, lp.z - 0.6 * (1 - k)); HOL.armPose = { L: [-2.9 + Math.sin(t * 9) * 0.3, 0.15], R: [-2.9 - Math.sin(t * 9) * 0.3, 0.15] }; HOL.scream = 0.6; if (k >= 1) { S.grab = true; S.gt = t; } }
    if (S.grab) { const u = t - S.gt; P.look = { yaw: P.yaw, pitch: -1.35 }; HOL.scream = 1;
      if (at(S, S.gt + 0.05, 'g1')) { SND.hollowScream(1.4); SND.hurt(); $('hurt').style.opacity = 0.9; say('IT’S GOT MY LEG!', 1.6, 'You'); rumble(1, 1, 1500); }
      if (u > 0.9) { P.y -= dt * (6 + u * 6); P.shake = 1; }
      if (at(S, S.gt + 1.7, 'g2')) { SND.bigSplash(); SND.thud(); fade(1, 'water'); }
      if (at(S, S.gt + 3.2, 'g3')) { SCN = null; heli.g.visible = false; SND.set('heli', 0, 0.5); heli.spot.intensity = 0; hShow(false); P.look = null; $('hurt').style.opacity = 0; caveWake(true); } }
  });
}

// ---------- the cave: waking up in a cage ----------
function caveWake(fresh) {
  enterCave(CAGE_P.x, CAGE_P.z); P.yaw = Math.atan2(-(NEST.x - CAGE_P.x), -(NEST.z - CAGE_P.z)); P.pitch = -0.1; P.light = true; G.hasLight = true; G.dawn = false;
  CAVE.open = false; const my = CAVE.cages[3]; my.door.rotation.y = 0; my.door.position.y = 0; CAVE.charge.visible = false; G.kicks = G.kicks || 0;
  setObj(37); fade(0);
  if (!fresh || G.ate) { G.mode = 'play'; return; }
  G.mode = 'cut'; fade(1); setTimeout(() => fade(0), 1200);
  const deer = makeRipDeer(); deer.rope.visible = deer.rope2.visible = false; scene.remove(deer.back); deer.front.visible = true;
  hShow(true); HS.state = 'scene'; hPlace(CV.x - 6.6, CV.z + 4.6, 0, CV.y); hFace(P.x, P.z); HOL.armPose = { L: [0.1, 0.12], R: [-2.35, -0.38] }; HOL.grip = true;
  const eatScene = (S, dt) => { const t = S.t;
    HOL.g.position.y = CV.y; if (!S.dropped) { HOL.g.updateMatrixWorld(true); const g = gripPos(1, V2), hp = HOL.headPos(V5); deer.front.position.copy(g); deer.front.lookAt(V4.copy(g).multiplyScalar(2).sub(hp)); HOL.look = g.clone(); HOL.jawT = 0.25 + Math.abs(Math.sin(t * 8)) * 0.7; S.ct = (S.ct || 0) - dt; if (S.ct <= 0 && t > 1.5) { S.ct = 0.45; SND.chomp(0); SND.crunch(0); const mp = deer.front.localToWorld(V3(0, 0, -0.1)); spray(BLOOD, mp.x, mp.y, mp.z, 16, 3, 0, -0.2, 0); } }
    if (at(S, 1.2, 'l1')) say('Where… where am I?', 2.2, 'You');
    if (at(S, 3.6, 'l2')) say('A cage. It put me in a CAGE.', 2.4, 'You');
    if (at(S, 6.2, 'l3')) { say('Oh god… it’s eating. Don’t look. Don’t make a sound.', 3.4, 'You'); const w = CAVE.cages[1]; if (w.an) SND.yelp(0); }
    if (at(S, 10, 'drop')) { S.dropped = true; dropHalf(deer.front, V3(0.5, 0.5, 0)); HOL.armPose = null; HOL.grip = false; HOL.jawT = null; HOL.look = camera.position; HOL.twitchT = 0.9; SND.stinger(); }
    if (at(S, 11.4, 'stare')) { HOL.scream = 0.4; SND.growl(0, 1.3); say('It’s looking right at me…', 2.4, 'You'); }
    if (at(S, 13.6, 'leave')) { HOL.scream = 0; HOL.look = null; S.go = true; }
    if (S.go) { hMove(CV.x + EXIT_X, CV.z + 2, 3.4, dt, true); if (HS.x > CV.x + 20) { SCN = null; hShow(false); G.ate = true; G.mode = 'play'; say('It left. Down that tunnel — toward the daylight.', 3, 'You'); say('The cage door is just lashed with old rope. If I kick it enough…', 3.4, 'You'); checkpoint(); } }
    stepHalf(deer.front, dt);
  };
  runScene(eatScene);
}
addIt({ x: CV.x + CAGE_P.x, z: CV.z + CAGE_P.z, r: 1.6, hold: 1.4, label: () => `Kick the cage door (${G.kicks || 0}/4)`, cond: () => P.inCave && G.obj === 37 && G.mode === 'play', act: kickCage });
function kickCage() {
  G.kicks = (G.kicks || 0) + 1; SND.thud(); SND.crunch(0); P.shake = 0.35; const my = CAVE.cages[3]; my.door.rotation.y = -0.06 * G.kicks; refreshObj();
  if (G.kicks < 4) { say(['It moved!', 'Again… quietly…', 'One more—'][G.kicks - 1], 1.8, 'You'); if (G.kicks === 2) setTimeout(() => { if (P.inCave) { SND.hollowScream(0.25); say('…it heard that. Hurry.', 2, 'You'); } }, 1400); return; }
  CAVE.open = true; SND.door(); SND.clang(); my.door.rotation.y = -1.6; say('I’m out!', 1.6, 'You'); say('I need to get out of here before it comes back… or make sure it never comes back.', 3.8, 'You'); say('That old mine tunnel — miners used black powder down here.', 3.2, 'You'); setObj(38);
}

// ---------- the bomb ----------
addIt({ x: CV.x + KEGS.x, z: CV.z + KEGS.z + 1.4, r: 2.2, hold: 1.6, label: 'Take a keg of black powder', cond: () => P.inCave && G.obj === 38, act: () => { G.powder = true; CAVE.kegs[0].visible = false; kegGl.visible = false; SND.clink(); SND.thud(); say('Black powder. Still dry. That’s the boom — now I need something to make a fuse.', 3.6, 'You'); say('Paper. That dead miner by the south wall had newspaper.', 3, 'You'); setObj(39); } });
addIt({ x: CV.x + PAPER.x, z: CV.z + PAPER.z, r: 2, label: 'Take the old newspaper', cond: () => P.inCave && G.obj === 39, act: () => { G.paper = true; CAVE.paper.visible = false; CAVE.paper.userData.gl.visible = false; SND.pickup(); say('Rolled up with powder, this’ll burn like a fuse.', 3, 'You'); say('Its nest. Right under the hole in the roof. Bring the whole place down on it.', 3.6, 'You'); setObj(40); } });
addIt({ x: CV.x + NEST.x + 0.6, z: CV.z + NEST.z + 1.4, r: 2.4, hold: 3.2, label: 'Pack the powder under its nest', cond: () => P.inCave && G.obj === 40, act: () => { G.charge = true; CAVE.charge.visible = true; SND.clink(); SND.pour(); say('Powder’s packed. Fuse is set.', 2.4, 'You'); setObj(41); } });
addIt({ x: CV.x + NEST.x + 0.6, z: CV.z + NEST.z + 1.4, r: 2.4, hold: 1.0, label: 'Light the fuse', cond: () => P.inCave && G.obj === 41, act: lightFuse });
function lightFuse() {
  SND.flare(); SND.set('sizzle', 0.3, 0.2); G.fuseT = 22; setObj(42, true); G.surviveT = 22; say('It’s lit — RUN!', 1.6, 'You');
  setTimeout(() => { if (G.obj !== 42 || !P.inCave) return; // it comes back down through the hole in the roof
    hShow(true); HS.state = 'drop'; HS.t = 0; hPlace(CV.x + NEST.x, CV.z + NEST.z, 0, CV.y + 10); SND.hollowScream(1.3); SND.stinger(); say('IT’S BACK!', 1.4, 'You'); }, 3200);
}
function updateFuse(dt) {
  if (G.obj !== 42 || !P.inCave) return;
  if (G.mode === 'play') { G.surviveT -= dt; G.fuseT = G.surviveT; }
  const fp = { x: CV.x + NEST.x + 0.7, y: CV.y + 0.1, z: CV.z + NEST.z + 1.2 }; spray(FIREP, fp.x, fp.y, fp.z, 3, 1.8, 0, 1, 0); if (rand() < 0.4) spray(FIREP, fp.x, fp.y, fp.z, 1, 0.6);
  if (HS.state === 'drop') { HS.t += dt; const y = Math.max(CV.y, CV.y + 10 - HS.t * HS.t * 9); HOL.g.position.y = y; HOL.crouch = y <= CV.y + 0.01 ? Math.max(0, 1 - (HS.t - 1.05) * 1.2) : 0.3; if (y <= CV.y + 0.01 && !HS.landed) { HS.landed = true; SND.quake(); P.shake = 1.2; spray(DUSTP, HS.x, CV.y + 0.3, HS.z, 120, 6); } if (HS.t > 2.2) { HS.landed = false; HS.state = 'chase'; HS.scrT = 3; } }
  if (G.mode === 'play' && P.x > CV.x + EXIT_X) escapeCave();
  if (G.mode === 'play' && G.surviveT <= 0) { G.mode = 'cut'; SND.boom(); SND.quake(); P.shake = 2; fade(1, true); hShow(false); setTimeout(() => { fade(0); G.deaths++; G.obj = 41; checkpoint(); showDead('The cave came down on you. Light the fuse, then run straight for the east tunnel — don’t stop.'); }, 1400); }
}
function escapeCave() {
  G.mode = 'cut'; clearSubs(); SND.set('sizzle', 0, 0.2); hShow(false); P.look = { yaw: P.yaw + Math.PI, pitch: 0.05 };
  runScene((S, dt) => { const t = S.t; P.x += dt * 3.5; CAVE.dayL.intensity = 1.4 + t * 2;
    if (at(S, 0.4, 'l1')) say('Daylight — GO GO GO!', 1.8, 'You');
    if (at(S, 1.6, 'boom')) { SND.boom(); SND.quake(); SND.hollowScream(1.4); P.shake = 2.2; rumble(1, 1, 2500); spray(DUSTP, P.x - 4, CV.y + 1.5, P.z, 220, 9); spray(FIREP, P.x - 8, CV.y + 1.5, P.z, 160, 10); fade(1, true); }
    if (at(S, 3.4, 'out')) { SCN = null; caveOutro(); }
  });
}
function caveOutro() {
  leaveCave(); P.x = W.wtower.x + 40; P.z = W.wtower.z + 70; P.y = H(P.x, P.z); P.yaw = Math.PI * 0.75; P.pitch = 0.08; setEnv(false); G.dawn = true; fade(0);
  for (let i = 0; i < 4; i++) setTimeout(() => { SND.thud(); P.shake = 0.6 - i * 0.12; }, 400 + i * 700);
  say('*coughing* …I made it.', 2.4, 'You'); say('The whole hillside caved in behind me. Tons of rock.', 3.2, 'You'); say('Nothing could live through that.', 2.6, 'You'); say('…right?', 2, 'You');
  setTimeout(() => { SND.set('heli', 0.35, 2); say('Kid?! Kid, we saw the explosion! Are you alive down there?!', 3.8, 'Radio'); }, 9500);
  setTimeout(() => { SND.whisper(0); }, 16500);
  setTimeout(() => {
    G.ch2done = true; checkpoint(); clearCh2(G.slot); G.mode = 'win'; $('hud').style.display = 'none'; $('touch').style.display = 'none'; SND.set('heli', 0, 2);
    $('winH').textContent = 'Chapter 2 Complete';
    $('winT').innerHTML = 'The rescue helicopter found you at sunrise, covered in cave dust and blood.<br>Behind you, the hill over the Hollow One’s cave had folded in on itself.<br>As the helicopter lifted away, something far below shifted under the rocks.<br><br>Time: ' + fmtT(G.time) + ' · Deaths: ' + G.deaths + '<br><br><b>Chapter 3 is coming soon.</b>';
    $('win').style.display = 'grid'; try { document.exitPointerLock(); } catch (e) {}
  }, 19000);
}

// ---------- per-frame + restore hooks ----------
function updateCave(dt) {
  updateDockWait(dt); updateFuse(dt); stepParticles(FIREP, dt); stepParticles(DUSTP, dt);
  if (CAVE.g.visible) { CAVE.fireL.intensity = 1.5 + Math.sin(G.time * 11) * 0.2 + rand() * 0.2; CAVE.fireEm.emissiveIntensity = 1.4 + rand() * 0.5; if (rand() < dt * 0.4) spray(DUSTP, P.x + (rand() - 0.5) * 8, CV.y + 8, P.z + (rand() - 0.5) * 8, 4, 0.3); }
  radioGl.visible = G.obj === 34 && W.swamp.visible; kegGl.visible = P.inCave && G.obj === 38; CAVE.paper.userData.gl.visible = P.inCave && G.obj === 39 && CAVE.paper.visible;
}
function caveHint() {
  if (G.obj === 34) return { k: 'radio', p: { x: RADIO_P.x, y: radio2.position.y + 0.7, z: RADIO_P.z } };
  if (!P.inCave) return null;
  if (G.obj === 38) return { k: 'keg', p: { x: CV.x + KEGS.x, y: CV.y + 0.9, z: CV.z + KEGS.z } };
  if (G.obj === 39) return { k: 'paper', p: { x: CV.x + PAPER.x, y: CV.y + 0.3, z: CV.z + PAPER.z } };
  if (G.obj === 40 || G.obj === 41) return { k: 'nest' + G.obj, p: { x: CV.x + NEST.x + 0.6, y: CV.y + 0.4, z: CV.z + NEST.z + 1.4 } };
  return null;
}
function caveReset() { P.inCave = false; CAVE.g.visible = false; CAVE.holeL.intensity = CAVE.fireL.intensity = CAVE.mineL.intensity = CAVE.dayL.intensity = 0; G.dawn = false; SND.set('sizzle', 0, 0.2); }
function caveRestore() {
  CAVE.open = G.obj >= 38 && G.obj <= 42; CAVE.cages[3].door.rotation.y = CAVE.open ? -1.6 : 0; CAVE.kegs[0].visible = !G.powder; CAVE.paper.visible = !G.paper; CAVE.charge.visible = !!G.charge && G.obj >= 41;
  if (G.obj === 35 || G.obj === 36) G.obj = 34;
  if (G.obj === 42) G.obj = 41;
  if (G.obj === 34) { P.x = W.shack.x; P.z = W.shack.z + 2.9; P.y = H(P.x, P.z); G.dawn = true; }
  if (G.obj >= 37 && G.obj <= 41) { const inCage = G.obj === 37; enterCave(inCage ? CAGE_P.x : CAGE_P.x + 2.2, inCage ? CAGE_P.z : CAGE_P.z - 1); P.yaw = Math.atan2(-(NEST.x - CAGE_P.x), -(NEST.z - CAGE_P.z)); G.hasLight = true; P.light = true; }
}
window.HP3 = { CV, CAVE, NEST, KEGS, PAPER, CAGE_P, shackSleep, heliRescue, caveWake, lightFuse, escapeCave, kickCage, caveMove };
