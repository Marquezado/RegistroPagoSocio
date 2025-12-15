const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generarReciboPDF = (pago, socio, detalleAplicado) => {
  return new Promise((resolve, reject) => {
    const reciboNum = `REC-${pago.id}-${new Date().getFullYear()}`;
    const fileName = `${reciboNum}.pdf`;
    const filePath = path.join(__dirname, '../public/recibos/', fileName);

    if (!fs.existsSync(path.join(__dirname, '../public/recibos'))) {
      fs.mkdirSync(path.join(__dirname, '../public/recibos'), { recursive: true });
    }

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('CLUB ATENAS', { align: 'center' });
    doc.fontSize(16).text('Recibo de Pago', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Recibo N°: ${reciboNum}`);
    doc.text(`Fecha: ${new Date(pago.fecha_pago).toLocaleDateString('es-PE')}`);
    doc.text(`Socio: ${socio.nombre} (DNI: ${socio.dni})`);
    doc.text(`Monto pagado: S/ ${parseFloat(pago.monto).toFixed(2)}`);
    doc.text(`Método: ${pago.metodo_pago}`);
    doc.moveDown();

    if (detalleAplicado.length > 0) {
      doc.text('Aplicado a:');
      detalleAplicado.forEach(d => {
        doc.text(`- Factura ${d.factura_id}: S/ ${d.monto_aplicado.toFixed(2)} (${d.concepto || 'Cuota/Interés'})`);
      });
    } else {
      doc.text('Pago adelantado - Saldo a favor');
    }

    doc.moveDown(2);
    doc.fontSize(10).text('Gracias por su pago', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      resolve(`/recibos/${fileName}`);
    });

    stream.on('error', reject);
  });
};

module.exports = { generarReciboPDF };