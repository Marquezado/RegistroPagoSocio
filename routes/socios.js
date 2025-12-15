const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('./auth');

const router = express.Router();

router.use(requireAuth); 

router.post('/registrar', async (req, res) => {
  const { dni, nombre, telefono, tipo_socio } = req.body;

  try {
    const [existe] = await db.execute('SELECT id FROM socios WHERE dni = ?', [dni]);
    if (existe.length > 0) {
      return res.json({ success: false, message: 'Ya existe un socio con este DNI' });
    }

    await db.execute(
      'INSERT INTO socios (dni, nombre, telefono, tipo_socio) VALUES (?, ?, ?, ?)',
      [dni, nombre, telefono, tipo_socio || 'Ordinario']
    );

    res.json({ success: true, message: 'Socio registrado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar el socio' });
  }
});

module.exports = router;