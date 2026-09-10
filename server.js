// Suprimir el warning experimental de node:sqlite
process.env.NODE_NO_WARNINGS = '1';

const express       = require('express');
const session       = require('express-session');
const SQLiteStore   = require('connect-sqlite3')(session);
const cors          = require('cors');
const path          = require('path');

const authRoutes     = require('./routes/auth');
const mundosRoutes   = require('./routes/mundos');
const productosRoutes = require('./routes/productos');
const adminRoutes    = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin:      process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  store: new SQLiteStore({
    db:  'sessions.db',
    dir: path.join(__dirname, 'data'),
  }),
  secret:            process.env.SESSION_SECRET || 'ranita-dev-secret-cambiar-en-prod',
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

app.listen(PORT, () => {
  console.log(`La Ranita 3D backend corriendo en http://localhost:${PORT}`);
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠  SESSION_SECRET no definida — usar solo en desarrollo');
  }
});
