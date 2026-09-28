'use strict';

const express   = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

// Público — el frontend lo usa para renderizar el navbar
router.get('/nav-links', (req, res) => {
  const links = getDb()
    .prepare('SELECT * FROM nav_links WHERE activo = 1 ORDER BY orden, id')
    .all();
  res.json(links);
});

module.exports = router;
