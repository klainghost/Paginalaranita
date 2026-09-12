const express          = require('express');
const { getDb, p }     = require('../db/database');
const { calcularPrecio } = require('../lib/precio');
const { requireAuth }  = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/carrito — items con precio recalculado según el nivel del usuario
router.get('/', (req, res) => {
  const db         = getDb();
  const uid        = req.session.usuario.id;
  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  const nivel      = req.session.usuario; // tiene margen_pct

  const rows = db.prepare(`
    SELECT ci.cantidad, pr.*
    FROM carrito_items ci
    JOIN productos pr ON ci.producto_id = pr.id
    WHERE ci.usuario_id = ? AND pr.activo = 1
    ORDER BY ci.agregado_en ASC
  `).all(uid);

  const items = rows.map(row => {
    const desglose = parametros ? calcularPrecio(row, parametros, nivel) : null;
    return {
      producto_id:     row.id,
      nombre:          row.nombre,
      imagen_url:      row.imagen_url,
      categoria:       row.categoria,
      cantidad:        row.cantidad,
      precio_unitario: desglose ? desglose.precioFinal : 0,
    };
  });

  res.json(items);
});

// POST /api/carrito/items — agregar o actualizar cantidad
router.post('/items', (req, res) => {
  const { producto_id, cantidad = 1 } = req.body || {};
  const uid = req.session.usuario.id;
  const db  = getDb();

  if (!producto_id || isNaN(Number(cantidad)) || Number(cantidad) < 1) {
    return res.status(400).json({ error: 'producto_id y cantidad (≥1) son requeridos.' });
  }
  if (!db.prepare('SELECT id FROM productos WHERE id = ? AND activo = 1').get(Number(producto_id))) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  db.prepare(`
    INSERT INTO carrito_items (usuario_id, producto_id, cantidad)
    VALUES (?, ?, ?)
    ON CONFLICT(usuario_id, producto_id) DO UPDATE SET cantidad = excluded.cantidad
  `).run(uid, Number(producto_id), Number(cantidad));

  res.json({ ok: true });
});

// DELETE /api/carrito/items/:producto_id — quitar un ítem
router.delete('/items/:producto_id', (req, res) => {
  const uid = req.session.usuario.id;
  const pid = parseInt(req.params.producto_id, 10);
  getDb().prepare('DELETE FROM carrito_items WHERE usuario_id = ? AND producto_id = ?').run(uid, pid);
  res.json({ ok: true });
});

// DELETE /api/carrito — vaciar todo
router.delete('/', (req, res) => {
  getDb().prepare('DELETE FROM carrito_items WHERE usuario_id = ?').run(req.session.usuario.id);
  res.json({ ok: true });
});

module.exports = router;
