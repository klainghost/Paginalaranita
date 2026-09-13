'use strict';

const express            = require('express');
const { getDb }          = require('../db/database');
const { calcularPrecio } = require('../lib/precio');

const router = express.Router();

router.get('/', (req, res) => {
  const cats = getDb()
    .prepare('SELECT * FROM categorias WHERE activo = 1 ORDER BY orden, nombre')
    .all();
  res.json(cats);
});

router.get('/:slug/productos', (req, res) => {
  const db  = getDb();
  const cat = db.prepare('SELECT * FROM categorias WHERE slug = ? AND activo = 1').get(req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada.' });

  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  if (!parametros) return res.status(500).json({ error: 'Parámetros de costo no configurados.' });

  let nivel;
  if (req.session.usuario) {
    nivel = { margen_pct: req.session.usuario.margen_pct };
  } else {
    nivel = db.prepare("SELECT * FROM niveles_precio WHERE nombre = 'publico'").get();
    if (!nivel) return res.status(500).json({ error: 'Nivel de precio público no configurado.' });
  }

  const productos = db
    .prepare('SELECT * FROM productos WHERE categoria_id = ? AND activo = 1 ORDER BY categoria, nombre')
    .all(cat.id);

  const resultado = productos.map(p => {
    const precio = calcularPrecio(p, parametros, nivel);
    return {
      id:                  p.id,
      nombre:              p.nombre,
      categoria:           p.categoria,
      descripcion:         p.descripcion,
      imagen_url:          p.imagen_url,
      makerworld_url:      p.makerworld_url,
      precio:              precio.precioFinal,
      promo_activa:        precio.promoActiva,
      promo_descuento_pct: precio.promoActiva ? p.promo_descuento_pct : null,
      precio_sin_promo:    precio.promoActiva ? precio.precioAjustado  : null,
    };
  });

  res.json(resultado);
});

module.exports = router;
