require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();

const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '').trim(); // ej: https://tuapp.vercel.app

if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('Falta JWT_SECRET');
  process.exit(1);
}

const pool = mysql.createPool(DATABASE_URL);

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(
  cors({
    origin(origin, cb) {
      // Permite server-to-server y llamadas sin Origin (curl/postman)
      if (!origin) return cb(null, true);
      if (!FRONTEND_ORIGIN) return cb(null, true); // si no se setea, no bloqueamos (útil en dev)
      if (origin === FRONTEND_ORIGIN) return cb(null, true);
      return cb(new Error('CORS: Origin no permitido: ' + origin));
    },
    credentials: true,
  })
);

function cookieOptions(req) {
  const isHttps = req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https');
  const sameSite = FRONTEND_ORIGIN ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure: Boolean(FRONTEND_ORIGIN) ? true : isHttps,
    sameSite,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

async function authRequired(req, res, next) {
  try {
    const token = req.cookies.hc_token;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: Number(payload.sub), username: payload.username };
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }
}

async function queryOne(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

// Health
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'DB no disponible' });
  }
});

// ── AUTH ───────────────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Contraseña demasiado corta' });

  const u = String(username).trim();
  const e = String(email).trim().toLowerCase();

  try {
    const existsUser = await queryOne('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [u, e]);
    if (existsUser) return res.status(409).json({ error: 'Usuario o email ya existe' });

    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [u, e, hash]
    );
    const user = { id: result.insertId, username: u, email: e };
    const token = signToken(user);
    res.cookie('hc_token', token, cookieOptions(req));
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

  const e = String(email).trim().toLowerCase();
  try {
    const user = await queryOne('SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1', [e]);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(user);
    res.cookie('hc_token', token, cookieOptions(req));
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (_) {
    res.status(500).json({ error: 'Error iniciando sesión' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('hc_token', { path: '/' });
  res.json({ ok: true });
});

app.get('/auth/me', authRequired, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, email FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!user) return res.status(401).json({ error: 'No autenticado' });
    res.json({ user });
  } catch (_) {
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

// ── FAVORITES ──────────────────────────────────────────────────
app.get('/favorites', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT cocktail_id, cocktail_name, thumb_url, added_at FROM favorites WHERE user_id = ? ORDER BY added_at DESC',
      [req.user.id]
    );
    res.json({ favorites: rows });
  } catch (_) {
    res.status(500).json({ error: 'Error obteniendo favoritos' });
  }
});

app.post('/favorites', authRequired, async (req, res) => {
  const { cocktail_id, cocktail_name, thumb_url } = req.body || {};
  if (!cocktail_id || !cocktail_name) return res.status(400).json({ error: 'Faltan campos' });

  const cid = String(cocktail_id);
  const cname = String(cocktail_name);
  const turl = thumb_url ? String(thumb_url) : null;

  try {
    await pool.query(
      'INSERT INTO favorites (user_id, cocktail_id, cocktail_name, thumb_url) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE cocktail_name = VALUES(cocktail_name), thumb_url = VALUES(thumb_url)',
      [req.user.id, cid, cname, turl]
    );
    res.json({ ok: true });
  } catch (_) {
    res.status(500).json({ error: 'Error guardando favorito' });
  }
});

app.delete('/favorites/:cocktailId', authRequired, async (req, res) => {
  const cid = String(req.params.cocktailId || '');
  if (!cid) return res.status(400).json({ error: 'ID inválido' });
  try {
    await pool.query('DELETE FROM favorites WHERE user_id = ? AND cocktail_id = ?', [req.user.id, cid]);
    res.json({ ok: true });
  } catch (_) {
    res.status(500).json({ error: 'Error eliminando favorito' });
  }
});

app.get('/favorites/check/:cocktailId', authRequired, async (req, res) => {
  const cid = String(req.params.cocktailId || '');
  if (!cid) return res.status(400).json({ error: 'ID inválido' });
  try {
    const row = await queryOne(
      'SELECT 1 AS ok FROM favorites WHERE user_id = ? AND cocktail_id = ? LIMIT 1',
      [req.user.id, cid]
    );
    res.json({ favorite: Boolean(row) });
  } catch (_) {
    res.status(500).json({ error: 'Error comprobando favorito' });
  }
});

app.use((err, _req, res, _next) => {
  if (String(err && err.message || '').startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => {
  console.log('Backend escuchando en puerto', PORT);
});

