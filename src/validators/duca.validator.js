// src/validators/duca.validator.js
function isStr(x) { return typeof x === 'string' && x.trim().length > 0; }
function isDateYYYYMMDD(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function isLen(s, max) { return isStr(s) && s.length <= max; }
function isNum(n) { return typeof n === 'number' && Number.isFinite(n); }
function isInt(n) { return Number.isInteger(n); }

export function validateDUCA(payload) {
  const errors = [];
  const root = payload?.duca;
  if (!root) errors.push('Falta objeto raíz "duca".');

  if (root) {
    // Obligatorios de cabecera
    if (!isStr(root.numeroDocumento) || !isLen(root.numeroDocumento, 20)) errors.push('numeroDocumento inválido (<=20).');
    if (!isStr(root.fechaEmision) || !isDateYYYYMMDD(root.fechaEmision)) errors.push('fechaEmision inválida (YYYY-MM-DD).');
    if (!isStr(root.paisEmisor) || root.paisEmisor.length !== 2) errors.push('paisEmisor inválido (2).');
    if (!isStr(root.tipoOperacion) || !isLen(root.tipoOperacion, 20)) errors.push('tipoOperacion inválido (<=20).');

    // Exportador
    const ex = root.exportador;
    if (!ex) errors.push('Falta exportador.');
    if (ex) {
      if (!isStr(ex.idExportador) || !isLen(ex.idExportador, 15)) errors.push('idExportador inválido (<=15).');
      if (!isStr(ex.nombreExportador) || !isLen(ex.nombreExportador, 100)) errors.push('nombreExportador inválido (<=100).');
      if (ex.direccionExportador && !isLen(ex.direccionExportador, 120)) errors.push('direccionExportador demasiado larga (<=120).');
      if (ex.contactoExportador?.telefono && !isLen(ex.contactoExportador.telefono, 15)) errors.push('telefono exportador inválido (<=15).');
      if (ex.contactoExportador?.email && !isLen(ex.contactoExportador.email, 60)) errors.push('email exportador inválido (<=60).');
    }

    // Importador
    const im = root.importador;
    if (!im) errors.push('Falta importador.');
    if (im) {
      if (!isStr(im.idImportador) || !isLen(im.idImportador, 15)) errors.push('idImportador inválido (<=15).');
      if (!isStr(im.nombreImportador) || !isLen(im.nombreImportador, 100)) errors.push('nombreImportador inválido (<=100).');
      if (im.direccionImportador && !isLen(im.direccionImportador, 120)) errors.push('direccionImportador demasiado larga (<=120).');
      if (im.contactoImportador?.telefono && !isLen(im.contactoImportador.telefono, 15)) errors.push('telefono importador inválido (<=15).');
      if (im.contactoImportador?.email && !isLen(im.contactoImportador.email, 60)) errors.push('email importador inválido (<=60).');
    }

    // Transporte + ruta
    const tr = root.transporte;
    if (!tr) errors.push('Falta transporte.');
    if (tr) {
      if (!isStr(tr.medioTransporte) || !isLen(tr.medioTransporte, 20)) errors.push('medioTransporte inválido (<=20).');
      if (!isStr(tr.placaVehiculo) || !isLen(tr.placaVehiculo, 10)) errors.push('placaVehiculo inválida (<=10).');
      if (tr.conductor?.nombreConductor && !isLen(tr.conductor.nombreConductor, 80)) errors.push('nombreConductor inválido (<=80).');
      if (tr.conductor?.licenciaConductor && !isLen(tr.conductor.licenciaConductor, 20)) errors.push('licenciaConductor inválida (<=20).');
      if (tr.conductor?.paisLicencia && tr.conductor.paisLicencia.length !== 2) errors.push('paisLicencia inválido (2).');

      const rt = tr.ruta;
      if (!rt) errors.push('Falta ruta.');
      if (rt) {
        if (!isStr(rt.aduanaSalida) || !isLen(rt.aduanaSalida, 50)) errors.push('aduanaSalida inválida (<=50).');
        if (!isStr(rt.aduanaEntrada) || !isLen(rt.aduanaEntrada, 50)) errors.push('aduanaEntrada inválida (<=50).');
        if (!isStr(rt.paisDestino) || rt.paisDestino.length !== 2) errors.push('paisDestino inválido (2).');
        if (rt.kilometrosAproximados !== undefined && !isInt(rt.kilometrosAproximados)) errors.push('kilometrosAproximados debe ser entero.');
      }
    }

    // Mercancías
    const mc = root.mercancias;
    if (!mc) errors.push('Falta mercancias.');
    if (mc) {
      if (!isInt(mc.numeroItems)) errors.push('numeroItems inválido (int).');
      if (!Array.isArray(mc.items) || mc.items.length === 0) errors.push('items inválido (array requerido).');
      if (Array.isArray(mc.items)) {
        mc.items.forEach((it, i) => {
          if (!isInt(it.linea)) errors.push(`items[${i}].linea inválido (int).`);
          if (!isStr(it.descripcion) || !isLen(it.descripcion, 120)) errors.push(`items[${i}].descripcion inválida (<=120).`);
          if (!isInt(it.cantidad)) errors.push(`items[${i}].cantidad inválida (int).`);
          if (!isStr(it.unidadMedida) || !isLen(it.unidadMedida, 10)) errors.push(`items[${i}].unidadMedida inválida (<=10).`);
          if (!isNum(it.valorUnitario)) errors.push(`items[${i}].valorUnitario inválido (number).`);
          if (!isStr(it.paisOrigen) || it.paisOrigen.length !== 2) errors.push(`items[${i}].paisOrigen inválido (2).`);
        });
      }
    }

    // Totales
    const vl = root.valores;
    if (!vl) errors.push('Falta valores.');
    if (vl) {
      if (!isNum(vl.valorFactura)) errors.push('valorFactura inválido (number).');
      if (vl.gastosTransporte !== undefined && !isNum(vl.gastosTransporte)) errors.push('gastosTransporte inválido (number).');
      if (vl.seguro !== undefined && !isNum(vl.seguro)) errors.push('seguro inválido (number).');
      if (vl.otrosGastos !== undefined && !isNum(vl.otrosGastos)) errors.push('otrosGastos inválido (number).');
      if (!isNum(vl.valorAduanaTotal)) errors.push('valorAduanaTotal inválido (number).');
      if (!isStr(vl.moneda) || vl.moneda.length !== 3) errors.push('moneda inválida (3).');
    }

    if (!isStr(root.estadoDocumento) || !isLen(root.estadoDocumento, 20)) errors.push('estadoDocumento inválido (<=20).');
    if (!isStr(root.firmaElectronica) || !isLen(root.firmaElectronica, 64)) errors.push('firmaElectronica inválida (<=64).');
  }

  if (errors.length) return { ok: false, errors };

  // Normalización a columnas
  const d = root;
  const normalized = {
    numero_documento: d.numeroDocumento,
    fecha_emision: d.fechaEmision,
    pais_emisor: d.paisEmisor,
    tipo_operacion: d.tipoOperacion,
    id_exportador: d.exportador.idExportador,
    nombre_exportador: d.exportador.nombreExportador,
    direccion_exportador: d.exportador.direccionExportador ?? null,
    telefono_exportador: d.exportador.contactoExportador?.telefono ?? null,
    email_exportador: d.exportador.contactoExportador?.email ?? null,
    id_importador: d.importador.idImportador,
    nombre_importador: d.importador.nombreImportador,
    direccion_importador: d.importador.direccionImportador ?? null,
    telefono_importador: d.importador.contactoImportador?.telefono ?? null,
    email_importador: d.importador.contactoImportador?.email ?? null,
    medio_transporte: d.transporte.medioTransporte,
    placa_vehiculo: d.transporte.placaVehiculo,
    nombre_conductor: d.transporte.conductor?.nombreConductor ?? null,
    licencia_conductor: d.transporte.conductor?.licenciaConductor ?? null,
    pais_licencia: d.transporte.conductor?.paisLicencia ?? null,
    aduana_salida: d.transporte.ruta.aduanaSalida,
    aduana_entrada: d.transporte.ruta.aduanaEntrada,
    pais_destino: d.transporte.ruta.paisDestino,
    km_aproximados: d.transporte.ruta.kilometrosAproximados ?? null,
    valor_factura: d.valores.valorFactura,
    gastos_transporte: d.valores.gastosTransporte ?? null,
    seguro: d.valores.seguro ?? null,
    otros_gastos: d.valores.otrosGastos ?? null,
    valor_aduana_total: d.valores.valorAduanaTotal,
    moneda: d.valores.moneda,
    selectivo_codigo: d.resultadoSelectivo?.codigo ?? null,
    selectivo_descripcion: d.resultadoSelectivo?.descripcion ?? null,
    estado_documento: d.estadoDocumento,
    firma_electronica: d.firmaElectronica,
    items: d.mercancias.items
  };

  return { ok: true, data: normalized };
}
