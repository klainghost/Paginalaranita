'use strict';

const express            = require('express');
const { getDb }          = require('../db/database');
const { calcularPrecio } = require('../lib/precio');

const router = express.Router();

function serializarProducto(p, parametros, nivel) {
  const precio = calcularPrecio(p, parametros, nivel);
  return {
    id:                  p.id,
    nombre:              p.nombre,
    categoria:           p.categoria,
    categoria_id:        p.categoria_id,
    descripcion:         p.descripcion,
    imagen_url:          p.imagen_url,
    imagenes_json:       p.imagenes_json || '[]',
    makerworld_url:      p.makerworld_url,
    tipo:                p.tipo || 'pedido',
    stock:               p.stock || 0,
    stock_minimo:        p.stock_minimo || 1,
    colores_json:        p.colores_json || '[]',
    licencia:            p.licencia || null,
    extras_json:         p.extras_json || '[]',
    destacado:           p.destacado || 0,
    precio:              precio.precioFinal,
    promo_activa:        precio.promoActiva,
    promo_descuento_pct: precio.promoActiva ? p.promo_descuento_pct : null,
    precio_sin_promo:    precio.promoActiva ? precio.precioAjustado  : null,
  };
}

function getNivel(req, db) {
  if (req.session?.usuario) return { margen_pct: req.session.usuario.margen_pct };
  const nivel = db.prepare("SELECT * FROM niveles_precio WHERE nombre = 'publico'").get();
  if (!nivel) throw new Error('Nivel de precio público no configurado.');
  return nivel;
}

router.get('/', (req, res) => {
  const cats = getDb()
    .prepare('SELECT * FROM categorias WHERE activo = 1 ORDER BY orden, nombre')
    .all();
  res.json(cats);
});

// Todos los productos (para el catálogo general con chips)
// "todos" es slug reservado — no crear una categoría con ese slug
router.get('/todos/productos', (req, res) => {
  const db = getDb();
  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  if (!parametros) return res.status(500).json({ error: 'Parámetros de costo no configurados.' });

  let nivel;
  try { nivel = getNivel(req, db); } catch (e) { return res.status(500).json({ error: e.message }); }

  const productos = db
    .prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY destacado DESC, categoria, nombre')
    .all();

  res.json(productos.map(p => serializarProducto(p, parametros, nivel)));
});

router.get('/:slug/productos', (req, res) => {
  const db  = getDb();
  const cat = db.prepare('SELECT * FROM categorias WHERE slug = ? AND activo = 1').get(req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada.' });

  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  if (!parametros) return res.status(500).json({ error: 'Parámetros de costo no configurados.' });

  let nivel;
  try { nivel = getNivel(req, db); } catch (e) { return res.status(500).json({ error: e.message }); }

  const productos = db
    .prepare('SELECT * FROM productos WHERE categoria_id = ? AND activo = 1 ORDER BY destacado DESC, nombre')
    .all(cat.id);

  res.json(productos.map(p => serializarProducto(p, parametros, nivel)));
});

module.exports = router;
