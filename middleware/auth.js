function requireAuth(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'Sesión requerida.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.usuario || !req.session.usuario.es_admin) {
    return res.status(403).json({ error: 'Acceso solo para administradores.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
