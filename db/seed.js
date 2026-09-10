const bcrypt      = require('bcrypt');
const { getDb, p } = require('./database');

const db = getDb();

// --- Mundos ---
const insertMundo = db.prepare(`
  INSERT OR IGNORE INTO mundos (nombre, slug, color_acento, color_fondo, tipografia_display, descripcion)
  VALUES (:nombre, :slug, :color_acento, :color_fondo, :tipografia_display, :descripcion)
`);
for (const m of [
  { nombre: 'Rol y Miniaturas',     slug: 'rol',     color_acento: '#c9a227', color_fondo: '#1a2e1a', tipografia_display: 'Cinzel',            descripcion: 'Miniaturas, escenografía y dados para juegos de rol' },
  { nombre: 'Oficina y Funcional',  slug: 'oficina', color_acento: '#84cc16', color_fondo: '#f8fafc', tipografia_display: 'Plus Jakarta Sans',  descripcion: 'Organizadores, soportes y piezas funcionales para el escritorio' },
  { nombre: 'Regalos y Decoración', slug: 'regalos', color_acento: '#d97706', color_fondo: '#fdf2f8', tipografia_display: 'Playfair Display',   descripcion: 'Piezas decorativas y regalos personalizados' },
]) insertMundo.run(p(m));

// --- Niveles de precio ---
// ⚠ Ajustar margen_pct a los valores reales del negocio antes de usar en producción.
const insertNivel = db.prepare(`INSERT OR IGNORE INTO niveles_precio (nombre, margen_pct) VALUES (?, ?)`);
for (const [nombre, margen_pct] of [['publico', 100], ['revendedor', 50], ['mayorista', 25]]) {
  insertNivel.run(nombre, margen_pct);
}

// --- Parámetros de costo (placeholder — configurar antes de usar) ---
db.prepare(`
  INSERT OR IGNORE INTO parametros_costo (id, precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina)
  VALUES (1, 0, 0, 0, 0)
`).run();

// --- Usuario admin ---
const nivelPublico = db.prepare("SELECT id FROM niveles_precio WHERE nombre = 'publico'").get();
db.prepare(`
  INSERT OR IGNORE INTO usuarios (email, password_hash, nivel_precio_id, es_admin)
  VALUES (?, ?, ?, 1)
`).run('admin@laranita3d.com', bcrypt.hashSync('cambiar-esta-clave', 10), nivelPublico.id);

console.log('✓ Seed completado.');
console.log('');
console.log('⚠  ANTES DE USAR EN PRODUCCIÓN:');
console.log('   1. Cambiá la contraseña del admin (actualmente: cambiar-esta-clave)');
console.log('   2. Configurá los parámetros de costo: PUT /api/admin/parametros');
console.log('      { precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina }');
console.log('   3. Revisá los márgenes por nivel: PUT /api/admin/niveles/:id  { margen_pct }');
