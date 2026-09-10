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
      mundo_id            INTEGER NOT NULL REFERENCES mundos(id),
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
  `);
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
