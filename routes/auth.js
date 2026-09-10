const express    = require('express');
const bcrypt     = require('bcrypt');
const { getDb }  = require('../db/database');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  const db = getDb();
  const usuario = db.prepare(`
    SELECT u.*, np.nombre AS nivel_nombre, np.margen_pct
    FROM usuarios u
    JOIN niveles_precio np ON u.nivel_precio_id = np.id
    WHERE u.email = ?
  `).get(email);

  if (!usuario || !bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }

  req.session.usuario = {
    id:              usuario.id,
    email:           usuario.email,
    nivel_precio_id: usuario.nivel_precio_id,
    nivel_nombre:    usuario.nivel_nombre,
    margen_pct:      usuario.margen_pct,
    es_admin:        usuario.es_admin === 1,
  };

  res.json({ ok: true, usuario: req.session.usuario });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  res.json({ usuario: req.session.usuario || null });
});

module.exports = router;
