const express                        = require('express');
const bcrypt                         = require('bcrypt');
const fs                             = require('fs');
const path                           = require('path');
const { getDb, p }                   = require('../db/database');
const { calcularPrecio, DIFICULTADES } = require('../lib/precio');
const { requireAdmin }               = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// --- Productos ---

router.get('/productos', (req, res) => {
  const db         = getDb();
  const parametros = db.prepare('SELECT * FROM parametros_costo WHERE id = 1').get();
  const nivelPub   = db.prepare("SELECT * FROM niveles_precio WHERE nombre = 'publico'").get() || { margen_pct: 0 };

  const productos = db.prepare(`
    SELECT p.*,
           m.nombre AS mundo_nombre,
           c.nombre AS categoria_sistema_nombre
    FROM productos p
    LEFT JOIN mundos m ON p.mundo_id = m.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    ORDER BY COALESCE(m.nombre, c.nombre, ''), p.categoria, p.nombre
  `).all();

  const resultado = productos.map(prod => ({
    ...prod,
    desglose: parametros ? calcularPrecio(prod, parametros, nivelPub) : null,
  }));

  res.json(resultado);
});

router.post('/productos', (req, res) => {
  const { mundo_id, categoria_id, nombre, categoria, descripcion, gramos, horas, minutos, dificultad,
          precio_override, precio_ajuste_pct, promo_descuento_pct, promo_hasta,
          makerworld_url, imagen_url, notas } = req.body || {};

  if (!nombre || gramos == null || !dificultad) {
    return res.status(400).json({ error: 'nombre, gramos y dificultad son requeridos.' });
  }
  if (!mundo_id && !categoria_id) {
    return res.status(400).json({ error: 'Debe especificar mundo (Rol) o categoría.' });
  }
  if (!DIFICULTADES[String(dificultad)]) {
    return res.status(400).json({ error: `Dificultad inválida. Valores válidos: ${Object.keys(DIFICULTADES).join(', ')}` });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO productos
      (mundo_id, categoria_id, nombre, categoria, descripcion, gramos, horas, minutos, dificultad,
       precio_override, precio_ajuste_pct, promo_descuento_pct, promo_hasta,
       makerworld_url, imagen_url, notas)
    VALUES
      (:mundo_id, :categoria_id, :nombre, :categoria, :descripcion, :gramos, :horas, :minutos, :dificultad,
       :precio_override, :precio_ajuste_pct, :promo_descuento_pct, :promo_hasta,
       :makerworld_url, :imagen_url, :notas)
  `).run(p({
    mundo_id:            mundo_id    ? Number(mundo_id)    : null,
    categoria_id:        categoria_id ? Number(categoria_id) : null,
    nombre,
    categoria:           categoria           || null,
    descripcion:         descripcion         || null,
    gramos:              Number(gramos),
    horas:               Number(horas        || 0),
    minutos:             Number(minutos      || 0),
    dificultad:          String(dificultad),
    precio_override:     precio_override     != null ? Number(precio_override)     : null,
    precio_ajuste_pct:   Number(precio_ajuste_pct   || 0),
    promo_descuento_pct: Number(promo_descuento_pct || 0),
    promo_hasta:         promo_hasta         || null,
    makerworld_url:      makerworld_url      || null,
    imagen_url:          imagen_url          || null,
    notas:               notas               || null,
  }));

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

router.put('/productos/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (!db.prepare('SELECT id FROM productos WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }
  if (req.body.dificultad && !DIFICULTADES[String(req.body.dificultad)]) {
    return res.status(400).json({ error: `Dificultad inválida. Válidos: ${Object.keys(DIFICULTADES).join(', ')}` });
  }

  const CAMPOS = ['nombre', 'categoria', 'descripcion', 'gramos', 'horas', 'minutos', 'dificultad',
    'precio_override', 'precio_ajuste_pct', 'promo_descuento_pct', 'promo_hasta',
    'makerworld_url', 'imagen_url', 'notas', 'activo', 'mundo_id', 'categoria_id'];

  const updates = {};
  for (const campo of CAMPOS) {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nada que actualizar.' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = :${k}`).join(', ');
  db.prepare(`UPDATE productos SET ${setClause} WHERE id = :id`).run(p({ ...updates, id }));

  res.json({ ok: true });
});

router.delete('/productos/:id', (req, res) => {
  const result = getDb()
    .prepare('UPDATE productos SET activo = 0 WHERE id = ?')
    .run(parseInt(req.params.id, 10));
  if (result.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ ok: true });
});

// --- Parámetros de costo ---

router.get('/parametros', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM parametros_costo WHERE id = 1').get() || {});
});

router.put('/parametros', (req, res) => {
  const { precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina } = req.body || {};
  if ([precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina].some(v => v == null || isNaN(Number(v)))) {
    return res.status(400).json({ error: 'precio_kg, precio_kwh, consumo_impresora_kw y costo_hora_maquina son requeridos.' });
  }

  getDb().prepare(`
    INSERT INTO parametros_costo (id, precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina)
    VALUES (1, :precio_kg, :precio_kwh, :consumo_impresora_kw, :costo_hora_maquina)
    ON CONFLICT(id) DO UPDATE SET
      precio_kg            = :precio_kg,
      precio_kwh           = :precio_kwh,
      consumo_impresora_kw = :consumo_impresora_kw,
      costo_hora_maquina   = :costo_hora_maquina
  `).run(p({ precio_kg: Number(precio_kg), precio_kwh: Number(precio_kwh),
              consumo_impresora_kw: Number(consumo_impresora_kw), costo_hora_maquina: Number(costo_hora_maquina) }));

  res.json({ ok: true });
});

// --- Mundos ---

router.get('/mundos', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM mundos').all());
});

router.post('/mundos', (req, res) => {
  const { nombre, slug, color_acento, color_fondo, tipografia_display, descripcion } = req.body || {};
  if (!nombre || !slug) return res.status(400).json({ error: 'nombre y slug son requeridos.' });

  try {
    const result = getDb().prepare(`
      INSERT INTO mundos (nombre, slug, color_acento, color_fondo, tipografia_display, descripcion)
      VALUES (:nombre, :slug, :color_acento, :color_fondo, :tipografia_display, :descripcion)
    `).run(p({
      nombre,
      slug:               slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      color_acento:       color_acento       || '#c9a227',
      color_fondo:        color_fondo        || '#1a1a2e',
      tipografia_display: tipografia_display || 'Plus Jakarta Sans',
      descripcion:        descripcion        || null,
    }));
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Slug ya existe.' });
    throw err;
  }
});

router.put('/mundos/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (!db.prepare('SELECT id FROM mundos WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Mundo no encontrado.' });
  }

  const CAMPOS_MUN = ['nombre', 'slug', 'color_acento', 'color_fondo', 'tipografia_display', 'descripcion', 'activo'];
  const updates = {};
  for (const campo of CAMPOS_MUN) {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nada que actualizar.' });

  const setClause = Object.keys(updates).map(k => `${k} = :${k}`).join(', ');
  try {
    db.prepare(`UPDATE mundos SET ${setClause} WHERE id = :id`).run(p({ ...updates, id }));
    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Slug ya existe.' });
    throw err;
  }
});

// --- Categorías ---

router.get('/categorias', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM categorias ORDER BY orden, nombre').all());
});

router.post('/categorias', (req, res) => {
  const { nombre, slug, descripcion, icono, orden } = req.body || {};
  if (!nombre || !slug) return res.status(400).json({ error: 'nombre y slug son requeridos.' });

  try {
    const result = getDb().prepare(`
      INSERT INTO categorias (nombre, slug, descripcion, icono, orden)
      VALUES (:nombre, :slug, :descripcion, :icono, :orden)
    `).run(p({
      nombre,
      slug:        slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      descripcion: descripcion || null,
      icono:       icono       || '📦',
      orden:       Number(orden || 0),
    }));
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Nombre o slug ya existe.' });
    throw err;
  }
});

router.put('/categorias/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (!db.prepare('SELECT id FROM categorias WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }

  const CAMPOS_CAT = ['nombre', 'slug', 'descripcion', 'icono', 'orden', 'activo'];
  const updates = {};
  for (const campo of CAMPOS_CAT) {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nada que actualizar.' });

  const setClause = Object.keys(updates).map(k => `${k} = :${k}`).join(', ');
  try {
    db.prepare(`UPDATE categorias SET ${setClause} WHERE id = :id`).run(p({ ...updates, id }));
    res.json({ ok: true });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Nombre o slug ya existe.' });
    throw err;
  }
});

router.delete('/categorias/:id', (req, res) => {
  const result = getDb()
    .prepare('UPDATE categorias SET activo = 0 WHERE id = ?')
    .run(parseInt(req.params.id, 10));
  if (result.changes === 0) return res.status(404).json({ error: 'Categoría no encontrada.' });
  res.json({ ok: true });
});

// --- Niveles de precio ---

router.get('/niveles', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM niveles_precio').all());
});

router.put('/niveles/:id', (req, res) => {
  const { margen_pct } = req.body || {};
  if (margen_pct == null || isNaN(Number(margen_pct))) {
    return res.status(400).json({ error: 'margen_pct requerido.' });
  }
  const result = getDb()
    .prepare('UPDATE niveles_precio SET margen_pct = ? WHERE id = ?')
    .run(Number(margen_pct), parseInt(req.params.id, 10));
  if (result.changes === 0) return res.status(404).json({ error: 'Nivel no encontrado.' });
  res.json({ ok: true });
});

// --- Usuarios ---

router.get('/usuarios', (req, res) => {
  const usuarios = getDb().prepare(`
    SELECT u.id, u.email, u.nivel_precio_id, u.es_admin, u.creado_en,
           np.nombre AS nivel_nombre, np.margen_pct
    FROM usuarios u
    JOIN niveles_precio np ON u.nivel_precio_id = np.id
    ORDER BY u.creado_en DESC
  `).all();
  res.json(usuarios);
});

router.post('/usuarios', (req, res) => {
  const { email, password, nivel_precio_id } = req.body || {};
  if (!email || !password || !nivel_precio_id) {
    return res.status(400).json({ error: 'email, password y nivel_precio_id son requeridos.' });
  }

  const db = getDb();
  if (!db.prepare('SELECT id FROM niveles_precio WHERE id = ?').get(nivel_precio_id)) {
    return res.status(400).json({ error: 'Nivel de precio inválido.' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO usuarios (email, password_hash, nivel_precio_id) VALUES (?, ?, ?)'
    ).run(email, bcrypt.hashSync(String(password), 10), Number(nivel_precio_id));
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ese email ya está registrado.' });
    }
    throw err;
  }
});

router.put('/usuarios/:id', (req, res) => {
  const db    = getDb();
  const id    = parseInt(req.params.id, 10);
  const { email, password, nivel_precio_id } = req.body || {};

  if (!db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  if (nivel_precio_id != null) {
    if (!db.prepare('SELECT id FROM niveles_precio WHERE id = ?').get(nivel_precio_id)) {
      return res.status(400).json({ error: 'Nivel de precio inválido.' });
    }
    db.prepare('UPDATE usuarios SET nivel_precio_id = ? WHERE id = ?').run(Number(nivel_precio_id), id);
  }
  if (email) {
    try {
      db.prepare('UPDATE usuarios SET email = ? WHERE id = ?').run(email, id);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Ese email ya está registrado.' });
      }
      throw err;
    }
  }
  if (password) {
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
      .run(bcrypt.hashSync(String(password), 10), id);
  }

  res.json({ ok: true });
});

router.delete('/usuarios/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.usuario.id) {
    return res.status(400).json({ error: 'No podés borrar tu propia cuenta.' });
  }
  const result = getDb().prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ ok: true });
});

// --- Pedidos ---

const ESTADOS_PEDIDO = ['pendiente', 'en_proceso', 'enviado', 'cancelado'];

router.get('/pedidos', (req, res) => {
  const db = getDb();
  const pedidos = db.prepare(`
    SELECT p.id, p.codigo, p.total, p.estado, p.creado_en,
           u.email AS usuario_email
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    ORDER BY p.creado_en DESC
    LIMIT 200
  `).all();
  res.json(pedidos);
});

router.get('/pedidos/:codigo', (req, res) => {
  const db = getDb();
  const pedido = db.prepare(`
    SELECT p.*, u.email AS usuario_email
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.codigo = ?
  `).get(req.params.codigo.toUpperCase());

  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });

  pedido.items = JSON.parse(pedido.items_json);
  delete pedido.items_json;
  res.json(pedido);
});

router.patch('/pedidos/:codigo/estado', (req, res) => {
  const { estado, notas } = req.body || {};
  if (!ESTADOS_PEDIDO.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${ESTADOS_PEDIDO.join(', ')}` });
  }
  const db = getDb();
  const updates = notas !== undefined ? 'estado = ?, notas = ?' : 'estado = ?';
  const args    = notas !== undefined
    ? [estado, notas, req.params.codigo.toUpperCase()]
    : [estado, req.params.codigo.toUpperCase()];
  const result = db.prepare(`UPDATE pedidos SET ${updates} WHERE codigo = ?`).run(...args);
  if (result.changes === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
  res.json({ ok: true });
});

// --- Backup ---

router.get('/backup/download', (req, res) => {
  const db         = getDb();
  const date       = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(__dirname, '..', 'data', `backup-tmp-${Date.now()}.db`);

  try {
    // VACUUM INTO genera una copia limpia y consistente aunque el WAL esté activo
    db.exec(`VACUUM INTO '${backupPath}'`);
  } catch (err) {
    return res.status(500).json({ error: 'Error generando backup: ' + err.message });
  }

  res.download(backupPath, `ranita-${date}.db`, (err) => {
    fs.unlink(backupPath, () => {});
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Error enviando backup.' });
    }
  });
});

module.exports = router;
