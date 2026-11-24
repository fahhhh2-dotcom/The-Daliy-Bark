'use strict';
/* Hollow Pines — realism layer: night sky, post-processing, rain + lightning, ground cover, mist, flashlight beam */
if (!settings.quality) settings.quality = touch ? 'low' : 'high';
const HQ = () => settings.quality === 'high';
renderer.toneMapping = THREE.NoToneMapping;
scene.background = null;

// ---------- night sky ----------
const SKYU = { uFog: { value: scene.fog.color }, uMoon: { value: new THREE.Vector3(-0.55, 0.33, -0.77).normalize() }, uTime: { value: 0 }, uFlash: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } };
moon.position.copy(SKYU.uMoon.value).multiplyScalar(120);
const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
  uniforms: SKYU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uFog, uMoon, uTint; uniform float uTime, uFlash; varying vec3 vDir;
    float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n3(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 top = vec3(0.004, 0.007, 0.016);
      vec3 col = mix(uFog, top, smoothstep(-0.02, 0.55, h));
      vec3 sp = floor(d * 380.0); float s = h3(sp);
      col += vec3(0.85, 0.9, 1.0) * step(0.9982, s) * smoothstep(0.05, 0.4, h) * (0.55 + 0.45 * sin(uTime * 2.0 + s * 90.0));
      float md = max(dot(d, uMoon), 0.0);
      col += vec3(1.0, 0.96, 0.88) * smoothstep(0.99955, 0.99975, md) * 2.2;
      col += vec3(0.18, 0.21, 0.28) * pow(md, 260.0) + vec3(0.04, 0.05, 0.075) * pow(md, 14.0);
      vec2 uv = d.xz / (max(h, 0.0) + 0.22);
      float c = fbm(vec3(uv * 1.4 + vec2(uTime * 0.012, uTime * 0.004), uTime * 0.01));
      c = smoothstep(0.42, 0.78, c) * smoothstep(0.0, 0.2, h);
      vec3 cc = mix(vec3(0.016, 0.02, 0.03), vec3(0.13, 0.14, 0.17), pow(md, 6.0));
      col = mix(col, cc, c * 0.9);
      col = col * uTint + uFlash * vec3(0.55, 0.6, 0.8) * (0.25 + c * 1.2);
      gl_FragColor = vec4(col, 1.0);
    }`
}));
sky.renderOrder = -1000; sky.frustumCulled = false; scene.add(sky);

// ---------- post-processing (HDR -> bloom -> grade -> ACES -> grain) ----------
const FX = { t: 0, flash: 0, rainAmt: 0.4, hemiBase: hemi.intensity, moonBase: moon.intensity };
{
  const canHF = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  FX.type = canHF ? THREE.HalfFloatType : THREE.UnsignedByteType;
  FX.makeRT = () => { if (FX.rt) FX.rt.dispose(); FX.rt = new THREE.WebGLRenderTarget(4, 4, { type: FX.type, samples: HQ() && renderer.capabilities.isWebGL2 ? 4 : 0 }); };
  FX.makeRT();
  FX.bA = new THREE.WebGLRenderTarget(4, 4, { type: FX.type }); FX.bB = new THREE.WebGLRenderTarget(4, 4, { type: FX.type });
  const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const SM = (u, fs) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false });
  FX.bright = SM({ tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } }, `uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ vec3 c = (texture2D(tDiffuse, vUv + uTexel * vec2(-1.,-1.)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(1.,-1.)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(-1.,1.)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(1.,1.)).rgb) * 0.25;
      if (!(c.r < 65000.0) || !(c.g < 65000.0) || !(c.b < 65000.0)) c = vec3(0.0); c = clamp(c, 0.0, 60.0); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(c * smoothstep(0.55, 1.4, l), 1.0); }`);
  FX.blur = SM({ tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270;
      c += (texture2D(tDiffuse, vUv + uDir * 1.3846).rgb + texture2D(tDiffuse, vUv - uDir * 1.3846).rgb) * 0.3162;
      c += (texture2D(tDiffuse, vUv + uDir * 3.2308).rgb + texture2D(tDiffuse, vUv - uDir * 3.2308).rgb) * 0.0703;
      gl_FragColor = vec4(c, 1.0); }`);
  FX.final = SM({ tDiffuse: { value: null }, tBloom: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uExposure: { value: 1.35 }, uBloom: { value: 0.65 }, uGrain: { value: 0.05 }, uCA: { value: 0.007 }, uVig: { value: 0.62 }, uRed: { value: 0 }, uFlash: { value: 0 } },
    `uniform sampler2D tDiffuse, tBloom; uniform float uTime, uExposure, uBloom, uGrain, uCA, uVig, uRed, uFlash; uniform vec2 uRes; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 cc = vUv - 0.5; float r2 = dot(cc, cc); vec2 off = cc * r2 * uCA * 4.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (!(col.r < 65000.0) || !(col.g < 65000.0) || !(col.b < 65000.0)) col = vec3(0.0);
      vec3 bl = texture2D(tBloom, vUv).rgb; if (!(bl.r < 65000.0)) bl = vec3(0.0); col += bl * uBloom;
      col *= uExposure * (1.0 + uFlash * 0.6);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, 0.8);
      col *= mix(vec3(0.82, 0.94, 1.14), vec3(1.06, 1.0, 0.93), smoothstep(0.0, 0.4, l));
      col = mix(col, col * vec3(1.35, 0.55, 0.5), uRed);
      col = aces(col);
      col *= 1.0 - uVig * smoothstep(0.12, 0.85, r2 * 2.3);
      col = srgb(col);
      float g = fract(sin(dot(floor(vUv * uRes) + fract(uTime * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`);
  FX.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), FX.final); FX.quad.frustumCulled = false;
  FX.qScene = new THREE.Scene(); FX.qScene.add(FX.quad); FX.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  FX.size = new THREE.Vector2();
  FX.resize = () => { renderer.getDrawingBufferSize(FX.size); const w = FX.size.x, h = FX.size.y; FX.rt.setSize(w, h); const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2); FX.bA.setSize(bw, bh); FX.bB.setSize(bw, bh); FX.final.uniforms.uRes.value.set(w, h); FX.bright.uniforms.uTexel.value.set(1 / w, 1 / h); };
  FX.pass = (mat, target) => { FX.quad.material = mat; renderer.setRenderTarget(target); renderer.render(FX.qScene, FX.qCam); };
  FX.render = () => {
    renderer.setRenderTarget(FX.rt); renderer.render(scene, camera);
    FX.bright.uniforms.tDiffuse.value = FX.rt.texture; FX.pass(FX.bright, FX.bA);
    const bw = FX.bA.width, bh = FX.bA.height;
    for (let i = 0; i < 2; i++) { FX.blur.uniforms.tDiffuse.value = FX.bA.texture; FX.blur.uniforms.uDir.value.set(1 / bw, 0); FX.pass(FX.blur, FX.bB); FX.blur.uniforms.tDiffuse.value = FX.bB.texture; FX.blur.uniforms.uDir.value.set(0, 1 / bh); FX.pass(FX.blur, FX.bA); }
    FX.final.uniforms.tDiffuse.value = FX.rt.texture; FX.final.uniforms.tBloom.value = FX.bA.texture; FX.pass(FX.final, null);
  };
  FX.resize();
}

// ---------- rain ----------
const RAIN_MAX = 1500;
const rain = (() => {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(RAIN_MAX * 6); pos.fill(-9999); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8090a2, transparent: true, opacity: 0.3, depthWrite: false }));
  m.frustumCulled = false; scene.add(m); return { m, pos, head: new Float32Array(RAIN_MAX * 3).fill(-9999), wind: 1.2 };
})();
function updateRain(dt, amt) {
  const n = Math.floor(RAIN_MAX * amt * (HQ() ? 1 : 0.45)), cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, hd = rain.head, p = rain.pos;
  rain.m.visible = n > 0; if (!n) return;
  for (let i = 0; i < RAIN_MAX; i++) {
    const j = i * 3, k = i * 6;
    if (i >= n) { p[k + 1] = p[k + 4] = -9999; continue; }
    hd[j + 1] -= 15 * dt; hd[j] += rain.wind * dt;
    if (hd[j + 1] < cy - 4 || Math.abs(hd[j] - cx) > 20 || Math.abs(hd[j + 2] - cz) > 20) { hd[j] = cx + (rand() - 0.5) * 38; hd[j + 2] = cz + (rand() - 0.5) * 38; hd[j + 1] = cy + 2 + rand() * 14; }
    p[k] = hd[j]; p[k + 1] = hd[j + 1]; p[k + 2] = hd[j + 2]; p[k + 3] = hd[j] - rain.wind * 0.04; p[k + 4] = hd[j + 1] + 0.6; p[k + 5] = hd[j + 2];
  }
  rain.m.geometry.attributes.position.needsUpdate = true;
}

// ---------- ground cover: ferns + grass that follow you ----------
function coverGeo(cards, tilt, w, h, up) {
  const parts = [];
  for (let i = 0; i < cards; i++) { const p = new THREE.PlaneGeometry(w, h); p.translate(0, h / 2, 0); p.rotateX(-tilt); p.translate(0, 0, 0.05); p.rotateY(i / cards * Math.PI * 2 + (i % 2) * 0.3); parts.push(p); }
  const g = merge(parts), ps = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3();
  for (let k = 0; k < ps.count; k++) { v.set(ps.getX(k) * 0.6, up, ps.getZ(k) * 0.6).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
  return g;
}
const COVER = [
  { geo: coverGeo(6, 0.75, 0.75, 1.0, 1.4), mat: windify(MSM({ map: TX.fern, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), 0.06, 0.15, 'fern'), n: 1600, tile: 76, clear: true },
  { geo: coverGeo(3, 0.12, 0.7, 0.55, 2.0), mat: windify(MSM({ map: TX.grass, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), 0.1, 0.05, 'grass'), n: 3200, tile: 70, clear: false }
].map(c => {
  const im = new THREE.InstancedMesh(c.geo, c.mat, c.n); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; scene.add(im);
  const off = new Float32Array(c.n * 4); for (let i = 0; i < c.n; i++) { off[i * 4] = rand() * c.tile; off[i * 4 + 1] = rand() * c.tile; off[i * 4 + 2] = rand() * 6.28; off[i * 4 + 3] = 0.6 + rand() * 0.9; }
  const cols = new THREE.Color(); for (let i = 0; i < c.n; i++) { cols.setRGB(0.75 + rand() * 0.4, 0.8 + rand() * 0.35, 0.7 + rand() * 0.3); im.setColorAt(i, cols); }
  return Object.assign(c, { im, off, lx: 1e9, lz: 1e9 });
});
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function placeCover(px, pz, force) {
  for (const c of COVER) {
    if (!force && Math.hypot(px - c.lx, pz - c.lz) < 2.5) continue; c.lx = px; c.lz = pz;
    const n = Math.floor(c.n * (HQ() ? 1 : 0.4)); c.im.count = n; const T2 = c.tile, half = T2 / 2;
    for (let i = 0; i < n; i++) {
      const x = px + ((((c.off[i * 4] - px) % T2) + T2) % T2) - half, z = pz + ((((c.off[i * 4 + 1] - pz) % T2) + T2) % T2) - half;
      let ok = Math.hypot(x - LK.x, z - LK.z) > LK.c + 1.5 && pathDist(x, z) > 1.5;
      if (ok && c.clear) for (const f of FLAT) if (Math.hypot(x - f.x, z - f.z) < f.r * 0.95) { ok = false; break; }
      if (ok) for (const b of BOX) if (Math.abs(x - b[0]) < b[2] + 0.4 && Math.abs(z - b[1]) < b[3] + 0.4) { ok = false; break; }
      const sc = ok ? c.off[i * 4 + 3] : 0; _e.set(0, c.off[i * 4 + 2], 0); _q.setFromEuler(_e); _p.set(x, H(x, z) - 0.03, z); _s.set(sc, sc * (0.8 + (i % 5) * 0.1), sc);
      _m.compose(_p, _q, _s); c.im.setMatrixAt(i, _m);
    }
    c.im.instanceMatrix.needsUpdate = true;
  }
}

// ---------- ground mist ----------
const MIST = [];
{ const mm = new THREE.SpriteMaterial({ map: TX.mist, color: 0x9aa6b4, transparent: true, opacity: 0.16, depthWrite: false }); for (let i = 0; i < 28; i++) { const s = new THREE.Sprite(mm); s.scale.set(10 + rand() * 6, 3 + rand() * 1.5, 1); s.userData = { ox: rand() * 64, oz: rand() * 64, sp: 0.2 + rand() * 0.4 }; scene.add(s); MIST.push(s); } }
function updateMist(px, pz, dt, vis) { for (const s of MIST) { s.visible = vis; if (!vis) continue; const u = s.userData; u.ox += u.sp * dt; const x = px + ((((u.ox - px) % 64) + 64) % 64) - 32, z = pz + ((((u.oz - pz) % 64) + 64) % 64) - 32; s.position.set(x, H(x, z) + 0.9, z); } }

// ---------- flashlight beam (fake volumetric) + dust in the beam ----------
const beamFX = (() => {
  const g = new THREE.ConeGeometry(2.4, 13, 28, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, -6.5);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = clamp(-position.z / 13.0, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = vN / max(length(vN), 1e-4), v = vV / max(length(vV), 1e-4); float f = clamp(abs(dot(n, v)), 0.0, 1.0); float a = pow(max(1.0 - vT, 0.0), 1.7) * smoothstep(0.0, 0.1, vT) * pow(f, 2.2) * uI; a = clamp(a, 0.0, 1.0); gl_FragColor = vec4(vec3(1.0, 0.92, 0.78) * a, 1.0); }` }));
  m.position.copy(flash.position); m.rotation.set(0.006, -0.022, 0); m.renderOrder = 5; m.frustumCulled = false; camera.add(m); return m;
})();
const dust = (() => {
  const n = 260, geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (rand() - 0.5) * 5; p[i * 3 + 1] = (rand() - 0.5) * 3; p[i * 3 + 2] = -0.6 - rand() * 8; }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffeedd, size: 0.018, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.frustumCulled = false; camera.add(m); return { m, p, n };
})();
function updateDust(dt, on) { dust.m.material.opacity += ((on ? 0.55 : 0) - dust.m.material.opacity) * Math.min(1, dt * 4); const p = dust.p; for (let i = 0; i < dust.n; i++) { p[i * 3] += Math.sin(FX.t * 0.3 + i) * 0.03 * dt; p[i * 3 + 1] += (Math.cos(FX.t * 0.25 + i * 1.7) * 0.04 - 0.02) * dt; if (p[i * 3 + 1] < -1.5) p[i * 3 + 1] = 1.5; } dust.m.geometry.attributes.position.needsUpdate = true; }

// ---------- lightning ----------
FX.light = { t: 14, e: -1 };
function lightningCurve(e) { return e < 0.07 ? 1 : e < 0.13 ? 0.15 : e < 0.21 ? 0.9 : e < 0.55 ? 0.9 * (1 - (e - 0.21) / 0.34) : 0; }
FX.strike = onStrike => { FX.light.e = 0; const d = 0.6 + rand() * 2.2; setTimeout(() => SND.thunder(), d * 1000); if (onStrike) onStrike(); };

// ---------- per-frame ----------
FX.update = (dt, o) => {
  FX.t += dt; WIND.value = FX.t; SKYU.uTime.value = FX.t; FX.final.uniforms.uTime.value = FX.t;
  const inside = !!o.tunnel;
  sky.visible = !inside; sky.position.copy(camera.position);
  // lightning
  if (!inside && o.storm > 0) { FX.light.t -= dt; if (FX.light.t <= 0) { FX.light.t = (o.storm > 0.7 ? 18 : 30) + rand() * 30; FX.strike(o.onStrike); } }
  let f = 0; if (FX.light.e >= 0) { FX.light.e += dt; f = lightningCurve(FX.light.e); if (FX.light.e > 0.6) FX.light.e = -1; }
  if (inside) f = 0;
  if (FX.flash === 0 && f === 0) { FX.hemiBase = hemi.intensity; FX.moonBase = moon.intensity; }
  FX.flash = f; SKYU.uFlash.value = f; FX.final.uniforms.uFlash.value = f * 0.4;
  if (f > 0) { hemi.intensity = FX.hemiBase + f * 2.2; moon.intensity = FX.moonBase + f * 3; } else if (FX.light.e < 0) { hemi.intensity = FX.hemiBase; moon.intensity = FX.moonBase; }
  updateRain(dt, inside ? 0 : o.rain);
  if (!inside) placeCover(o.x, o.z, false); for (const c of COVER) c.im.visible = !inside;
  updateMist(o.x, o.z, dt, !inside);
  beamFX.material.uniforms.uI.value = flash.intensity > 0 ? (inside ? 0.05 : 0.085) * Math.min(1, flash.intensity / 2.7) : 0;
  updateDust(dt, flash.intensity > 0);
  FX.final.uniforms.uRed.value += ((o.red || 0) - FX.final.uniforms.uRed.value) * Math.min(1, dt * 2);
};
FX.setQuality = () => { FX.makeRT(); FX.resize(); placeCover(camera.position.x, camera.position.z, true); };
