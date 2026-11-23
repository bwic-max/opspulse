// OpsPulse server: serves the app, stores data in SQLite, enforces roles, and runs photo recognition.
// Zero dependencies. Needs Node 22.13 or newer.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'opspulse.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,sku TEXT DEFAULT '',cat TEXT DEFAULT 'General',cost REAL DEFAULT 0,price REAL DEFAULT 0,stock INTEGER DEFAULT 0,reorder INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sales(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER NOT NULL,pay TEXT,by TEXT,total REAL,void INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sale_items(sale_id INTEGER,pid INTEGER,qty INTEGER,price REAL);
CREATE INDEX IF NOT EXISTS si ON sale_items(sale_id);
CREATE TABLE IF NOT EXISTS log(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER,t TEXT,k TEXT);
CREATE TABLE IF NOT EXISTS sessions(th TEXT PRIMARY KEY,user_id INTEGER,created INTEGER);`);
const q = (sql) => db.prepare(sql);
const tx = (fn) => { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
let ver = 1; const bump = () => ver++;
const money = (n) => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const addLog = (t, k) => q('INSERT INTO log(ts,t,k) VALUES(?,?,?)').run(Date.now(), t, k);
class HttpError extends Error { constructor(s, m, c) { super(m); this.status = s; this.code = c; } }
const bad = (m, s = 400, c) => { throw new HttpError(s, m, c); };

// ---------- auth ----------
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const okPin = (p) => /^\d{4,8}$/.test(String(p));
function makeUser(name, role, pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  return Number(q('INSERT INTO users(name,role,salt,hash) VALUES(?,?,?,?)').run(name, role, salt, hashPin(pin, salt)).lastInsertRowid);
}
function newSession(uid) {
  const token = crypto.randomBytes(32).toString('hex');
  q('INSERT INTO sessions VALUES(?,?,?)').run(sha(token), uid, Date.now());
  return token;
}
const SESSION_MS = 30 * 864e5;
function authed(req) {
  const m = /^Bearer (\w+)$/.exec(req.headers.authorization || '');
  if (!m) bad('Please sign in.', 401, 'auth');
  const s = q('SELECT u.id,u.name,u.role,s.created FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.th=?').get(sha(m[1]));
  if (!s || Date.now() - s.created > SESSION_MS) bad('Please sign in again.', 401, 'auth');
  return { id: s.id, name: s.name, role: s.role };
}
const needAdmin = (u) => { if (u.role !== 'admin') bad('Only admins can do that.', 403, 'forbidden'); };
const fails = new Map(); // brute-force guard: 5 wrong PINs locks that person for 5 minutes
function guard(key) { const f = fails.get(key); if (f && f.n >= 5 && Date.now() < f.until) bad('Too many wrong PINs. Try again in a few minutes.', 429, 'locked'); }
function failed(key) { const f = fails.get(key) || { n: 0 }; f.n++; if (f.n >= 5) { f.until = Date.now() + 300000; } fails.set(key, f); }

// ---------- data shaping ----------
function salesFor(user) {
  const rows = user.role === 'admin'
    ? q('SELECT * FROM sales WHERE ts>? ORDER BY ts DESC LIMIT 5000').all(Date.now() - 120 * 864e5)
    : q('SELECT * FROM sales WHERE by=? AND ts>? ORDER BY ts DESC').all(user.name, Date.now() - 2 * 864e5);
  const it = q('SELECT pid,qty,price FROM sale_items WHERE sale_id=?');
  return rows.map(r => ({ id: r.id, ts: r.ts, pay: r.pay, by: r.by, total: r.total, void: !!r.void, items: it.all(r.id) }));
}
function snapshot(user) {
  let products = q('SELECT * FROM products ORDER BY name').all();
  if (user.role !== 'admin') products = products.map(({ cost, ...p }) => p);
  return {
    v: ver, me: user, products, sales: salesFor(user),
    users: user.role === 'admin' ? q('SELECT id,name,role FROM users ORDER BY id').all() : [],
    log: q('SELECT ts,t,k FROM log ORDER BY id DESC LIMIT 30').all(),
  };
}

// ---------- photo recognition ----------
const scanCount = new Map();
async function scan(user, body) {
  if (!KEY) bad('Photo recognition isn’t set up on the server yet. Ask the owner to add the API key.', 503, 'no_key');
  const k = user.id, now = Date.now(), a = (scanCount.get(k) || []).filter(t => now - t < 36e5);
  if (a.length >= 40) bad('Too many photo scans this hour. Choose the item by hand.', 429, 'rate');
  a.push(now); scanCount.set(k, a);
  const img = String(body.image || '');
  if (!/^[A-Za-z0-9+/=]+$/.test(img) || img.length > 5e6) bad('That photo could not be read.');
  const list = q('SELECT id,name,cat FROM products').all().map(p => `${p.id}: ${p.name} (${p.cat})`).join('\n');
  const prompt = 'You identify inventory items from photos for a small business. Their products:\n' + list +
    '\n\nLook at the photo and reply with only JSON: {"id": <id of the matching product, or null if none fit>, "name": "<short name of the item you see>", "confidence": "high" | "medium" | "low"}.';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 200, messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }, { type: 'text', text: prompt }] }] }),
  });
  if (!r.ok) { console.error('scan failed', r.status, (await r.text()).slice(0, 300)); bad('Photo recognition failed. Choose the item by hand.', 502, 'upstream'); }
  const j = await r.json(), txt = (j.content || []).map(c => c.text || '').join('');
  const m = /\{[\s\S]*\}/.exec(txt); let out = {};
  try { out = JSON.parse(m ? m[0] : '{}'); } catch { }
  const p = out.id ? q('SELECT id FROM products WHERE id=?').get(+out.id) : null;
  return { id: p ? p.id : 0, name: String(out.name || '').slice(0, 80), confidence: out.confidence || 'low' };
}

// ---------- routes ----------
const int = (v, lo, hi, what) => { const n = Math.floor(Number(v)); if (!Number.isFinite(n) || n < lo || n > hi) bad(what + ' is not valid.'); return n; };
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; };
const str = (v, n = 80) => String(v ?? '').trim().slice(0, n);
function csv(rows, cols) { const e = (v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return [cols.join(','), ...rows.map(r => cols.map(c => e(r[c])).join(','))].join('\n'); }

async function route(req, url, body) {
  const m = req.method, p = url.pathname;
  if (m === 'GET' && p === '/api/health') return { ok: true };
  if (m === 'GET' && p === '/api/status') {
    const users = q('SELECT id,name,role FROM users ORDER BY id').all();
    return { setup: users.length === 0, users, scan: !!KEY };
  }
  if (m === 'POST' && p === '/api/setup') {
    if (q('SELECT COUNT(*) c FROM users').get().c) bad('Setup is already done.', 409);
    const name = str(body.name); if (!name) bad('Please enter your name.'); if (!okPin(body.pin)) bad('PIN must be 4 to 8 digits.');
    const id = makeUser(name, 'admin', body.pin); bump();
    return { token: newSession(id), me: { id, name, role: 'admin' } };
  }
  if (m === 'POST' && p === '/api/login') {
    const ip = req.socket.remoteAddress, key = ip + ':' + body.userId; guard(key); guard('u:' + body.userId);
    const u = q('SELECT * FROM users WHERE id=?').get(+body.userId);
    const ok = u && okPin(body.pin) && crypto.timingSafeEqual(Buffer.from(hashPin(body.pin, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
    if (!ok) { failed(key); failed('u:' + body.userId); bad('That PIN doesn’t match. Try again.', 401, 'pin'); }
    fails.delete(key); fails.delete('u:' + body.userId);
    return { token: newSession(u.id), me: { id: u.id, name: u.name, role: u.role } };
  }
  const user = authed(req);
  if (m === 'POST' && p === '/api/logout') { q('DELETE FROM sessions WHERE th=?').run(sha(/\w+$/.exec(req.headers.authorization)[0])); return { ok: true }; }
  if (m === 'GET' && p === '/api/sync') { if (+url.searchParams.get('v') === ver) return { changed: false }; return snapshot(user); }

  if (m === 'POST' && p === '/api/sale') {
    const items = Array.isArray(body.items) ? body.items : []; if (!items.length || items.length > 60) bad('Add at least one item.');
    const pay = ['Cash', 'GCash', 'Maya', 'Card'].includes(body.pay) ? body.pay : 'Cash';
    const r = tx(() => {
      let total = 0; const rows = [];
      for (const it of items) {
        const pr = q('SELECT * FROM products WHERE id=?').get(+it.pid); if (!pr) bad('An item in this sale no longer exists.');
        const qty = int(it.qty, 1, 10000, 'Quantity'); if (qty > pr.stock) bad(`Only ${pr.stock} of ${pr.name} left in stock.`);
        rows.push([pr.id, qty, pr.price]); total += qty * pr.price;
        q('UPDATE products SET stock=stock-? WHERE id=?').run(qty, pr.id);
      }
      const id = Number(q('INSERT INTO sales(ts,pay,by,total) VALUES(?,?,?,?)').run(Date.now(), pay, user.name, total).lastInsertRowid);
      rows.forEach(r => q('INSERT INTO sale_items VALUES(?,?,?,?)').run(id, ...r));
      addLog(`Sale of ${money(total)} (${pay}) by ${user.name}`, 'sale'); return { id, total };
    }); bump(); return r;
  }
  if (m === 'POST' && p === '/api/stock') {
    const pr = q('SELECT * FROM products WHERE id=?').get(+body.pid); if (!pr) bad('Item not found.', 404);
    const set = body.mode === 'set'; if (set) needAdmin(user);
    const qty = int(body.qty, set ? 0 : 1, 1000000, 'Quantity');
    const hasCost = body.cost !== '' && body.cost != null, cost = num(body.cost);
    tx(() => {
      q('UPDATE products SET stock=? WHERE id=?').run(set ? qty : pr.stock + qty, pr.id);
      if (user.role === 'admin' && hasCost) q('UPDATE products SET cost=? WHERE id=?').run(cost, pr.id);
      addLog(`${pr.name}${set ? ' stock set to ' + qty : ' +' + qty + ' (stock in)'}${hasCost && user.role === 'admin' ? ' at ' + money(cost) + ' each' : ''} by ${user.name}`, 'stock');
    }); bump(); return { ok: true };
  }
  if (m === 'POST' && p === '/api/product') {
    needAdmin(user); const name = str(body.name); if (!name) bad('Please add an item name.');
    const f = [name, str(body.sku, 40), str(body.cat, 40) || 'General', num(body.cost), num(body.price), int(body.stock || 0, 0, 1e6, 'Stock'), int(body.reorder || 0, 0, 1e6, 'Reorder point')];
    if (body.id) q('UPDATE products SET name=?,sku=?,cat=?,cost=?,price=?,stock=?,reorder=? WHERE id=?').run(...f, +body.id);
    else { q('INSERT INTO products(name,sku,cat,cost,price,stock,reorder) VALUES(?,?,?,?,?,?,?)').run(...f); addLog('Added new item ' + name, 'stock'); }
    bump(); return { ok: true };
  }
  let mm;
  if (m === 'DELETE' && (mm = /^\/api\/product\/(\d+)$/.exec(p))) { needAdmin(user); q('DELETE FROM products WHERE id=?').run(+mm[1]); bump(); return { ok: true }; }
  if (m === 'POST' && (mm = /^\/api\/void\/(\d+)$/.exec(p))) {
    needAdmin(user); tx(() => {
      const s = q('SELECT * FROM sales WHERE id=?').get(+mm[1]); if (!s) bad('Sale not found.', 404); if (s.void) return;
      q('UPDATE sales SET void=1 WHERE id=?').run(s.id);
      q('SELECT pid,qty FROM sale_items WHERE sale_id=?').all(s.id).forEach(i => q('UPDATE products SET stock=stock+? WHERE id=?').run(i.qty, i.pid));
      addLog(`Sale #${s.id} voided (${money(s.total)})`, 'sale');
    }); bump(); return { ok: true };
  }
  if (m === 'POST' && p === '/api/users') {
    needAdmin(user); const name = str(body.name); if (!name) bad('Please enter a name.'); if (!okPin(body.pin)) bad('PIN must be 4 to 8 digits.');
    makeUser(name, body.role === 'admin' ? 'admin' : 'staff', body.pin); addLog(name + ' added to the team', 'stock'); bump(); return { ok: true };
  }
  if (m === 'DELETE' && (mm = /^\/api\/users\/(\d+)$/.exec(p))) {
    needAdmin(user); const id = +mm[1]; if (id === user.id) bad('You can’t remove yourself.');
    q('DELETE FROM users WHERE id=?').run(id); q('DELETE FROM sessions WHERE user_id=?').run(id); bump(); return { ok: true };
  }
  if (m === 'POST' && p === '/api/me/pin') {
    if (!okPin(body.pin)) bad('PIN must be 4 to 8 digits.'); const salt = crypto.randomBytes(16).toString('hex');
    q('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt, hashPin(body.pin, salt), user.id); return { ok: true };
  }
  if (m === 'POST' && p === '/api/import') {
    needAdmin(user); if (q('SELECT COUNT(*) c FROM products').get().c || q('SELECT COUNT(*) c FROM sales').get().c) bad('Clear existing data first.', 409);
    tx(() => {
      for (const x of (body.products || []).slice(0, 500)) q('INSERT INTO products(id,name,sku,cat,cost,price,stock,reorder) VALUES(?,?,?,?,?,?,?,?)').run(+x.id, str(x.name), str(x.sku, 40), str(x.cat, 40), num(x.cost), num(x.price), int(x.stock, 0, 1e6, 'Stock'), int(x.reorder, 0, 1e6, 'Reorder'));
      for (const s of (body.sales || []).slice(0, 2000)) { q('INSERT INTO sales(id,ts,pay,by,total) VALUES(?,?,?,?,?)').run(+s.id, +s.ts, str(s.pay, 20), str(s.by, 40), num(s.total)); for (const i of s.items || []) q('INSERT INTO sale_items VALUES(?,?,?,?)').run(+s.id, +i.pid, +i.qty, num(i.price)); }
      addLog('Sample items and sales loaded', 'stock');
    }); bump(); return { ok: true };
  }
  if (m === 'POST' && p === '/api/clear') {
    needAdmin(user); tx(() => { ['sales', 'sale_items', 'products', 'log'].forEach(t => db.exec('DELETE FROM ' + t)); addLog('All items and sales cleared', 'stock'); }); bump(); return { ok: true };
  }
  if (m === 'POST' && p === '/api/scan') return scan(user, body);
  if (m === 'GET' && p === '/api/export/sales.csv') {
    needAdmin(user); const rows = q(`SELECT s.id,datetime(s.ts/1000,'unixepoch','localtime') AS date,s.pay,s.by,s.total,s.void FROM sales s ORDER BY s.ts DESC`).all(); return { csv: csv(rows, ['id', 'date', 'pay', 'by', 'total', 'void']), name: 'sales.csv' };
  }
  if (m === 'GET' && p === '/api/export/items.csv') {
    needAdmin(user); return { csv: csv(q('SELECT * FROM products ORDER BY name').all(), ['id', 'name', 'sku', 'cat', 'cost', 'price', 'stock', 'reorder']), name: 'items.csv' };
  }
  bad('Not found.', 404);
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const PUB = path.join(__dirname, 'public');
function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', ...headers }); res.end(data);
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) {
    let f = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUB, 'index.html');
    return send(res, 200, fs.readFileSync(f), { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': f.endsWith('sw.js') || f.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
  }
  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > 7e6) req.destroy(); else chunks.push(c); });
  req.on('end', async () => {
    try {
      let body = {}; if (chunks.length) { try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { bad('Invalid request.'); } }
      const out = await route(req, url, body);
      if (out && out.csv !== undefined) return send(res, 200, out.csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${out.name}"`, 'Cache-Control': 'no-store' });
      send(res, 200, JSON.stringify(out), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      send(res, e.status || 500, JSON.stringify({ error: e.status ? e.message : 'Something went wrong on the server.', code: e.code }), { 'Content-Type': 'application/json' });
    }
  });
}).listen(PORT, () => console.log(`OpsPulse running on port ${PORT}. Photo scan: ${KEY ? 'on' : 'off (no ANTHROPIC_API_KEY)'}`));
setInterval(() => q('DELETE FROM sessions WHERE created<?').run(Date.now() - SESSION_MS), 36e5).unref();
