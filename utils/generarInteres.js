const db = require("../config/db");
const PORCENTAJE_INTERES = 2.0; // 2% mensual

const generarInteresesDelMes = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Buscar facturas vencidas antes de este mes y no pagadas completamente
    const [facturas] = await connection.execute(`
      SELECT f.id, f.monto_base, f.fecha_vencimiento
      FROM facturas f
      WHERE f.estado IN ('pendiente', 'parcial')
        AND f.fecha_vencimiento < ?
    `, [primerDiaMes]);

    for (const factura of facturas) {
      // Calcular meses de mora completos hasta hoy
      const vencimiento = new Date(factura.fecha_vencimiento);
      const mesesMora = Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24 * 30));

      if (mesesMora <= 0) continue;

      const interesMonto = (factura.monto_base * PORCENTAJE_INTERES / 100) * mesesMora;

      if (interesMonto > 0) {
        // Verificar si ya existe interés para este mes (evitar duplicados si se ejecuta dos veces)
        const [existe] = await connection.execute(`
          SELECT id FROM detalle_factura 
          WHERE factura_id = ? AND concepto LIKE 'Interés por mora%'
        `, [factura.id]);

        // Insertar solo si no hay intereses previos (o puedes mejorar para incremental)
        if (existe.length === 0) {
          await connection.execute(`
            INSERT INTO detalle_factura (factura_id, concepto, monto)
            VALUES (?, ?, ?)
          `, [factura.id, `Interés por mora (${PORCENTAJE_INTERES}% x ${mesesMora} meses)`, interesMonto]);
        }
      }
    }

    await connection.commit();
    console.log("Intereses generados correctamente");
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error generando intereses:", error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { generarInteresesDelMes };