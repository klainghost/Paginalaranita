'use strict';

const express = require('express');
const router  = express.Router();
const { getDb, p } = require('../db/database');

// Caracteres sin ambigüedad visual (sin 0/O, 1/I)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generarCodigo() {
  let code = 'RAN-';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function codigoUnico(db) {
  let codigo, attempts = 0;
  do {
    codigo = generarCodigo();
    attempts++;
    if (attempts > 20) throw new Error('No se pudo generar código único');
  } while (db.prepare('SELECT 1 FROM pedidos WHERE codigo = :c').get(p({ c: codigo })));
  return codigo;
}

// POST /api/pedidos — público, crea el snapshot del carrito y devuelve el código
router.post('/', (req, res) => {
  const { items, total, usuario_id } = req.body;

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }
  if (typeof total !== 'number' || total <= 0) {
    return res.status(400).json({ error: 'Total inválido' });
  }

  const db = getDb();
  let codigo;
  try {
    codigo = codigoUnico(db);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  db.prepare(`
    INSERT INTO pedidos (codigo, usuario_id, items_json, total)
    VALUES (:codigo, :usuario_id, :items_json, :total)
  `).run(p({
    codigo,
    usuario_id: usuario_id || null,
    items_json: JSON.stringify(items),
    total,
  }));

  res.json({ ok: true, codigo });
});

module.exports = router;
