const db = require("../config/db");
const { generarReciboPDF } = require("../utils/pdfGenerator");

const consultarEstadoCuenta = async (req, res) => {
  const { dni } = req.params;

  try {
    const [socios] = await db.execute(
      'SELECT id, dni, nombre, telefono, tipo_socio FROM socios WHERE dni = ? AND estado = "activo"',
      [dni]
    );

    if (socios.length === 0) {
      return res.json({ success: false, message: "Socio no encontrado o inactivo" });
    }

    const socio = socios[0];

    // Facturas no pagadas completamente
    const [facturas] = await db.execute(`
      SELECT id, fecha_emision, fecha_vencimiento
      FROM facturas 
      WHERE socio_id = ? AND estado IN ('pendiente', 'parcial')
      ORDER BY fecha_vencimiento ASC
    `, [socio.id]);

    let deudaTotal = 0;
    const facturasConDetalle = [];

    for (const factura of facturas) {
      const [detalles] = await db.execute(`
        SELECT concepto, monto 
        FROM detalle_factura 
        WHERE factura_id = ?
      `, [factura.id]);

      const totalFactura = detalles.reduce((sum, d) => sum + Number(d.monto), 0);
      deudaTotal += totalFactura;

      facturasConDetalle.push({
        id: factura.id,
        fecha_emision: factura.fecha_emision.toISOString().slice(0, 10),
        fecha_vencimiento: factura.fecha_vencimiento.toISOString().slice(0, 10),
        detalles: detalles.map(d => ({
          concepto: d.concepto,
          monto: Number(d.monto)
        })),
        total: totalFactura
      });
    }

    res.json({
      success: true,
      socio: {
        id: socio.id,
        dni: socio.dni,
        nombre: socio.nombre,
        telefono: socio.telefono || null,
        tipo_socio: socio.tipo_socio,
      },
      deuda_total: parseFloat(deudaTotal.toFixed(2)),
      facturas: facturasConDetalle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

const registrarPago = async (req, res) => {
  const { socio_id, monto, metodo } = req.body;

  if (!monto || monto <= 0) {
    return res.json({ success: false, message: "Monto inválido" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Verificar socio
    const [socios] = await connection.execute("SELECT id, nombre, dni FROM socios WHERE id = ?", [socio_id]);
    if (socios.length === 0) {
      await connection.rollback();
      return res.json({ success: false, message: "Socio no encontrado" });
    }
    const socio = socios[0];

    // Calcular deuda actual real (base + intereses persistidos)
    const [deudaRes] = await connection.execute(`
      SELECT COALESCE(SUM(df.monto), 0) as total
      FROM facturas f
      JOIN detalle_factura df ON f.id = df.factura_id
      WHERE f.socio_id = ? AND f.estado IN ('pendiente', 'parcial')
    `, [socio_id]);
    const deudaActual = Number(deudaRes[0].total) || 0;

    // Insertar pago
    const reciboNum = `REC-${Date.now()}`;
    const tipoPago = deudaActual > 0 ? "normal" : "adelantado";

    const [pagoResult] = await connection.execute(`
      INSERT INTO pagos (socio_id, monto, metodo_pago, recibo_num, tipo_pago)
      VALUES (?, ?, ?, ?, ?)
    `, [socio_id, monto, metodo, reciboNum, tipoPago]);

    const pagoId = pagoResult.insertId;
    let restante = monto;
    let detalleAplicado = [];

    if (deudaActual > 0 && restante > 0) {
      // Obtener facturas ordenadas por vencimiento (FIFO)
      const [facturas] = await connection.execute(`
        SELECT f.id
        FROM facturas f
        WHERE f.socio_id = ? AND f.estado IN ('pendiente', 'parcial')
        ORDER BY f.fecha_vencimiento ASC
      `, [socio_id]);

      for (const factura of facturas) {
        if (restante <= 0) break;

        // Obtener todos los conceptos de esta factura (cuota + intereses, etc.)
        const [conceptosFactura] = await connection.execute(`
          SELECT concepto, monto 
          FROM detalle_factura 
          WHERE factura_id = ? 
          ORDER BY id ASC
        `, [factura.id]);

        const totalFactura = conceptosFactura.reduce((sum, c) => sum + Number(c.monto), 0);

        if (totalFactura <= 0) continue;

        const montoAplicar = Math.min(restante, totalFactura);

        // Registrar la aplicación del pago
        await connection.execute(`
          INSERT INTO pago_factura (pago_id, factura_id, monto_aplicado)
          VALUES (?, ?, ?)
        `, [pagoId, factura.id, montoAplicar]);

        // Guardar detalle enriquecido para el PDF
        detalleAplicado.push({
          factura_id: factura.id,
          monto_aplicado: montoAplicar,
          total_factura: totalFactura,
          conceptos: conceptosFactura.map(c => ({
            concepto: c.concepto,
            monto_original: Number(c.monto)
          }))
        });

        restante -= montoAplicar;

        // Recalcular saldo real de la factura
        const [saldoRes] = await connection.execute(`
          SELECT 
            (SELECT COALESCE(SUM(monto),0) FROM detalle_factura WHERE factura_id = ?) -
            (SELECT COALESCE(SUM(monto_aplicado),0) FROM pago_factura WHERE factura_id = ?)
            AS saldo
        `, [factura.id, factura.id]);

        const saldo = Number(saldoRes[0].saldo);

        let nuevoEstado = 'pagado';
        if (saldo > 0.01) nuevoEstado = 'parcial';

        await connection.execute(`UPDATE facturas SET estado = ? WHERE id = ?`, [nuevoEstado, factura.id]);
      }
    }

    // Generar recibo PDF con detalle completo (incluye intereses)
    const reciboUrl = await generarReciboPDF(
      { 
        id: pagoId, 
        monto, 
        metodo_pago: metodo, 
        fecha_pago: new Date(), 
        recibo_num: reciboNum 
      },
      socio,
      detalleAplicado
    );

    await connection.commit();

    res.json({
      success: true,
      message: restante <= 0 && deudaActual > 0
        ? "Pago completo registrado exitosamente"
        : deudaActual === 0
        ? "Pago adelantado registrado"
        : "Pago parcial registrado",
      recibo_url: reciboUrl,
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al procesar pago:", error);
    res.status(500).json({ success: false, message: "Error al procesar el pago" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { consultarEstadoCuenta, registrarPago };