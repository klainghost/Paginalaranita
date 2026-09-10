const express   = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const mundos = getDb().prepare('SELECT * FROM mundos WHERE activo = 1').all();
  res.json(mundos);
});

module.exports = router;
