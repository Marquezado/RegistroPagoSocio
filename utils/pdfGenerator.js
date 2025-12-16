const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generarReciboPDF = (pago, socio, detalleAplicado) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `recibo_${pago.recibo_num}_${socio.dni}.pdf`;
    const filepath = path.join(__dirname, '../public/recibos', filename);

    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filepath));

    // Encabezado
    doc.fontSize(22).text('CLUB ATENAS', { align: 'center' });
    doc.fontSize(18).text('RECIBO DE PAGO', { align: 'center' });
    doc.moveDown(2);

    // Datos generales
    doc.fontSize(12);
    doc.text(`Recibo N°: ${pago.recibo_num}`);
    doc.text(`Fecha: ${new Date(pago.fecha_pago).toLocaleDateString('es-PE')}`);
    doc.text(`Socio: ${socio.nombre}`);
    doc.text(`DNI: ${socio.dni}`);
    doc.text(`Método de pago: ${pago.metodo_pago.toUpperCase()}`);
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold')
       .text(`Monto total pagado: S/ ${Number(pago.monto).toFixed(2)}`, { align: 'right' });
    doc.moveDown(2);

    if (detalleAplicado.length > 0) {
      doc.fontSize(14).text('Detalle de aplicación del pago:', { underline: true });
      doc.moveDown();

      let y = doc.y;
      const cols = { factura: 50, concepto: 150, original: 350, aplicado: 460 };

      // Header tabla
      doc.font('Helvetica-Bold');
      doc.text('Factura', cols.factura, y);
      doc.text('Concepto', cols.concepto, y);
      doc.text('Monto original', cols.original, y);
      doc.text('Monto aplicado', cols.aplicado, y, { align: 'right' });
      doc.moveTo(cols.factura, y + 15).lineTo(550, y + 15).stroke();
      y += 30;
      doc.font('Helvetica');

      detalleAplicado.forEach((item, i) => {
        let subtotalAplicado = 0;

        item.conceptos.forEach((c, idx) => {
          const factor = item.total_factura > 0 ? item.monto_aplicado / item.total_factura : 0;
          const montoApli = idx === item.conceptos.length - 1
            ? item.monto_aplicado - subtotalAplicado
            : c.monto_original * factor;

          subtotalAplicado += montoApli;

          doc.text(i === 0 && idx === 0 ? `#${item.factura_id}` : '', cols.factura, y);
          doc.text(c.concepto, cols.concepto, y);
          doc.text(`S/ ${c.monto_original.toFixed(2)}`, cols.original, y);
          doc.text(`S/ ${montoApli.toFixed(2)}`, cols.aplicado, y, { align: 'right' });

          y += 20;
        });

        // Separador entre facturas
        if (i < detalleAplicado.length - 1) {
          doc.moveTo(cols.factura, y - 5).lineTo(550, y - 5).dash(3, { space: 3 }).stroke();
          y += 10;
        }
      });

      // Total final
      doc.moveTo(cols.factura, y).lineTo(550, y).stroke();
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text('TOTAL PAGADO:', cols.original, y + 15);
      doc.text(`S/ ${Number(pago.monto).toFixed(2)}`, cols.aplicado, y + 15, { align: 'right' });

    } else {
      doc.fontSize(16).text('Pago adelantado - No se aplicó a ninguna deuda pendiente', { align: 'center' });
    }

    doc.moveDown(5);
    doc.fontSize(11).text('Gracias por su pago.', { align: 'center' });
    doc.text('Este es un comprobante oficial de pago.', { align: 'center' });

    doc.end();

    doc.on('end', () => resolve(`/recibos/${filename}`));
    doc.on('error', reject);
  });
};

module.exports = { generarReciboPDF };