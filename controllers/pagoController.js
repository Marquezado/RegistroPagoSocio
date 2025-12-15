const db = require("../config/db");
const { generarReciboPDF } = require("../utils/pdfGenerator");

const PORCENTAJE_INTERES = 2.0; // 2% mensual

const calcularInteresMora = (fechaVencimiento) => {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffTime = hoy - vencimiento;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) return 0;

  const mesesMora = Math.floor(diffDays / 30);
  return (mesesMora * PORCENTAJE_INTERES) / 100;
};

const consultarEstadoCuenta = async (req, res) => {
  const { dni } = req.params;

  try {
    // 1. Buscar socio
    const [socios] = await db.execute(
      'SELECT id, dni, nombre, telefono, tipo_socio FROM socios WHERE dni = ? AND estado = "activo"',
      [dni]
    );

    if (socios.length === 0) {
      return res.json({
        success: false,
        message: "Socio no encontrado o inactivo",
      });
    }

    const socio = socios[0];

    const [facturas] = await db.execute(
      `
      SELECT id, fecha_emision, fecha_vencimiento, monto_base 
      FROM facturas 
      WHERE socio_id = ? AND estado IN ('pendiente', 'parcial')
      ORDER BY fecha_vencimiento ASC
    `,
      [socio.id]
    );

    let deudaTotal = 0;
    const facturasConDetalle = [];

    for (const factura of facturas) {
      const interesRate = calcularInteresMora(factura.fecha_vencimiento);
      const interesMonto = factura.monto_base * interesRate;

      const [detalles] = await db.execute(
        "SELECT concepto, monto FROM detalle_factura WHERE factura_id = ?",
        [factura.id]
      );

      if (interesMonto > 0) {
        const conceptoInteres = `Interés por mora (${PORCENTAJE_INTERES}% mensual)`;
        const existeInteres = detalles.some((d) =>
          d.concepto.includes("Interés")
        );
        if (!existeInteres) {
          detalles.push({ concepto: conceptoInteres, monto: interesMonto });
        }
      }

      const totalFactura = factura.monto_base + interesMonto;
      deudaTotal += totalFactura;

      facturasConDetalle.push({
        id: factura.id,
        fecha_emision: factura.fecha_emision.toISOString().slice(0, 10),
        fecha_vencimiento: factura.fecha_vencimiento.toISOString().slice(0, 10),
        detalles: detalles.map((d) => ({
          concepto: d.concepto,
          monto: Number(d.monto),
        })),
      });
    }

    res.json({
      success: true,
      socio: {
        id: socio.id,
        dni: socio.dni,
        nombre: socio.nombre,
        telefono: socio.telefono,
        tipo_socio: socio.tipo_socio,
      },
      deuda_total: deudaTotal,
      facturas: facturasConDetalle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

const registrarPago = async (req, res) => {
  const { socio_id, monto, metodo } = req.body;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [socios] = await connection.execute("SELECT * FROM socios WHERE id = ?", [socio_id]);
    if (socios.length === 0) {
      await connection.rollback();
      return res.json({ success: false, message: "Socio no encontrado" });
    }
    const socio = socios[0];

    const [facturasPendientes] = await connection.execute(
      `SELECT SUM(monto_base) as total FROM facturas 
       WHERE socio_id = ? AND estado IN ('pendiente', 'parcial')`,
      [socio_id]
    );
    const deudaActual = Number(facturasPendientes[0].total) || 0;

    const reciboNum = `REC-${Date.now()}`;
    const [pagoResult] = await connection.execute(
      `INSERT INTO pagos (socio_id, monto, metodo_pago, recibo_num, tipo_pago) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        socio_id,
        monto,
        metodo,
        reciboNum,
        deudaActual > 0 ? "normal" : "adelantado",
      ]
    );
    const pagoId = pagoResult.insertId;

    let detalleAplicado = [];

    if (deudaActual > 0 && monto >= deudaActual) {
      const [facturas] = await connection.execute(
        `SELECT id, monto_base FROM facturas 
         WHERE socio_id = ? AND estado IN ('pendiente', 'parcial')
         ORDER BY fecha_vencimiento ASC`,
        [socio_id]
      );

      let restante = monto;
      for (const factura of facturas) {
        if (restante <= 0) break;

        const montoAplicar = Math.min(restante, factura.monto_base);
        await connection.execute(
          "INSERT INTO pago_factura (pago_id, factura_id, monto_aplicado) VALUES (?, ?, ?)",
          [pagoId, factura.id, montoAplicar]
        );
        await connection.execute('UPDATE facturas SET estado = "pagado" WHERE id = ?', [factura.id]);

        detalleAplicado.push({
          factura_id: factura.id,
          monto_aplicado: montoAplicar,
          concepto: "Cuota + intereses",
        });
        restante -= montoAplicar;
      }
    }

    const reciboUrl = await generarReciboPDF(
      { id: pagoId, monto, metodo_pago: metodo, fecha_pago: new Date() },
      socio,
      detalleAplicado
    );

    await connection.commit();

    res.json({
      success: true,
      message:
        monto >= deudaActual && deudaActual > 0
          ? "Pago registrado exitosamente - PAGO COMPLETO"
          : "Pago registrado como adelantado",
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