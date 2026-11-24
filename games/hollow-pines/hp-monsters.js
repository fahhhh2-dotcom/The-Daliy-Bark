'use strict';
/* Hollow Pines — the Hollow One and the Mire Walker, rebuilt from the user's own 3D model pages */
const MON = (() => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const PN = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PN[i] = p[i & 255]; }
  const h3 = (i, j, k) => PN[(PN[(PN[i & 255] + j) & 255] + k) & 255] / 255;
  function noise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
    return L(L(L(h3(X, Y, Z), h3(X + 1, Y, Z), u), L(h3(X, Y + 1, Z), h3(X + 1, Y + 1, Z), u), v), L(L(h3(X, Y, Z + 1), h3(X + 1, Y, Z + 1), u), L(h3(X, Y + 1, Z + 1), h3(X + 1, Y + 1, Z + 1), u), v), w) * 2 - 1;
  }
  function fbm(x, y, z, o = 4) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * noise(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; } return s; }
  function canvasTex(size, draw, rep = 1, srgb = true) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function noiseFill(x, s, f, fn) { const d = x.createImageData(s, s); for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const a = i / s * Math.PI * 2, b = j / s * Math.PI * 2; const n = fbm(Math.cos(a) * f, Math.sin(a) * f + Math.cos(b) * f, Math.sin(b) * f, 4); const [r, g, bl] = fn(n, i, j); const k = (j * s + i) * 4; d.data[k] = r; d.data[k + 1] = g; d.data[k + 2] = bl; d.data[k + 3] = 255; } x.putImageData(d, 0, 0); }
  const mesh = (g, m, p) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; if (p) o.position.copy(p); return o; };
  let SKIN = null; // default material for flesh()/blob() while a model is being built
  function flesh(pts, radii, o = {}) {
    const { seg = 48, rad = 20, sa = 1, sb = 1, disp = null, amp = 0.01, freq = 7, mat = SKIN, vRep = 1.2 } = o;
    const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength();
    const pos = [], uv = [], idx = [], T = V(), N = V(), B = V(), p = V(), q = V(), d = V(), dn = V(), X = V(1, 0, 0), Z = V(0, 0, 1), pT = V(), qt = new THREE.Quaternion();
    const lerpArr = (arr, t) => { if (!Array.isArray(arr)) return arr; const fr = t * (arr.length - 1), k = Math.min(arr.length - 2, Math.floor(fr)), f = fr - k, s = f * f * (3 - 2 * f); return arr[k] + (arr[k + 1] - arr[k]) * s; };
    const ends = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg; curve.getPointAt(t, p); curve.getTangentAt(t, T);
      if (i === 0) N.crossVectors(T, Math.abs(T.x) < 0.9 ? X : Z).normalize(); else { qt.setFromUnitVectors(pT, T); N.applyQuaternion(qt); N.addScaledVector(T, -N.dot(T)).normalize(); }
      pT.copy(T); B.crossVectors(T, N).normalize();
      const r = lerpArr(radii, t), A = lerpArr(sa, t), Bw = lerpArr(sb, t);
      if (i === 0 || i === seg) ends.push(p.clone());
      for (let j = 0; j <= rad; j++) {
        const a = j / rad * Math.PI * 2; d.copy(N).multiplyScalar(Math.cos(a) * A).addScaledVector(B, Math.sin(a) * Bw); dn.copy(d).normalize();
        q.copy(p).addScaledVector(d, r); let off = fbm(q.x * freq, q.y * freq, q.z * freq, 3) * amp * Math.min(1, r * 8); if (disp) off += disp(q, dn, t, a, r);
        q.addScaledVector(dn, off); pos.push(q.x, q.y, q.z); uv.push(j / rad, t * len * vRep);
      }
    }
    const R = rad + 1; for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * R + j, b = a + R; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const c0 = pos.length / 3; pos.push(ends[0].x, ends[0].y, ends[0].z, ends[1].x, ends[1].y, ends[1].z); uv.push(0.5, 0, 0.5, len * vRep);
    for (let j = 0; j < rad; j++) { idx.push(c0, j + 1, j); const e = seg * R; idx.push(c0 + 1, e + j, e + j + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const n = g.attributes.normal.array; for (let i = 0; i <= seg; i++) { const a = i * R * 3, b = (i * R + rad) * 3; for (let c = 0; c < 3; c++) { const m = (n[a + c] + n[b + c]) / 2; n[a + c] = n[b + c] = m; } }
    return mesh(g, mat);
  }
  function blob(r, sx, sy, sz, o = {}) {
    const { amp = 0.015, freq = 6, mat = SKIN, phiS = 0, phiL = Math.PI * 2, thS = 0, thL = Math.PI, shape = null, ws = 40, hs = 30 } = o;
    const g = new THREE.SphereGeometry(1, ws, hs, phiS, phiL, thS, thL), a = g.attributes.position, u = V();
    for (let i = 0; i < a.count; i++) { u.fromBufferAttribute(a, i); const p = V(u.x * r * sx, u.y * r * sy, u.z * r * sz); let off = fbm(p.x * freq + 9, p.y * freq, p.z * freq, 3) * amp; if (shape) off += shape(p, u); p.addScaledVector(u, off); a.setXYZ(i, p.x, p.y, p.z); }
    g.computeVertexNormals(); return mesh(g, mat);
  }

  // ================= THE HOLLOW ONE =================
  function makeHollow() {
    const skinMap = canvasTex(512, (x, s) => {
      noiseFill(x, s, 1.6, n => { const m = 0.5 + n * 0.6; return [178 + m * 30 - 20, 170 + m * 24 - 18, 156 + m * 20 - 16]; });
      for (let i = 0; i < 70; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); const px = Math.random() * s, py = Math.random() * s, r = 10 + Math.random() * 50; x.save(); x.translate(px, py); x.scale(r, r * (0.5 + Math.random())); g.addColorStop(0, `rgba(${90 + Math.random() * 40},60,80,.22)`); g.addColorStop(1, 'rgba(90,60,80,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); }
      for (let i = 0; i < 55; i++) { let px = Math.random() * s, py = Math.random() * s, w = 1.6; x.strokeStyle = `rgba(70,60,110,${0.18 + Math.random() * 0.2})`; for (let k = 0; k < 9; k++) { x.lineWidth = w; x.beginPath(); x.moveTo(px, py); px += (Math.random() - 0.5) * 34; py += Math.random() * 26; x.lineTo(px, py); x.stroke(); w *= 0.85; } }
      // dried blood smeared around where it eats
      for (let i = 0; i < 26; i++) { const px = Math.random() * s, py = Math.random() * s, r = 6 + Math.random() * 26, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(70,6,4,.55)'); g.addColorStop(1, 'rgba(70,6,4,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    }, 3);
    const skinBump = canvasTex(256, (x, s) => { noiseFill(x, s, 7, n => { const v = 128 + n * 110 + (Math.random() < 0.04 ? -40 : 0); return [v, v, v]; }); }, 3, false);
    const skin = new THREE.MeshPhysicalMaterial({ map: skinMap, bumpMap: skinBump, bumpScale: 0.02, roughness: 0.58, clearcoat: 0.5, clearcoatRoughness: 0.32, sheen: 0.45, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x5a2a26), color: 0x958a80 });
    const skullSkin = skin.clone(); skullSkin.vertexColors = true;
    const nail = new THREE.MeshPhysicalMaterial({ color: 0x1a120c, roughness: 0.3, clearcoat: 0.8 });
    const toothMats = [0xd8cba0, 0xc9b98a, 0xb8a578].map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    const gum = new THREE.MeshPhysicalMaterial({ color: 0x2a0b0e, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15, side: THREE.DoubleSide });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xb8ae88, roughness: 0.05, clearcoat: 1, emissive: 0x6a2a06, emissiveIntensity: 0.6 });
    const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x050302, roughness: 0.05, clearcoat: 1 });
    SKIN = skin;
    const root = new THREE.Group(), monster = new THREE.Group(); root.add(monster);
    // legs
    const legs = [], L1 = 1.0, L2 = 1.0;
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(0.28 * s, 2.25, 0); hip.rotation.z = s * 0.1; monster.add(hip);
      const th = new THREE.Group(); hip.add(th); th.add(flesh([V(0, 0.05, 0), V(0, -0.5, 0.035), V(0, -L1, 0)], [0.21, 0.17, 0.12], { seg: 24, rad: 16 }));
      const kn = new THREE.Group(); kn.position.y = -L1; th.add(kn); kn.add(blob(0.12, 1, 1, 1.1, { amp: 0.01, ws: 20, hs: 14 }));
      kn.add(flesh([V(0, 0, 0), V(0, -0.5, -0.035), V(0, -L2, 0)], [0.105, 0.09, 0.08], { seg: 24, rad: 14, disp: (q, dn) => Math.max(0, -dn.z) * 0.015 }));
      const an = new THREE.Group(); an.position.y = -L2; kn.add(an); an.add(blob(0.08, 1, 1, 1.2, { amp: 0.008, ws: 16, hs: 12 }));
      an.add(flesh([V(0, 0, 0), V(0, -0.2, 0.18), V(0, -0.4, 0.4)], [0.075, 0.06, 0.05], { seg: 14, rad: 12 }));
      const ball = new THREE.Group(); ball.position.set(0, -0.4, 0.4); an.add(ball); ball.add(blob(0.06, 1.3, 0.8, 1.1, { amp: 0.006, ws: 16, hs: 12 }));
      for (let k = -1; k <= 1; k++) { const e = V(k * 0.11, -0.07, 0.36 + (k === 0 ? 0.08 : 0)); ball.add(flesh([V(k * 0.055, 0, 0), V(k * 0.09, -0.05, 0.2 + (k === 0 ? 0.06 : 0)), e], [0.035, 0.028, 0.022, 0.016], { seg: 10, rad: 8, amp: 0.004 })); ball.add(flesh([e, V(e.x, -0.08, e.z + 0.06), V(e.x, -0.1, e.z + 0.12)], [0.016, 0.01, 0.001], { seg: 6, rad: 6, mat: nail, amp: 0 })); }
      legs.push({ s, th, kn, an, prev: 0 });
    }
    function solveLeg(l, dy, dz, tilt) { const D = Math.min(L1 + L2 - 0.002, Math.hypot(dy, dz)), al = Math.atan2(dz, -dy), be = Math.acos(Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))); const p1 = al + be, kz = L1 * Math.sin(p1), ky = -L1 * Math.cos(p1), p2 = Math.atan2(dz - kz, -(dy - ky)); l.th.rotation.x = -p1; l.kn.rotation.x = -(p2 - p1); l.an.rotation.x = p2 + tilt; }
    { const pv = blob(0.3, 1.2, 0.85, 0.9); pv.position.set(0, 2.28, 0); monster.add(pv); }
    // torso
    const pivot = new THREE.Group(); pivot.position.set(0, 2.25, 0); monster.add(pivot);
    const torso = new THREE.Group(); torso.position.set(0, -2.25, 0); pivot.add(torso);
    const breath = new THREE.Group(); breath.position.set(0, 3.3, 0.1); torso.add(breath);
    const body = flesh([V(0, 2.15, -0.02), V(0, 2.6, -0.06), V(0, 3.1, -0.1), V(0, 3.6, 0.02), V(0, 4.0, 0.32), V(0, 4.2, 0.66)], [0.26, 0.19, 0.22, 0.33, 0.37, 0.3, 0.2], { seg: 64, rad: 24, sa: [0.82, 0.7, 0.68, 0.72, 0.74, 0.8, 0.9], sb: [1.3, 1.0, 1.02, 1.2, 1.38, 1.25, 0.9], amp: 0.012,
      disp: (q, dn, t) => { let o = 0; const side = 1 - Math.abs(dn.x) * 0.2; if (q.y > 2.95 && q.y < 3.95 && dn.z > -0.4) o += Math.pow(Math.max(0, Math.sin((q.y - 2.95) * 36)), 3) * 0.028 * side * sm(2.95, 3.15, q.y) * (1 - sm(3.75, 3.95, q.y)); if (dn.z < -0.75) o += Math.pow(Math.max(0, Math.sin(t * 90)), 2) * 0.055 * sm(0.75, 0.95, -dn.z); if (q.y < 2.95 && dn.z > 0.2) o -= 0.05 * dn.z * sm(2.3, 2.6, q.y); o -= 0.03 * sm(0.4, 0.75, Math.abs(dn.x)) * (1 - sm(2.85, 3.05, q.y)); return o; } });
    body.position.set(0, -3.3, -0.1); breath.add(body);
    const parts = new THREE.Group(); parts.position.set(0, -3.3, -0.1); breath.add(parts);
    for (const s of [-1, 1]) { const gl = blob(0.17, 1, 1.1, 1, { amp: 0.012, ws: 20, hs: 14 }); gl.position.set(0.22 * s, 2.24, -0.06); monster.add(gl); }
    for (const s of [-1, 1]) {
      const sb = blob(0.17, 1, 1.2, 0.45, { amp: 0.01, ws: 20, hs: 14 }); sb.position.set(0.24 * s, 3.7, -0.27); sb.rotation.z = 0.3 * s; parts.add(sb);
      const sh = blob(0.19, 1.1, 0.95, 1, { amp: 0.012, ws: 24, hs: 16 }); sh.position.set(0.42 * s, 3.98, 0.42); torso.add(sh);
      torso.add(flesh([V(0.05 * s, 4.12, 0.62), V(0.22 * s, 4.08, 0.52), V(0.42 * s, 4.02, 0.45)], [0.04, 0.035, 0.04], { seg: 12, rad: 8, amp: 0.005 }));
    }
    { const sp = new THREE.CatmullRomCurve3([V(0, 2.15, -0.02), V(0, 2.6, -0.06), V(0, 3.1, -0.1), V(0, 3.6, 0.02), V(0, 4.0, 0.32), V(0, 4.2, 0.66)]), X = V(1, 0, 0);
      for (let i = 0; i < 8; i++) { const tt = 0.38 + i * 0.065, p = sp.getPointAt(tt), T = sp.getTangentAt(tt), N = V().crossVectors(T, X).normalize(); const L = 0.12 + Math.sin(i * 1.3 + 1) ** 2 * 0.16, b = p.clone().addScaledVector(N, 0.2); parts.add(flesh([b, b.clone().addScaledVector(N, L * 0.55).addScaledVector(T, 0.02), b.clone().addScaledVector(N, L).addScaledVector(T, -0.06)], [0.032, 0.017, 0.001], { seg: 8, rad: 6, mat: toothMats[2], amp: 0.002 })); } }
    torso.add(flesh([V(0, 3.95, 0.4), V(0, 4.18, 0.75), V(0, 4.3, 1.0)], [0.21, 0.14, 0.115], { seg: 16, rad: 16, disp: (q, dn) => sm(0.5, 0.85, Math.abs(dn.x)) * 0.02 }));
    // arms: absurdly long, knuckles near the ground
    const arms = [], fingers = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(0.44 * s, 3.97, 0.44); torso.add(arm);
      arm.add(flesh([V(0, 0, 0), V(0.18 * s, -0.55, 0.14), V(0.4 * s, -1.12, 0.34), V(0.43 * s, -1.72, 0.55), V(0.36 * s, -2.28, 0.74)], [0.13, 0.1, 0.07, 0.088, 0.07, 0.052, 0.045], { seg: 50, rad: 16, disp: (q, dn, t, a) => sm(0.5, 0.62, t) * Math.pow(Math.abs(Math.sin(a * 2.5)), 6) * 0.012 }));
      const hand = new THREE.Group(); hand.position.set(0.36 * s, -2.3, 0.75); arm.add(hand);
      const palm = blob(0.1, 0.95, 1.3, 0.5, { amp: 0.01, ws: 20, hs: 14 }); palm.position.y = -0.07; hand.add(palm);
      [[-0.055, 0.6], [-0.018, 0.72], [0.02, 0.7], [0.056, 0.58]].forEach(([dx, L]) => {
        const fg = new THREE.Group(); fg.position.set(dx * s, -0.16, 0.02); fg.rotation.set(0.2, 0, dx * 2.2 * s); hand.add(fg);
        fg.add(flesh([V(0, 0, 0), V(0, -L * 0.35, 0.03), V(0, -L * 0.68, 0.1), V(0, -L * 0.9, 0.2), V(0, -L, 0.3)], [0.026, 0.02, 0.024, 0.017, 0.02, 0.014, 0.011], { seg: 20, rad: 10, amp: 0.004 }));
        fg.add(flesh([V(0, -L, 0.3), V(0, -L - 0.07, 0.4), V(0, -L - 0.08, 0.52)], [0.011, 0.008, 0.001], { seg: 8, rad: 6, mat: nail, amp: 0 }));
        fingers.push({ fg, seed: Math.random() * 10, base: 0.2 });
      });
      const th = new THREE.Group(); th.position.set(-0.07 * s, -0.1, 0.06); th.rotation.set(0.6, 0, -0.7 * s); hand.add(th);
      th.add(flesh([V(0, 0, 0), V(0, -0.18, 0.05), V(0, -0.32, 0.14)], [0.028, 0.022, 0.016, 0.011], { seg: 12, rad: 8, amp: 0.004 }));
      th.add(flesh([V(0, -0.32, 0.14), V(0, -0.37, 0.22), V(0, -0.37, 0.3)], [0.011, 0.007, 0.001], { seg: 6, rad: 6, mat: nail, amp: 0 }));
      fingers.push({ fg: th, seed: 3, base: 0.6 });
      const grip = new THREE.Object3D(); grip.position.set(0, -0.45, 0.25); hand.add(grip);
      arms.push({ arm, s, hand, grip, rx: 0, rz: 0, ry: 0 });
      if (s < 0) { const metal = new THREE.MeshStandardMaterial({ color: 0x4a3a30, metalness: 0.85, roughness: 0.62 }); const cuff = mesh(new THREE.TorusGeometry(0.068, 0.024, 10, 28), metal, V(0.34 * s, -2.16, 0.71)); cuff.rotation.x = Math.PI / 2 - 0.35; arm.add(cuff); let y = -2.24; for (let c = 0; c < 13; c++) { const l = mesh(new THREE.TorusGeometry(0.038, 0.011, 8, 16), metal, V(0.34 * s + Math.sin(c * 0.6) * 0.025, y, 0.73 + c * 0.018)); l.scale.set(1, 1.5, 1); l.rotation.y = c % 2 ? Math.PI / 2 : 0; arm.add(l); y -= 0.082; } }
    }
    // head
    const neck = new THREE.Group(); neck.position.set(0, 4.3, 1.0); torso.add(neck);
    neck.add(flesh([V(0, -0.04, -0.08), V(0, 0.03, 0.18), V(0, 0.06, 0.34)], [0.115, 0.1, 0.13], { seg: 12, rad: 16 }));
    const head = new THREE.Group(); head.position.set(0, 0.08, 0.42); neck.add(head);
    { const g = new THREE.SphereGeometry(1, 72, 56), a = g.attributes.position, u = V(), col = []; const G2 = (p, c, s2) => Math.exp(-p.distanceToSquared(c) / s2);
      const sockets = [V(0.15, 0.06, 0.47), V(-0.15, 0.06, 0.47)], cheeks = [V(0.21, -0.06, 0.34), V(-0.21, -0.06, 0.34)], hollows = [V(0.18, -0.17, 0.3), V(-0.18, -0.17, 0.3)], temples = [V(0.33, 0.06, 0.1), V(-0.33, 0.06, 0.1)];
      for (let i = 0; i < a.count; i++) { u.fromBufferAttribute(a, i); const p = V(u.x * 0.36, u.y * 0.42, u.z * 0.55); let o = 0, dk = 0;
        for (const c of sockets) { const w = G2(p, c, 0.0075); o -= 0.1 * w; dk += w * 0.9; } for (const c of cheeks) o += 0.032 * G2(p, c, 0.006); for (const c of hollows) { const w = G2(p, c, 0.008); o -= 0.05 * w; dk += w * 0.3; } for (const c of temples) { const w = G2(p, c, 0.012); o -= 0.035 * w; dk += w * 0.2; }
        o += 0.032 * Math.exp(-((p.y - 0.15) ** 2) / 0.0018) * sm(0.25, 0.45, p.z); const nw = G2(p, V(0, -0.07, 0.52), 0.0016); o -= 0.045 * nw; dk += nw; o += 0.02 * Math.exp(-(p.x ** 2) / 0.002) * sm(-0.2, 0.2, p.z) * sm(0.2, 0.38, p.y); o += fbm(p.x * 14, p.y * 14, p.z * 14, 4) * 0.009 + fbm(p.x * 40, p.y * 6, p.z * 40, 2) * 0.004;
        p.addScaledVector(u, o); if (p.y < -0.205 && p.z > -0.05) { const m = sm(-0.05, 0.15, p.z); p.y = p.y + (-0.205 - p.y) * m; dk += m * 0.85; }
        a.setXYZ(i, p.x, p.y, p.z); const v = 1 - Math.min(0.92, dk); col.push(v, v * 0.97, v * 0.97); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); head.add(mesh(g, skullSkin)); }
    for (const s of [-1, 1]) { head.add(mesh(new THREE.SphereGeometry(0.048, 20, 14), eyeMat, V(0.15 * s, 0.058, 0.405))); const pu = mesh(new THREE.SphereGeometry(0.014, 10, 8), pupilMat, V(0.15 * s, 0.058, 0.452)); pu.scale.set(0.5, 1.2, 0.4); head.add(pu); }
    const mouth = blob(0.17, 1, 0.5, 1.3, { mat: gum, amp: 0.005, ws: 24, hs: 16 }); mouth.position.set(0, -0.24, 0.25); head.add(mouth);
    function teeth(parent, y, dir, n, rx, rz, z0) { for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.35, big = Math.abs(i - (n - 1) / 2) > n * 0.28 && Math.abs(i - (n - 1) / 2) < n * 0.42; const L = (0.06 + Math.random() * 0.05) * (big ? 1.7 : 1), g = new THREE.ConeGeometry(0.016 + Math.random() * 0.006, L, 8, 3); const pa = g.attributes.position; for (let k = 0; k < pa.count; k++) { const yy = pa.getY(k); pa.setZ(k, pa.getZ(k) + (yy / L) ** 2 * 0.02 * dir); } g.computeVertexNormals(); const t = mesh(g, toothMats[Math.random() * 3 | 0], V(Math.sin(a) * rx, y - dir * L * 0.42, z0 + Math.cos(a) * rz)); t.rotation.set(dir > 0 ? Math.PI + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3, -a, (Math.random() - 0.5) * 0.3); t.castShadow = false; parent.add(t); } }
    teeth(head, -0.205, 1, 15, 0.2, 0.27, 0.21);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.21, 0.03); head.add(jaw);
    const jbm = skin.clone(); jbm.side = THREE.DoubleSide; const jb = blob(1, 0.28, 0.16, 0.43, { thS: Math.PI / 2, thL: Math.PI / 2, amp: 0.008, freq: 12, mat: jbm }); jb.position.z = 0.03; jaw.add(jb);
    const tongue = blob(0.16, 1.2, 0.25, 2.2, { mat: gum, amp: 0.01, ws: 20, hs: 14 }); tongue.position.set(0, -0.02, 0.05); jaw.add(tongue);
    teeth(jaw, 0, -1, 13, 0.18, 0.39, 0.03);
    const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x17130f, roughness: 0.45, clearcoat: 0.5 }); const hair = new THREE.Group(); head.add(hair);
    for (let i = 0; i < 40; i++) { const a = (Math.random() - 0.5) * 4.1, el = 0.2 + Math.random() * 0.6, dir = V(Math.sin(a) * Math.cos(el), Math.sin(el), -Math.cos(a) * Math.cos(el)); const st = V(dir.x * 0.34, dir.y * 0.4, dir.z * 0.52), L = 0.45 + Math.random() * 0.95, front = Math.abs(a) > 1.5; const jx = dir.x * 0.12 + (Math.random() - 0.5) * 0.1, jz = front ? 0.06 : -0.08; const hm = flesh([st, st.clone().addScaledVector(dir, 0.05).add(V(0, -0.08, 0)), V(st.x + jx, st.y - L * 0.5, st.z + jz), V(st.x + jx * 1.6, st.y - L, st.z + jz * 1.6)], [0.009, 0.007, 0.004, 0.001], { seg: 10, rad: 4, mat: hairMat, amp: 0 }); hm.castShadow = false; hair.add(hm); }
    const droolMat = new THREE.MeshPhysicalMaterial({ color: 0x8a2a20, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.7 });
    const drool = []; for (const [dx, L] of [[-0.09, 0.32], [0.04, 0.5], [0.12, 0.22]]) { const g = new THREE.Group(); g.position.set(dx, -0.03, 0.4); g.add(flesh([V(0, 0, 0), V(0.004, -L * 0.5, 0.01), V(0, -L, 0)], [0.006, 0.0025, 0.008], { seg: 8, rad: 5, mat: droolMat, amp: 0 })); jaw.add(g); drool.push(g); }
    root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    // ---- animation state ----
    const R = { g: root, monster, pivot, torso, breath, neck, head, jaw, arms, fingers, legs, drool, hair, eyeMat, skin, droolMat,
      walk: 0, speed: 0, ph: 0, crouch: 0, scream: 0, twitchT: 0, look: null, armPose: null, contort: V(), contortT: V(), nextC: 0, stepCb: null, bodyTilt: 0, t: 0 };
    const tmp = V();
    R.update = function (dt) {
      const t = (R.t += dt); const Wk = R.walk, cr = R.crouch, sO = R.scream, tw = Math.max(0, R.twitchT -= dt) > 0 ? Math.min(1, R.twitchT / 0.9) : 0;
      const b = Math.sin(t * 1.25) * 0.03; breath.scale.set(1 + b, 1 + b * 0.4, 1 + b * 1.3);
      const S = 0.3 + Math.min(0.32, R.speed * 0.05), duty = 0.62, Tc = Math.max(0.3, Math.min(1.7, R.speed > 0.05 ? 2 * S * 0.85 / (duty * R.speed) : 1.7));
      R.ph = (R.ph + dt / Tc * Math.min(1, Wk * 3)) % 1;
      const bob = -(0.5 - 0.5 * Math.cos(R.ph * Math.PI * 4)) * 0.07 * Wk;
      monster.position.y = bob - cr * 0.85;
      legs.forEach(l => { const ph = (R.ph + (l.s > 0 ? 0.5 : 0)) % 1; let z, lift = 0, tl = 0; if (ph < duty) z = S - 2 * S * (ph / duty); else { const u = (ph - duty) / (1 - duty); z = -S + 2 * S * u * u * (3 - 2 * u); lift = Math.sin(Math.PI * u) * 0.24; tl = Math.sin(Math.PI * u) * 0.35; }
        solveLeg(l, -1.75 + cr * 0.85 + (lift - bob) * Wk, -0.26 + z * Wk + cr * 0.35, tl * Wk); if (Wk > 0.5 && l.prev >= duty && ph < duty && R.stepCb) R.stepCb(l.s); l.prev = ph; });
      if (t > R.nextC) { R.contortT.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.6); R.nextC = t + 0.5 + Math.random() * 1.4; } R.contort.lerp(R.contortT, 0.25);
      const sw = Math.sin(R.ph * Math.PI * 2), C2 = R.contort;
      pivot.rotation.set((0.13 + C2.x * 0.3) * Wk + cr * 0.55 + R.bodyTilt, (sw * 0.34 + C2.y * 0.6) * Wk * (R.speed > 3 ? 0.5 : 1), (0.17 + Math.sin(R.ph * Math.PI * 4) * 0.07 + C2.z * 0.4) * Wk * (R.speed > 3 ? 0.4 : 1));
      torso.rotation.x = Math.sin(t * 0.7) * 0.02 - sO * 0.18;
      const jerk = tw > 0 ? Math.sin(t * 55) * tw * 0.32 : 0; let yaw = 0, pitch = 0, Wl = 0;
      if (R.look) { torso.worldToLocal(tmp.copy(R.look)); const dx = tmp.x - neck.position.x, dy = tmp.y - neck.position.y, dz = tmp.z - neck.position.z; yaw = Math.max(-1.25, Math.min(1.25, Math.atan2(dx, dz))); pitch = Math.max(-0.7, Math.min(0.7, -Math.atan2(dy, Math.hypot(dx, dz)))); Wl = 1; }
      const iw = 1 - Wl * 0.85;
      neck.rotation.set(Math.sin(t * 0.6) * 0.07 * iw + pitch * Wl + jerk * 0.4 - sO * 0.45, Math.sin(t * 0.33) * 0.32 * iw + yaw * Wl + jerk, Math.sin(t * 0.41) * 0.28 * iw + 0.18 * Wl + jerk * 0.6);
      neck.rotation.y -= pivot.rotation.y * 0.9 * (1 - Wl); neck.rotation.z += (1.05 + C2.z * 1.6) * Wk * (1 - Wl * 0.6) * (R.speed > 3 ? 0.3 : 1); neck.rotation.x += C2.x * 0.8 * Wk;
      const jt = R.jawT != null ? R.jawT : Math.max(Math.pow(Math.max(0, Math.sin(t * 0.8)), 10) * 0.18, sO * 0.95) + (tw > 0 ? Math.abs(Math.sin(t * 40)) * tw * 0.25 : 0); jaw.rotation.x += (jt - jaw.rotation.x) * Math.min(1, dt * 14);
      const k = Math.min(1, dt * 8);
      arms.forEach(({ arm, s }, i) => { const ap = R.armPose && R.armPose[s < 0 ? 'L' : 'R']; let rx, rz, ry;
        if (ap) { rx = ap[0]; rz = s * ap[1]; ry = s * (ap[2] || 0); } else { rx = Math.sin(t * 0.9 + i) * 0.05 - sO * 0.55 - Math.sin(R.ph * Math.PI * 2 + (s > 0 ? Math.PI : 0)) * (R.speed > 3 ? 0.9 : s > 0 ? 0.38 : 0.16) * Wk + 0.1 * Wk - (R.speed > 3 ? 0.5 : 0) * Wk; rz = s * (0.04 + Math.sin(t * 1.1 + i * 2) * 0.035 + sO * 0.4 + (s < 0 ? 0.12 : -0.05) * Wk) + jerk * 0.15; ry = (s > 0 ? 0.35 : -0.1) * Wk; }
        arm.rotation.x += (rx - arm.rotation.x) * k; arm.rotation.z += (rz - arm.rotation.z) * k; arm.rotation.y += (ry - arm.rotation.y) * k; });
      fingers.forEach(f => { const n = Math.sin(t * 2.1 + f.seed) * 0.5 + 0.5; f.fg.rotation.x = f.base + n * 0.22 + sO * 0.5 + (R.grip ? 0.9 : 0) + tw * Math.sin(t * 30 + f.seed) * 0.4; });
      eyeMat.emissiveIntensity = (0.6 + Math.sin(t * 2.6) * 0.15 + sO * 1.6) * (Math.random() < 0.01 ? 0.2 : 1);
      drool.forEach((d, i) => { d.rotation.x = -jaw.rotation.x - neck.rotation.x * 0.6; d.rotation.z = Math.sin(t * 1.7 + i) * 0.12; d.scale.y = 1 + Math.sin(t * 0.9 + i * 2) * 0.25 + sO * 0.6; });
      hair.rotation.x = -neck.rotation.x * 0.4 + Math.sin(t * 1.3) * 0.03; hair.rotation.z = -neck.rotation.z * 0.35;
    };
    R.headPos = (out) => head.getWorldPosition(out);
    root.visible = false; scene.add(root); SKIN = null; return R;
  }

  // ================= THE MIRE WALKER =================
  function makeMire() {
    const skinMap = canvasTex(512, (x, s) => {
      noiseFill(x, s, 1.5, n => { const m = 0.5 + n * 0.7; return [52 + m * 44, 60 + m * 44, 34 + m * 24]; });
      for (let i = 0; i < 90; i++) { const px = Math.random() * s, py = Math.random() * s, r = 8 + Math.random() * 44, g = x.createRadialGradient(px, py, 0, px, py, r); const c = Math.random() < 0.5 ? '70,105,40' : (Math.random() < 0.5 ? '30,24,14' : '110,100,60'); g.addColorStop(0, `rgba(${c},.35)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
      for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${150 + Math.random() * 40},${160 + Math.random() * 30},110,${Math.random() * 0.25})`; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, Math.random() * 2.2, 0, 7); x.fill(); }
    }, 3);
    const skinBump = canvasTex(256, (x, s) => { noiseFill(x, s, 6, n => { const v = 128 + n * 90; return [v, v, v]; }); for (let i = 0; i < 700; i++) { const r = 1 + Math.random() * 3, px = Math.random() * s, py = Math.random() * s, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } }, 3, false);
    const skin = new THREE.MeshPhysicalMaterial({ map: skinMap, bumpMap: skinBump, bumpScale: 0.03, roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.15, sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x3a4a20), color: 0xa4aa96, emissive: 0x000000 });
    const headSkin = skin.clone(); headSkin.vertexColors = true;
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x3e5c22, roughness: 1, bumpMap: skinBump, bumpScale: 0.04 });
    const weedMat = new THREE.MeshPhysicalMaterial({ color: 0x2a3a16, roughness: 0.45, clearcoat: 0.6 });
    const fungusMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.75 });
    const nail = new THREE.MeshPhysicalMaterial({ color: 0x14100a, roughness: 0.3, clearcoat: 0.8 });
    const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xd6d2b8, roughness: 0.25, clearcoat: 0.7 });
    const gum = new THREE.MeshPhysicalMaterial({ color: 0x2c0d0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x9cff6a, roughness: 0.05, clearcoat: 1, emissive: 0x46ff22, emissiveIntensity: 1.1 });
    const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x020302, roughness: 0.05, clearcoat: 1 });
    const finMat = new THREE.MeshPhysicalMaterial({ color: 0x4b3e22, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.5 });
    SKIN = skin;
    function fin(base, tips, mat = finMat) { const pos = [], idx = []; base.forEach((b, i) => pos.push(b.x, b.y, b.z, tips[i].x, tips[i].y, tips[i].z)); for (let i = 0; i < base.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const grp = new THREE.Group(); grp.add(mesh(g, mat)); base.forEach((b, i) => { if (i % 2) return; const t = tips[i]; grp.add(flesh([b, b.clone().lerp(t, 0.5), t.clone().addScaledVector(t.clone().sub(b).normalize(), 0.03)], [0.014, 0.009, 0.001], { seg: 6, rad: 5, mat: spineMat, amp: 0 })); }); return grp; }
    const root = new THREE.Group(), rise = new THREE.Group(); root.add(rise); const mossy = [];
    for (const s of [-1, 1]) rise.add(flesh([V(0.38 * s, 1.1, 0), V(0.5 * s, 0.55, 0.22), V(0.56 * s, 0.1, 0.28), V(0.56 * s, -0.35, 0.05), V(0.58 * s, -0.75, 0), V(0.62 * s, -0.9, 0.3)], [0.34, 0.3, 0.24, 0.2, 0.18, 0.15, 0.16], { seg: 28, rad: 16, amp: 0.02, freq: 5 }));
    const pelvis = blob(0.46, 1.25, 0.85, 1, { amp: 0.03, freq: 4 }); pelvis.position.set(0, 1.15, 0); rise.add(pelvis); mossy.push(pelvis);
    const torso = new THREE.Group(); torso.position.set(0, 1.1, 0); rise.add(torso);
    const breath = new THREE.Group(); breath.position.set(0, 1.1, 0.1); torso.add(breath);
    const spinePts = [V(0, 0, 0), V(0, 0.55, 0.05), V(0, 1.15, 0), V(0, 1.75, 0.12), V(0, 2.2, 0.42), V(0, 2.42, 0.72)];
    const body = flesh(spinePts, [0.44, 0.52, 0.5, 0.52, 0.46, 0.32], { seg: 56, rad: 24, sa: [0.92, 1.05, 0.88, 0.82, 0.86, 0.9], sb: [1.2, 1.1, 1.15, 1.4, 1.55, 1.1], amp: 0.03, freq: 4,
      disp: (q, dn) => { let o = 0; if (dn.z > 0) o += 0.13 * dn.z * Math.exp(-((q.y - 0.5) ** 2) / 0.14); if (dn.z < -0.6) o += 0.06 * Math.exp(-((q.y - 1.9) ** 2) / 0.2); o += Math.pow(Math.max(0, noise(q.x * 9, q.y * 9, q.z * 9)), 4) * 0.05; return o; } });
    body.position.set(0, -1.1, -0.1); breath.add(body); mossy.push(body);
    const parts = new THREE.Group(); parts.position.set(0, -1.1, -0.1); breath.add(parts);
    const traps = blob(0.42, 1.6, 0.7, 1, { amp: 0.03, freq: 4 }); traps.position.set(0, 2.35, 0.35); parts.add(traps); mossy.push(traps);
    for (const s of [-1, 1]) { const sh = blob(0.33, 1, 0.95, 1.05, { amp: 0.03, freq: 4 }); sh.position.set(0.74 * s, 2.15, 0.33); parts.add(sh); mossy.push(sh); }
    { const curve = new THREE.CatmullRomCurve3(spinePts), X = V(1, 0, 0), base = [], tips = []; for (let i = 0; i <= 18; i++) { const tt = 0.34 + i / 18 * 0.5, p = curve.getPointAt(tt), T = curve.getTangentAt(tt), N = V().crossVectors(T, X).normalize(), u = i / 18; const b = p.clone().addScaledVector(N, 0.36 + Math.sin(u * Math.PI) * 0.05); base.push(b); tips.push(b.clone().addScaledVector(N, (0.12 + Math.sin(u * Math.PI) * 0.22) * (i % 2 ? 0.7 : 1) + fbm(u * 8, 0, 0, 2) * 0.05).addScaledVector(T, -0.08)); } parts.add(fin(base, tips)); }
    const arms = [], fingers = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(0.8 * s, 2.12, 0.36); parts.add(arm);
      const am = flesh([V(0, 0, 0), V(0.12 * s, -0.55, 0.12), V(0.2 * s, -1.08, 0.3), V(0.23 * s, -1.58, 0.45), V(0.2 * s, -2.05, 0.55)], [0.26, 0.22, 0.16, 0.19, 0.15, 0.12], { seg: 36, rad: 16, amp: 0.025, freq: 5 }); arm.add(am); mossy.push(am);
      const hand = new THREE.Group(); hand.position.set(0.2 * s, -2.08, 0.56); arm.add(hand);
      const palm = blob(0.16, 1, 1.15, 0.6, { amp: 0.015, ws: 20, hs: 14 }); palm.position.y = -0.1; hand.add(palm);
      const roots = [], mids = [];
      [[-0.09, 0.42], [-0.03, 0.5], [0.03, 0.5], [0.09, 0.42]].forEach(([dx, L]) => { const fg = new THREE.Group(); fg.position.set(dx * s, -0.22, 0.02); fg.rotation.set(0.25, 0, dx * 2.4 * s); hand.add(fg); fg.add(flesh([V(0, 0, 0), V(0, -L * 0.4, 0.04), V(0, -L * 0.75, 0.12), V(0, -L, 0.24)], [0.05, 0.04, 0.042, 0.03, 0.022], { seg: 16, rad: 10, amp: 0.006 })); fg.add(flesh([V(0, -L, 0.24), V(0, -L - 0.07, 0.34), V(0, -L - 0.07, 0.45)], [0.02, 0.013, 0.001], { seg: 6, rad: 6, mat: nail, amp: 0 })); fg.updateMatrix(); roots.push(V(0, 0.02, 0).applyMatrix4(fg.matrix)); mids.push(V(0, -L * 0.6, 0.08).applyMatrix4(fg.matrix)); fingers.push({ fg, seed: Math.random() * 10, base: 0.25 }); });
      const web = fin(roots, mids, finMat); web.children.slice(1).forEach(c => c.visible = false); hand.add(web);
      arms.push({ arm, s, hand });
    }
    const neck = new THREE.Group(); neck.position.set(0, 2.3, 0.75); parts.add(neck);
    const head = new THREE.Group(); head.position.set(0, 0.06, 0.28); neck.add(head);
    { const g = new THREE.SphereGeometry(1, 72, 54), a = g.attributes.position, u = V(), col = []; const G2 = (p, c, s2) => Math.exp(-p.distanceToSquared(c) / s2);
      for (let i = 0; i < a.count; i++) { u.fromBufferAttribute(a, i); const p = V(u.x * 0.55, u.y * 0.36, u.z * 0.55); let o = 0, dk = 0;
        for (const s of [-1, 1]) { o += 0.07 * G2(p, V(0.27 * s, 0.17, 0.33), 0.014); o += 0.04 * G2(p, V(0.15 * s, 0.27, 0.22), 0.006); const nw = G2(p, V(0.07 * s, 0.05, 0.52), 0.0009); o -= 0.03 * nw; dk += nw; const gw = G2(p, V(0.5 * s, -0.04, -0.08), 0.03), slit = Math.pow(Math.max(0, Math.sin(p.z * 55)), 4) * gw; o -= 0.02 * slit; dk += slit * 0.8; }
        o += 0.03 * G2(p, V(0, 0.32, 0), 0.02); o += fbm(p.x * 9, p.y * 9, p.z * 9, 4) * 0.022 + Math.pow(Math.max(0, noise(p.x * 26, p.y * 26, p.z * 26)), 5) * 0.05; p.addScaledVector(u, o);
        if (p.y < -0.12 && p.z > -0.15) { const m = sm(-0.15, 0.05, p.z); p.y = p.y + (-0.12 - p.y) * m; dk += m * 0.85; }
        a.setXYZ(i, p.x, p.y, p.z); const v = 1 - Math.min(0.9, dk), tg = 0.04 * sm(0.1, 0.35, p.y); col.push(v * 0.95, v * (1 + tg), v * 0.9); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); const hm = mesh(g, headSkin); head.add(hm); mossy.push(hm); }
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.085, 24, 16), eyeMat, V(0.28 * s, 0.19, 0.37)); e.castShadow = false; head.add(e); const lid = blob(0.095, 1, 0.55, 1, { amp: 0.006, ws: 18, hs: 12 }); lid.position.set(0.28 * s, 0.25, 0.35); lid.rotation.x = -0.3; head.add(lid); const pu = mesh(new THREE.SphereGeometry(0.02, 10, 8), pupilMat, V(0.28 * s + 0.02 * s, 0.19, 0.452)); pu.scale.set(0.35, 2.4, 0.35); pu.castShadow = false; head.add(pu); }
    const mouthIn = blob(0.36, 1.2, 0.4, 1.2, { mat: gum, amp: 0.01, ws: 24, hs: 16 }); mouthIn.position.set(0, -0.14, 0.12); head.add(mouthIn);
    function needles(parent, y, dir, n, rx, rz, z0, len) { for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.5, L = len * (0.6 + Math.random() * 0.8); const t = mesh(new THREE.ConeGeometry(0.009 + Math.random() * 0.005, L, 6), toothMat, V(Math.sin(a) * rx, y - dir * L * 0.45, z0 + Math.cos(a) * rz)); t.rotation.set(dir > 0 ? Math.PI + (Math.random() - 0.5) * 0.35 : (Math.random() - 0.5) * 0.35, -a, (Math.random() - 0.5) * 0.35); t.castShadow = false; parent.add(t); } }
    needles(head, -0.12, 1, 22, 0.43, 0.46, 0.04, 0.1); needles(head, -0.12, 1, 14, 0.36, 0.38, 0.03, 0.06);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.12, -0.08); head.add(jaw);
    const jbm = skin.clone(); jbm.side = THREE.DoubleSide; const jb = blob(1, 0.5, 0.22, 0.6, { thS: Math.PI / 2, thL: Math.PI / 2, amp: 0.02, freq: 6, mat: jbm }); jb.position.z = 0.08; jaw.add(jb); mossy.push(jb);
    const tongue = blob(0.3, 1.1, 0.18, 1.5, { mat: gum, amp: 0.012, ws: 20, hs: 14 }); tongue.position.set(0, -0.04, 0.08); jaw.add(tongue);
    needles(jaw, 0, -1, 20, 0.41, 0.52, 0.08, 0.09);
    for (const s of [-1, 1]) jaw.add(flesh([V(0.2 * s, -0.18, 0.5), V(0.24 * s, -0.36, 0.52), V(0.22 * s, -0.56, 0.48)], [0.025, 0.014, 0.003], { seg: 8, rad: 6, mat: weedMat, amp: 0.003 }));
    { const base = [], tips = []; for (let i = 0; i <= 12; i++) { const u = i / 12, z = 0.3 - u * 0.62, y = 0.36 * Math.sqrt(Math.max(0, 1 - (z / 0.56) ** 2)) - 0.03; base.push(V(0, y, z)); tips.push(V(0, y + 0.06 + Math.sin(Math.PI * (u * 0.9 + 0.1)) * 0.16 * (i % 2 ? 0.75 : 1), z - 0.07)); } head.add(fin(base, tips)); }
    const gills = []; for (const s of [-1, 1]) { const gf = fin([V(0.5 * s, 0.06, 0.02), V(0.5 * s, -0.02, -0.1), V(0.48 * s, -0.12, -0.2)], [V(0.64 * s, 0.08, -0.04), V(0.68 * s, -0.04, -0.16), V(0.6 * s, -0.16, -0.28)]); gf.children.slice(1).forEach(c => c.visible = false); head.add(gf); gills.push({ gf, s }); }
    const eyeLight = new THREE.PointLight(0xb0ff80, 0.2, 1.6, 2); eyeLight.position.set(0, 0.2, 0.6); head.add(eyeLight);
    // moss, fungus and dripping weeds (fewer than the showcase page so the game stays fast)
    const weeds = [], mossGeos = [0, 1, 2].map(() => blob(1, 1, 0.35, 1, { mat: mossMat, amp: 0.35, freq: 3, ws: 12, hs: 8 }).geometry);
    mossy.forEach(m => { const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal, n = V(), p = V(), up = V(0, 1, 0); const count = m === body ? 55 : m === traps ? 20 : 10;
      for (let c = 0, tries = 0; c < count && tries < count * 20; tries++) { const i = Math.random() * pa.count | 0; n.fromBufferAttribute(na, i); p.fromBufferAttribute(pa, i);
        if (n.y > 0.25 || (m === body && n.z < -0.3)) { const r = 0.03 + Math.random() * 0.07, mb = mesh(mossGeos[Math.random() * 3 | 0], mossMat); mb.castShadow = false; mb.scale.setScalar(r); mb.position.copy(p); mb.quaternion.setFromUnitVectors(up, n); m.add(mb); if (Math.random() < 0.06) { const f = mesh(new THREE.SphereGeometry(0.06, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), fungusMat, p.clone().addScaledVector(n, 0.02)); f.scale.set(1, 0.35, 1); f.quaternion.setFromUnitVectors(up, n); m.add(f); } c++; }
        if (n.y < 0.15 && n.y > -0.6 && Math.random() < 0.35 && weeds.length < 40) { const L = 0.2 + Math.random() * 0.7, g = new THREE.Group(); g.position.copy(p); m.add(g); const out = V(n.x, 0, n.z).normalize().multiplyScalar(0.04); const wm = flesh([V(0, 0, 0), out.clone().add(V(0, -L * 0.3, 0)), out.clone().multiplyScalar(1.4).add(V((Math.random() - 0.5) * 0.05, -L * 0.7, 0)), out.clone().multiplyScalar(1.2).add(V(0, -L, 0))], [0.012, 0.01, 0.006, 0.002], { seg: 8, rad: 4, mat: weedMat, amp: 0.004, freq: 30 }); wm.castShadow = false; g.add(wm); weeds.push({ g, seed: Math.random() * 10 }); } } });
    root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const burnMats = [skin, headSkin, jbm];
    const M = { g: root, rise, torso, breath, neck, head, jaw, arms, fingers, gills, weeds, eyeMat, eyeLight, burnMats, mossMat, emerge: 0, roar: 0, reach: 0, burn: 0, look: null, t: 0, sway: 1 };
    const tmp = V();
    M.update = function (dt) {
      const t = (M.t += dt), rO = M.roar, ee = M.emerge * M.emerge * (3 - 2 * M.emerge);
      rise.position.y = -3.52 * (1 - ee) + Math.sin(t * 0.9) * 0.03;
      const b = Math.sin(t * (0.9 + M.burn * 6)) * (0.03 + M.burn * 0.03); breath.scale.set(1 + b, 1 + b * 0.3, 1 + b * 1.2);
      torso.rotation.x = Math.sin(t * 0.6) * 0.025 + rO * 0.12 + M.reach * 0.35 + (M.burn > 0 ? Math.sin(t * 13) * 0.05 * M.burn : 0); torso.rotation.z = Math.sin(t * 0.45) * 0.03 * M.sway + (M.burn > 0 ? Math.sin(t * 9.3) * 0.12 * M.burn : 0);
      let yaw = 0, pitch = 0, Wl = 0; if (M.look) { parts.worldToLocal(tmp.copy(M.look)); const dx = tmp.x - neck.position.x, dy = tmp.y - neck.position.y, dz = tmp.z - neck.position.z; yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(dx, dz))); pitch = Math.max(-0.5, Math.min(0.5, -Math.atan2(dy, Math.hypot(dx, dz)))); Wl = 1; }
      const iw = 1 - Wl * 0.85, thrash = M.burn > 0 ? Math.sin(t * 17) * 0.3 * M.burn : 0;
      neck.rotation.set(Math.sin(t * 0.5) * 0.06 * iw + pitch * Wl - rO * 0.35 + (1 - ee) * -0.25 - M.burn * 0.4, Math.sin(t * 0.3) * 0.35 * iw + yaw * Wl + thrash, Math.sin(t * 0.37) * 0.1 * iw + thrash * 0.5);
      jaw.rotation.x += ((M.jawT != null ? M.jawT : Math.max(Math.pow(Math.max(0, Math.sin(t * 0.7)), 12) * 0.15, rO * 0.85, M.burn * (0.6 + Math.sin(t * 11) * 0.25))) - jaw.rotation.x) * Math.min(1, dt * 12);
      arms.forEach(({ arm, s }, i) => { const rx = Math.sin(t * 0.7 + i) * 0.05 - rO * 0.6 - M.reach * 1.35 - (M.burn > 0 ? (0.8 + Math.sin(t * 7 + i * 2) * 0.7) * M.burn : 0), rz = s * (0.06 + Math.sin(t * 0.8 + i * 2) * 0.04 + rO * 0.5 + M.burn * 0.3); arm.rotation.x += (rx - arm.rotation.x) * Math.min(1, dt * 8); arm.rotation.z += (rz - arm.rotation.z) * Math.min(1, dt * 8); });
      fingers.forEach(f => { f.fg.rotation.x = f.base + (Math.sin(t * 1.7 + f.seed) * 0.5 + 0.5) * 0.15 + rO * 0.4 + M.reach * 0.3; });
      gills.forEach(({ gf, s }) => { gf.rotation.y = s * (Math.sin(t * 3.2) * 0.12 + rO * 0.5 + M.burn * 0.4); });
      weeds.forEach(w => { w.g.rotation.x = Math.sin(t * 1.1 + w.seed) * 0.12 - torso.rotation.x; w.g.rotation.z = Math.sin(t * 0.9 + w.seed * 2) * 0.1; });
      const glow = (1.1 + Math.sin(t * 2.2) * 0.2 + rO * 2) * (Math.random() < 0.008 ? 0.15 : 1); eyeMat.emissiveIntensity = glow; eyeLight.intensity = glow * 0.12 * (head.visible ? 1 : 0);
      // acid burn: skin blisters, darkens and smokes green
      if (M.burn > 0) { const k2 = Math.min(1, M.burn); burnMats.forEach(m => { m.color.setRGB(0.64 - k2 * 0.2, 0.67 - k2 * 0.45, 0.59 - k2 * 0.45); m.emissive.setRGB(0.09 * k2 * (0.6 + Math.random() * 0.4), 0.05 * k2 * (0.6 + Math.random() * 0.4), 0.01 * k2); m.roughness = 0.42 + k2 * 0.4; m.bumpScale = 0.022 + k2 * 0.06; }); M.mossMat.color.setRGB(0.24 - k2 * 0.15, 0.36 - k2 * 0.25, 0.13 - k2 * 0.08); }
    };
    M.headPos = (out) => head.getWorldPosition(out);
    root.visible = false; scene.add(root); SKIN = null; return M;
  }
  return { makeHollow, makeMire, flesh: (...a) => { SKIN = a[2] && a[2].mat; return flesh(...a); }, blob: (r, sx, sy, sz, o) => { SKIN = o && o.mat; return blob(r, sx, sy, sz, o); }, fbm, noise };
})();
