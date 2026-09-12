// Suprimir el warning experimental de node:sqlite
process.env.NODE_NO_WARNINGS = '1';

const express       = require('express');
const session       = require('express-session');
const SQLiteStore   = require('connect-sqlite3')(session);
const cors          = require('cors');
const fs            = require('fs');
const path          = require('path');
const crypto        = require('crypto');
const { exec }      = require('child_process');

const authRoutes     = require('./routes/auth');
const mundosRoutes   = require('./routes/mundos');
const productosRoutes = require('./routes/productos');
const adminRoutes    = require('./routes/admin');
const carritoRoutes  = require('./routes/carrito');
const pedidosRoutes  = require('./routes/pedidos');

const app  = express();
const PORT = process.env.PORT || 3001;

function getOrCreateSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretFile = path.join(__dirname, 'data', 'session.secret');
  try {
    return fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    console.log('[session] SESSION_SECRET generado y guardado en data/session.secret');
    return secret;
  }
}

const SESSION_SECRET = getOrCreateSessionSecret();

app.use(cors({
  origin:      process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Webhook de GitHub — va ANTES de express.json() para recibir el body crudo
app.post('/webhook/deploy', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return res.status(500).end();

  const sig      = req.headers['x-hub-signature-256'] || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).end();
  }

  let payload;
  try { payload = JSON.parse(req.body.toString()); } catch { return res.status(400).end(); }

  if (payload.ref !== 'refs/heads/main') {
    return res.status(200).json({ skipped: true });
  }

  res.status(200).json({ ok: true });

  const cmd = 'git pull origin main && pm2 restart ranita3d && pm2 save';
  exec(cmd, { cwd: '/home/usuario/Escritorio/laranita3d' }, (err, stdout) => {
    if (err) console.error('[webhook] deploy error:', err.message);
    else     console.log('[webhook] deploy OK:', stdout.trim());
  });
});

app.use(express.json());

app.use(session({
  store: new SQLiteStore({
    db:  'sessions.db',
    dir: path.join(__dirname, 'data'),
  }),
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',    authRoutes);
app.use('/api/mundos',  mundosRoutes);
app.use('/api/mundos',  productosRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.listen(PORT, () => {
  console.log(`La Ranita 3D backend corriendo en http://localhost:${PORT}`);
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠  SESSION_SECRET tomado de data/session.secret (sin variable de entorno)');
  }
});
