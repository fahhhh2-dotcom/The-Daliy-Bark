// SkyCast alert server (Cloudflare Worker + Durable Object)
// - The app subscribes a phone/browser with its city's location (POST /subscribe).
// - Every minute it checks the National Weather Service for new warnings at each
//   subscribed location and sends a Web Push notification, so warnings arrive even
//   when SkyCast is closed.
// - VAPID keys are created on first use and kept in the Durable Object's storage,
//   so no secret keys need to be set up by hand.
import { DurableObject } from "cloudflare:workers";

const UA = "SkyCast weather app (https://skycastweather.com)";
const ORIGINS = ["https://skycastweather.com", "https://www.skycastweather.com", "https://fahhhh2-dotcom.github.io"];
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];
const MAX_SUBS = 20000;
const BUDGET = 45;          // outgoing requests per check (Workers Free allows 50)
const MAX_PER_SUB = 3;      // at most this many warnings per phone per check

const enc = new TextEncoder();
export const b64u = buf => { let s = ""; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const concat = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}

// RFC 8291 (Message Encryption for Web Push), aes128gcm content coding
export async function encryptPayload(payload, p256dh, authSecret) {
  const ua = unb64u(p256dh), auth = unb64u(authSecret);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, concat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, 4096); head[20] = 65;
  return concat(head, asPub, ct);
}

// RFC 8292 (VAPID) token
export async function vapidAuth(endpoint, keys) {
  const aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://skycastweather.com" })));
  const priv = await crypto.subtle.importKey("jwk", keys.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, enc.encode(h + "." + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${keys.pub}`;
}

export async function makeVapidKeys() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
}

const okHost = endpoint => { try { const u = new URL(endpoint); return u.protocol === "https:" && PUSH_HOSTS.some(r => r.test(u.hostname)); } catch (e) { return false; } };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
const sha = async s => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s))).slice(0, 32);

function cors(res, req) {
  const o = req.headers.get("Origin") || "";
  const allow = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : ORIGINS[0];
  const r = new Response(res.body, res);
  r.headers.set("Access-Control-Allow-Origin", allow);
  r.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "Content-Type");
  r.headers.set("Access-Control-Max-Age", "86400");
  r.headers.set("Vary", "Origin");
  return r;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }), req);
    const path = new URL(req.url).pathname;
    if (!["/vapid", "/subscribe", "/unsubscribe", "/test", "/health"].includes(path)) return cors(new Response("SkyCast alert server", { status: 200 }), req);
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    return cors(await hub.fetch(req), req);
  },
  async scheduled(event, env, ctx) {
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    ctx.waitUntil(hub.fetch("https://hub/tick", { method: "POST" }));
  }
};

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
      lat REAL NOT NULL, lon REAL NOT NULL, name TEXT, lang TEXT, created INTEGER, updated INTEGER, fails INTEGER DEFAULT 0, last_test INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sent (sub_id TEXT NOT NULL, alert_id TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (sub_id, alert_id))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`);
  }
  get(k) { const r = this.sql.exec("SELECT v FROM kv WHERE k = ?", k).toArray(); return r.length ? r[0].v : null; }
  set(k, v) { this.sql.exec("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, String(v)); }
  async keys() {
    if (this._keys) return this._keys;
    let k = this.get("vapid");
    if (!k) { k = JSON.stringify(await makeVapidKeys()); this.set("vapid", k); }
    return (this._keys = JSON.parse(k));
  }
  dropSub(id) { this.sql.exec("DELETE FROM subs WHERE id = ?", id); this.sql.exec("DELETE FROM sent WHERE sub_id = ?", id); }

  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/tick") { await this.tick(); return new Response("ok"); }
    if (path === "/vapid") return json({ key: (await this.keys()).pub });
    if (path === "/health") return json({ ok: true, subscribers: this.sql.exec("SELECT COUNT(*) AS n FROM subs").one().n, lastCheck: this.get("last_tick") });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    if (+(req.headers.get("Content-Length") || 0) > 16384) return json({ error: "Too large" }, 413);
    let b; try { b = await req.json(); } catch (e) { return json({ error: "Bad JSON" }, 400); }

    if (path === "/subscribe") {
      const s = b && b.sub, k = s && s.keys;
      const lat = +b.lat, lon = +b.lon;
      if (!s || typeof s.endpoint !== "string" || !okHost(s.endpoint) || !k || typeof k.p256dh !== "string" || typeof k.auth !== "string") return json({ error: "Bad subscription" }, 400);
      if (!(lat > 17 && lat < 72 && lon > -180 && lon < -60)) return json({ error: "US locations only" }, 400);
      try { if (unb64u(k.p256dh).length !== 65 || unb64u(k.auth).length !== 16) throw 0; } catch (e) { return json({ error: "Bad keys" }, 400); }
      const id = await sha(s.endpoint), now = Date.now();
      const exists = this.sql.exec("SELECT 1 FROM subs WHERE id = ?", id).toArray().length;
      if (!exists && this.sql.exec("SELECT COUNT(*) AS n FROM subs").one().n >= MAX_SUBS) return json({ error: "Full" }, 503);
      const name = String(b.name || "your city").slice(0, 60), lang = b.lang === "es" ? "es" : "en";
      this.sql.exec(`INSERT INTO subs (id, endpoint, p256dh, auth, lat, lon, name, lang, created, updated, fails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, lat = excluded.lat, lon = excluded.lon,
        name = excluded.name, lang = excluded.lang, updated = excluded.updated, fails = 0`, id, s.endpoint, k.p256dh, k.auth, lat, lon, name, lang, now, now);
      // warnings the app already showed on screen won't be sent again
      for (const a of (Array.isArray(b.seen) ? b.seen : []).slice(-60)) if (typeof a === "string" && a.length < 200)
        this.sql.exec("INSERT OR IGNORE INTO sent (sub_id, alert_id, t) VALUES (?, ?, ?)", id, a, now);
      return json({ ok: true });
    }
    if (path === "/unsubscribe") {
      if (typeof b.endpoint === "string") this.dropSub(await sha(b.endpoint));
      return json({ ok: true });
    }
    if (path === "/test") {
      if (typeof b.endpoint !== "string") return json({ error: "Missing endpoint" }, 400);
      const sub = this.sql.exec("SELECT * FROM subs WHERE id = ?", await sha(b.endpoint)).toArray()[0];
      if (!sub) return json({ error: "Not subscribed" }, 404);
      if (Date.now() - (sub.last_test || 0) < 60000) return json({ error: "Wait a minute" }, 429);
      this.sql.exec("UPDATE subs SET last_test = ? WHERE id = ?", Date.now(), sub.id);
      const es = sub.lang === "es";
      const r = await this.push(sub, {
        title: es ? "✅ Alerta de prueba de SkyCast" : "✅ SkyCast test alert",
        body: es ? `Así llegarán los avisos para ${sub.name}, incluso con SkyCast cerrado.` : `This is how warnings for ${sub.name} will arrive, even when SkyCast is closed.`,
        tag: "skycast-test", url: "./"
      });
      if (r.gone) this.dropSub(sub.id);
      return json({ ok: r.ok, status: r.status }, r.ok ? 200 : 502);
    }
    return json({ error: "Not found" }, 404);
  }

  async push(sub, msg) {
    try {
      const keys = await this.keys();
      const body = await encryptPayload(JSON.stringify(msg), sub.p256dh, sub.auth);
      const res = await fetch(sub.endpoint, {
        method: "POST", body,
        headers: { Authorization: await vapidAuth(sub.endpoint, keys), TTL: "21600", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" }
      });
      return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
    } catch (e) { return { ok: false, status: 0, gone: false }; }
  }

  async tick() {
    const now = Date.now();
    this.set("last_tick", new Date(now).toISOString());
    this.sql.exec("DELETE FROM sent WHERE t < ?", now - 10 * 86400000);
    this.sql.exec("DELETE FROM subs WHERE fails >= 30");
    const subs = this.sql.exec("SELECT * FROM subs ORDER BY id").toArray();
    if (!subs.length) return;
    const groups = new Map();
    for (const s of subs) { const k = s.lat.toFixed(2) + "," + s.lon.toFixed(2); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    const points = [...groups.keys()].sort();
    const start = (+(this.get("cursor") || 0)) % points.length;
    let budget = BUDGET, done = 0;
    for (; done < points.length && budget > 1; done++) {
      const point = points[(start + done) % points.length], list = groups.get(point);
      budget--;
      let alerts;
      try {
        const r = await fetch(`https://api.weather.gov/alerts/active?point=${point}`, { headers: { Accept: "application/geo+json", "User-Agent": UA } });
        if (!r.ok) continue;
        alerts = ((await r.json()).features || []).map(f => f.properties).filter(a => a && a.id && a.status === "Actual" && a.messageType !== "Cancel"
          && (!(a.ends || a.expires) || Date.parse(a.ends || a.expires) > now));
      } catch (e) { continue; }
      let cutShort = false;
      for (const s of list) {
        let sentNow = 0;
        for (const a of alerts) {
          if (sentNow >= MAX_PER_SUB) break;
          if (budget <= 0) { cutShort = true; break; }
          if (this.sql.exec("SELECT 1 FROM sent WHERE sub_id = ? AND alert_id = ?", s.id, a.id).toArray().length) continue;
          // an update to a warning this phone already got is recorded but not sent again
          const refs = (a.references || []).map(x => x && (x.identifier || x["@id"])).filter(Boolean);
          if (a.messageType === "Update" && refs.some(r => this.sql.exec("SELECT 1 FROM sent WHERE sub_id = ? AND alert_id = ?", s.id, r).toArray().length)) {
            this.sql.exec("INSERT OR IGNORE INTO sent (sub_id, alert_id, t) VALUES (?, ?, ?)", s.id, a.id, now); continue;
          }
          budget--; sentNow++;
          const r = await this.push(s, { title: `⚠️ ${a.event} — ${s.name}`, body: a.headline || a.areaDesc || "", tag: a.id, url: "./#weather" });
          if (r.gone) { this.dropSub(s.id); break; }
          if (r.ok) { this.sql.exec("INSERT OR IGNORE INTO sent (sub_id, alert_id, t) VALUES (?, ?, ?)", s.id, a.id, now); this.sql.exec("UPDATE subs SET fails = 0 WHERE id = ?", s.id); }
          else this.sql.exec("UPDATE subs SET fails = fails + 1 WHERE id = ?", s.id);
        }
      }
      if (cutShort) break;   // finish this place first on the next check
    }
    this.set("cursor", (start + done) % points.length);
  }
}
