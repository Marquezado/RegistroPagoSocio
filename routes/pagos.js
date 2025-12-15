const express = require('express');
const { consultarEstadoCuenta, registrarPago } = require('../controllers/pagoController');
const { requireAuth } = require('./auth');

const router = express.Router();

router.use(requireAuth);

router.get('/estado-cuenta/:dni', consultarEstadoCuenta);
router.post('/registrar', registrarPago);

module.exports = router;