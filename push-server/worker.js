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
    if (!["/vapid", "/subscribe", "/unsubscribe", "/test", "/health", "/email/subscribe", "/email/confirm", "/email/unsubscribe"].includes(path)) return cors(new Response("SkyCast alert server", { status: 200 }), req);
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    return cors(await hub.fetch(req), req);
  },
  async scheduled(event, env, ctx) {
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    ctx.waitUntil(hub.fetch("https://hub/tick", { method: "POST" }));
    ctx.waitUntil(hub.fetch("https://hub/emailtick", { method: "POST" }));
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
    // email updates: daily forecast and weather news (double opt-in, one-click unsubscribe)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS emails (email TEXT PRIMARY KEY, token TEXT NOT NULL, confirmed INTEGER DEFAULT 0,
      lat REAL NOT NULL, lon REAL NOT NULL, name TEXT, lang TEXT, forecast INTEGER DEFAULT 1, news INTEGER DEFAULT 1,
      fc_url TEXT, tz TEXT, last_day TEXT, last_news INTEGER DEFAULT 0, created INTEGER, confirm_sent INTEGER DEFAULT 0, fails INTEGER DEFAULT 0)`);
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
    if (path === "/emailtick") { await this.emailTick(); return new Response("ok"); }
    if (path === "/health") return json({ ok: true, subscribers: this.sql.exec("SELECT COUNT(*) AS n FROM subs").one().n, lastCheck: this.get("last_tick"),
      email: emailReady(this.env), emailSubscribers: this.sql.exec("SELECT COUNT(*) AS n FROM emails WHERE confirmed = 1").one().n });
    if (path === "/email/confirm" || path === "/email/unsubscribe") return this.emailLink(req, path);
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
    if (path === "/email/subscribe") return this.emailSubscribe(b, req);
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

  /* ---------- Email updates ---------- */
  async emailSubscribe(b, req) {
    if (!emailReady(this.env)) return json({ error: "Email isn't set up yet" }, 503);
    const email = String(b.email || "").trim().toLowerCase();
    if (email.length > 120 || !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(email)) return json({ error: "Bad email" }, 400);
    const lat = +b.lat, lon = +b.lon;
    if (!(lat > 17 && lat < 72 && lon > -180 && lon < -60)) return json({ error: "US locations only" }, 400);
    const forecast = b.forecast === false ? 0 : 1, news = b.news === false ? 0 : 1;
    if (!forecast && !news) return json({ error: "Pick at least one" }, 400);
    const name = String(b.name || "your city").replace(/[<>]/g, "").slice(0, 60), lang = b.lang === "es" ? "es" : "en", now = Date.now();
    // simple limits so nobody can use the form to flood an inbox
    const ip = req.headers.get("CF-Connecting-IP") || "?", ipKey = "ip:" + await sha(ip), ipHits = JSON.parse(this.get(ipKey) || "[]").filter(t => now - t < 3600000);
    if (ipHits.length >= 5) return json({ error: "Too many tries. Try again later." }, 429);
    this.set(ipKey, JSON.stringify([...ipHits, now]));
    if (this.sql.exec("SELECT COUNT(*) AS n FROM emails").one().n >= MAX_SUBS) return json({ error: "Full" }, 503);
    const old = this.sql.exec("SELECT * FROM emails WHERE email = ?", email).toArray()[0];
    if (old && now - (old.confirm_sent || 0) < 10 * 60000 && !old.confirmed) return json({ ok: true, pending: true });
    // look up the forecast address and time zone for this place once
    let fc_url = null, tz = "America/New_York";
    try {
      const r = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: { Accept: "application/geo+json", "User-Agent": UA } });
      if (r.ok) { const P = (await r.json()).properties; fc_url = P.forecast; tz = P.timeZone || tz; }
    } catch (e) {}
    const token = old ? old.token : b64u(crypto.getRandomValues(new Uint8Array(24)));
    this.sql.exec(`INSERT INTO emails (email, token, confirmed, lat, lon, name, lang, forecast, news, fc_url, tz, created, confirm_sent) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET lat = excluded.lat, lon = excluded.lon, name = excluded.name, lang = excluded.lang, forecast = excluded.forecast,
      news = excluded.news, fc_url = excluded.fc_url, tz = excluded.tz, confirm_sent = excluded.confirm_sent`,
      email, token, lat, lon, name, lang, forecast, news, fc_url, tz, now, now);
    const es = lang === "es", base = new URL(req.url).origin;
    this.set("base", base);
    const link = `${base}/email/confirm?t=${token}`;
    const what = [forecast && (es ? "el pronóstico de cada mañana" : "a forecast every morning"), news && (es ? "noticias del clima" : "weather news")].filter(Boolean).join(es ? " y " : " and ");
    const r = await this.sendEmail(email, es ? "Confirma tus correos de SkyCast" : "Confirm your SkyCast emails", emailPage(
      es ? "Un paso más" : "One more step",
      `<p>${es ? `Toca el botón para recibir ${what} para <b>${esc(name)}</b>.` : `Tap the button to get ${what} for <b>${esc(name)}</b>.`}</p>
       <p style="margin:24px 0"><a href="${link}" style="background:#ffd36b;color:#0b1424;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;display:inline-block">${es ? "Sí, envíenme correos" : "Yes, send me emails"}</a></p>
       <p style="color:#667085;font-size:13px">${es ? "Si no pediste esto, ignora este correo y no recibirás nada más." : "If you didn't ask for this, ignore this email and you won't get anything else."}</p>`, null),
      `${es ? "Confirma aquí" : "Confirm here"}: ${link}`, null);
    if (!r.ok) return json({ error: "Couldn't send the email" }, 502);
    return json({ ok: true });
  }

  emailLink(req, path) {
    const u = new URL(req.url), t = u.searchParams.get("t") || "";
    const row = t ? this.sql.exec("SELECT * FROM emails WHERE token = ?", t).toArray()[0] : null;
    const es = row && row.lang === "es";
    const page = (title, msg) => new Response(emailPage(title, `<p>${msg}</p><p style="margin-top:24px"><a href="https://skycastweather.com" style="color:#2563eb">${es ? "Abrir SkyCast" : "Open SkyCast"}</a></p>`, null),
      { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (path === "/email/confirm") {
      if (!row) return page("Link expired", "This link doesn't work anymore. Sign up again in SkyCast.");
      this.sql.exec("UPDATE emails SET confirmed = 1 WHERE token = ?", t);
      return page(es ? "¡Listo!" : "You're all set!", es ? `Recibirás correos de SkyCast para ${esc(row.name)}.` : `You'll get SkyCast emails for ${esc(row.name)}. The first one arrives in the morning (between 6 and 11 AM).`);
    }
    // unsubscribe works with a click (GET) and with the email app's one-click button (POST)
    if (row) this.sql.exec("DELETE FROM emails WHERE token = ?", t);
    return page(es ? "Cancelado" : "Unsubscribed", es ? "Ya no recibirás correos de SkyCast." : "You won't get any more SkyCast emails.");
  }

  async sendEmail(to, subject, html, text, unsubUrl) {
    try {
      const headers = unsubUrl ? { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.env.EMAIL_FROM || "SkyCast <weather@skycastweather.com>", to: [to], subject, html, text, headers })
      });
      return { ok: r.ok, status: r.status };
    } catch (e) { return { ok: false, status: 0 }; }
  }

  // every minute: send the morning email to anyone whose local time is between 6 and 11 AM and who hasn't had today's yet
  async emailTick() {
    if (!emailReady(this.env)) return;
    const now = Date.now();
    this.sql.exec("DELETE FROM emails WHERE confirmed = 0 AND created < ?", now - 7 * 86400000);
    this.sql.exec("DELETE FROM emails WHERE fails >= 10");
    const rows = this.sql.exec("SELECT * FROM emails WHERE confirmed = 1 ORDER BY email").toArray();
    const due = rows.filter(r => { const l = localParts(now, r.tz); return l.hour >= 6 && l.hour < 11 && r.last_day !== l.day; });
    if (!due.length) return;
    let budget = 40, news = null;
    if (due.some(r => r.news)) {
      budget--;
      try { const j = await (await fetch("https://skycastweather.com/news.json?t=" + Math.floor(now / 600000), { headers: { "User-Agent": UA } })).json(); news = Array.isArray(j.articles) ? j.articles : []; } catch (e) { news = []; }
    }
    const alertCache = new Map(), fcCache = new Map();
    for (const r of due) {
      if (budget < 4) break;
      const day = localParts(now, r.tz).day, es = r.lang === "es";
      const unsub = `${this.get("base")}/email/unsubscribe?t=${r.token}`;
      const parts = [], textParts = [];
      if (r.forecast && r.fc_url) {
        let periods = fcCache.get(r.fc_url);
        if (!periods) { budget--; try { const f = await fetch(r.fc_url, { headers: { Accept: "application/geo+json", "User-Agent": UA } }); periods = f.ok ? ((await f.json()).properties.periods || []) : []; } catch (e) { periods = []; } fcCache.set(r.fc_url, periods); }
        const pt = r.lat.toFixed(2) + "," + r.lon.toFixed(2);
        let alerts = alertCache.get(pt);
        if (!alerts) { budget--; try { const a = await fetch(`https://api.weather.gov/alerts/active?point=${pt}`, { headers: { Accept: "application/geo+json", "User-Agent": UA } }); alerts = a.ok ? ((await a.json()).features || []).map(x => x.properties).filter(x => x && x.status === "Actual") : []; } catch (e) { alerts = []; } alertCache.set(pt, alerts); }
        if (alerts.length) {
          parts.push(`<div style="background:#fde8ea;border:1px solid #f5b5bd;border-radius:14px;padding:14px 16px;margin:0 0 18px"><b style="color:#a0001a">⚠️ ${es ? "Avisos activos" : "Active warnings"}</b>${alerts.slice(0, 4).map(a => `<div style="margin-top:6px">${esc(a.event)}${a.ends || a.expires ? ` · ${es ? "hasta" : "until"} ${fmtTime(a.ends || a.expires, r.tz, es)}` : ""}</div>`).join("")}</div>`);
          textParts.push((es ? "AVISOS: " : "WARNINGS: ") + alerts.slice(0, 4).map(a => a.event).join(", "));
        }
        const ps = periods.slice(0, 3);
        if (ps.length) {
          parts.push(`<h2 style="font-size:18px;margin:0 0 10px">${es ? "Pronóstico" : "Forecast"} · ${esc(r.name)}</h2>` + ps.map(p =>
            `<div style="padding:12px 0;border-top:1px solid #e4e7ec"><b>${esc(p.name)}</b> · ${p.temperature}°${esc(p.temperatureUnit)}<div style="color:#475467;margin-top:4px">${esc(p.detailedForecast || p.shortForecast)}</div></div>`).join(""));
          textParts.push(ps.map(p => `${p.name}: ${p.temperature}°${p.temperatureUnit}. ${p.detailedForecast || p.shortForecast}`).join("\n"));
        }
      }
      let newest = r.last_news;
      if (r.news && news) {
        const fresh = news.filter(a => Date.parse(a.published) > (r.last_news || now - 36 * 3600000)).slice(0, 3);
        if (fresh.length) {
          newest = Math.max(...fresh.map(a => Date.parse(a.published)));
          parts.push(`<h2 style="font-size:18px;margin:26px 0 10px">${es ? "Noticias del clima" : "Weather news"}</h2>` + fresh.map(a =>
            `<div style="padding:12px 0;border-top:1px solid #e4e7ec"><a href="${esc(a.url)}" style="color:#0e1d38;font-weight:700;text-decoration:none">${esc(a.icon || "")} ${esc(a.title)}</a><div style="color:#475467;margin-top:4px">${esc(a.summary)}</div><div style="color:#98a2b3;font-size:13px;margin-top:4px">${esc(a.source)}</div></div>`).join(""));
          textParts.push(fresh.map(a => `${a.title} (${a.source}) ${a.url}`).join("\n"));
        }
      }
      if (!parts.length) { this.sql.exec("UPDATE emails SET last_day = ? WHERE email = ?", day, r.email); continue; }
      budget--;
      const subject = r.forecast && fcCache.get(r.fc_url) && fcCache.get(r.fc_url)[0]
        ? `${es ? "Hoy en" : "Today in"} ${r.name}: ${fcCache.get(r.fc_url)[0].temperature}°, ${fcCache.get(r.fc_url)[0].shortForecast}`
        : (es ? "Noticias del clima de SkyCast" : "SkyCast weather news");
      const res = await this.sendEmail(r.email, subject.slice(0, 120), emailPage(es ? "Tu clima de hoy" : "Your weather today", parts.join(""), unsub, es),
        textParts.join("\n\n") + `\n\n${es ? "Cancelar" : "Unsubscribe"}: ${unsub}`, unsub);
      if (res.ok) this.sql.exec("UPDATE emails SET last_day = ?, last_news = ?, fails = 0 WHERE email = ?", day, newest || 0, r.email);
      else this.sql.exec("UPDATE emails SET fails = fails + 1 WHERE email = ?", r.email);
    }
  }
}

const emailReady = env => !!(env && env.RESEND_API_KEY);
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function localParts(ms, tz) {
  const p = {};
  try { new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms)).forEach(x => p[x.type] = x.value); }
  catch (e) { return localParts(ms, "America/New_York"); }
  return { day: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
}
const fmtTime = (iso, tz, es) => { try { return new Date(iso).toLocaleString(es ? "es-US" : "en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };
function emailPage(title, body, unsub, es) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#eef3fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0e1d38">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="font-size:22px;font-weight:800;margin-bottom:14px">☀️ Sky<span style="color:#f59e0b">Cast</span></div>
<div style="background:#fff;border-radius:20px;padding:24px 22px;line-height:1.5;font-size:15px">
<h1 style="font-size:22px;margin:0 0 14px">${esc(title)}</h1>${body}</div>
<p style="color:#667085;font-size:12px;text-align:center;margin-top:18px">SkyCast · <a href="https://skycastweather.com" style="color:#667085">skycastweather.com</a> · ${es ? "Datos del Servicio Meteorológico Nacional" : "Forecasts from the National Weather Service"}${unsub ? ` · <a href="${unsub}" style="color:#667085">${es ? "Cancelar correos" : "Unsubscribe"}</a>` : ""}</p>
</div></body></html>`;
}
