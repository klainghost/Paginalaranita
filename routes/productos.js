const express          = require('express');
const { getDb }        = require('../db/database');
const { calcularPrecio } = require('../lib/precio');

const router = express.Router();

router.get('/:slug/productos', (req, res) => {
  const db = getDb();

  const mundo = db.prepare('SELECT * FROM mundos WHERE slug = ? AND activo = 1').get(req.params.slug);
  if (!mundo) return res.status(404).json({ error: 'Mundo no encontrado.' });

  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  if (!parametros) return res.status(500).json({ error: 'Parámetros de costo no configurados.' });

  // Usa el nivel de precio del usuario si está logueado; si no, busca el nivel "publico"
  let nivel;
  if (req.session.usuario) {
    nivel = { margen_pct: req.session.usuario.margen_pct };
  } else {
    nivel = db.prepare("SELECT * FROM niveles_precio WHERE nombre = 'publico'").get();
    if (!nivel) return res.status(500).json({ error: 'Nivel de precio público no configurado.' });
  }

  const productos = db.prepare(
    'SELECT * FROM productos WHERE mundo_id = ? AND activo = 1 ORDER BY categoria, nombre'
  ).all(mundo.id);

  const resultado = productos.map(p => {
    const precio = calcularPrecio(p, parametros, nivel);
    return {
      id:              p.id,
      nombre:          p.nombre,
      categoria:       p.categoria,
      descripcion:     p.descripcion,
      imagen_url:      p.imagen_url,
      makerworld_url:  p.makerworld_url,
      precio:          precio.precioFinal,
      promo_activa:    precio.promoActiva,
      // Solo expone estos campos si hay promo activa
      promo_descuento_pct: precio.promoActiva ? p.promo_descuento_pct : null,
      precio_sin_promo:    precio.promoActiva ? precio.precioAjustado  : null,
    };
  });

  res.json(resultado);
});

module.exports = router;
