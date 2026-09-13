const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'ranita.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema();
    runMigrations();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mundos (
      id                 INTEGER PRIMARY KEY,
      nombre             TEXT    NOT NULL,
      slug               TEXT    UNIQUE NOT NULL,
      color_acento       TEXT,
      color_fondo        TEXT,
      tipografia_display TEXT,
      descripcion        TEXT,
      activo             INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id          INTEGER PRIMARY KEY,
      nombre      TEXT    NOT NULL UNIQUE,
      slug        TEXT    NOT NULL UNIQUE,
      descripcion TEXT,
      icono       TEXT    DEFAULT '📦',
      orden       INTEGER NOT NULL DEFAULT 0,
      activo      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS niveles_precio (
      id         INTEGER PRIMARY KEY,
      nombre     TEXT    NOT NULL UNIQUE,
      margen_pct REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id               INTEGER PRIMARY KEY,
      email            TEXT    UNIQUE NOT NULL,
      password_hash    TEXT    NOT NULL,
      nivel_precio_id  INTEGER NOT NULL REFERENCES niveles_precio(id),
      es_admin         INTEGER NOT NULL DEFAULT 0,
      creado_en        TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parametros_costo (
      id                   INTEGER PRIMARY KEY CHECK (id = 1),
      precio_kg            REAL    NOT NULL DEFAULT 0,
      precio_kwh           REAL    NOT NULL DEFAULT 0,
      consumo_impresora_kw REAL    NOT NULL DEFAULT 0,
      costo_hora_maquina   REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS productos (
      id                  INTEGER PRIMARY KEY,
      mundo_id            INTEGER REFERENCES mundos(id),
      categoria_id        INTEGER REFERENCES categorias(id),
      nombre              TEXT    NOT NULL,
      categoria           TEXT,
      descripcion         TEXT,
      gramos              REAL    NOT NULL,
      horas               REAL    NOT NULL DEFAULT 0,
      minutos             REAL    NOT NULL DEFAULT 0,
      dificultad          TEXT    NOT NULL DEFAULT '2.5',
      precio_override     REAL,
      precio_ajuste_pct   REAL    NOT NULL DEFAULT 0,
      promo_descuento_pct REAL    NOT NULL DEFAULT 0,
      promo_hasta         TEXT,
      makerworld_url      TEXT,
      imagen_url          TEXT,
      notas               TEXT,
      activo              INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS carrito_items (
      usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
      producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
      cantidad    INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
      agregado_en TEXT    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (usuario_id, producto_id)
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id          INTEGER PRIMARY KEY,
      codigo      TEXT    UNIQUE NOT NULL,
      usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      items_json  TEXT    NOT NULL,
      total       REAL    NOT NULL,
      estado      TEXT    NOT NULL DEFAULT 'pendiente',
      notas       TEXT,
      creado_en   TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Migraciones para bases de datos existentes
function runMigrations() {
  const cols = db.prepare('PRAGMA table_info(productos)').all().map(c => c.name);

  // v2: categorias + nullable mundo_id + categoria_id en productos
  if (!cols.includes('categoria_id')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id          INTEGER PRIMARY KEY,
        nombre      TEXT    NOT NULL UNIQUE,
        slug        TEXT    NOT NULL UNIQUE,
        descripcion TEXT,
        icono       TEXT    DEFAULT '📦',
        orden       INTEGER NOT NULL DEFAULT 0,
        activo      INTEGER NOT NULL DEFAULT 1
      );
    `);

    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`
      BEGIN;
      CREATE TABLE productos_new (
        id                  INTEGER PRIMARY KEY,
        mundo_id            INTEGER REFERENCES mundos(id),
        categoria_id        INTEGER REFERENCES categorias(id),
        nombre              TEXT    NOT NULL,
        categoria           TEXT,
        descripcion         TEXT,
        gramos              REAL    NOT NULL,
        horas               REAL    NOT NULL DEFAULT 0,
        minutos             REAL    NOT NULL DEFAULT 0,
        dificultad          TEXT    NOT NULL DEFAULT '2.5',
        precio_override     REAL,
        precio_ajuste_pct   REAL    NOT NULL DEFAULT 0,
        promo_descuento_pct REAL    NOT NULL DEFAULT 0,
        promo_hasta         TEXT,
        makerworld_url      TEXT,
        imagen_url          TEXT,
        notas               TEXT,
        activo              INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO productos_new
        SELECT id, mundo_id, NULL AS categoria_id, nombre, categoria, descripcion,
               gramos, horas, minutos, dificultad, precio_override, precio_ajuste_pct,
               promo_descuento_pct, promo_hasta, makerworld_url, imagen_url, notas, activo
        FROM productos;
      DROP TABLE productos;
      ALTER TABLE productos_new RENAME TO productos;
      COMMIT;
    `);
    db.exec('PRAGMA foreign_keys = ON');
  }
}

// node:sqlite exige que las claves del objeto de parámetros nombrados
// incluyan el prefijo del SQL (:, @ o $). Este helper agrega ':' si falta.
function p(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k[0] === ':' || k[0] === '@' || k[0] === '$' ? k : `:${k}`] = v;
  }
  return out;
}

module.exports = { getDb, p };
