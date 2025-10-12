import { pool } from '../db/pool.js';
import { validateDUCA } from '../validators/duca.validator.js';

function getClientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').toString();
}
function getUA(req) {
  return (req.headers['user-agent'] || '').toString();
}

// POST /api/duca/recepcion
export async function recepcionDUCA(req, res) {
  const client = await pool.connect();
  const ip = getClientIp(req);
  const ua = getUA(req);
  const userId = req.user.id; // transportista autenticado

  try {
    // 1) Validar payload
    const { ok, errors, data } = validateDUCA(req.body);
    if (!ok) {
      try {
        await pool.query(
          `INSERT INTO public.declaration_log
             (user_id, ip_address, user_agent, operation, result, numero_declaracion, notes)
           VALUES
             ($1, NULLIF($2,'')::inet, $3, 'DECLARATION_CREATE', 'FALLO', $4, $5)`,
          [userId, ip, ua, req.body?.duca?.numeroDocumento ?? null, `Validación: ${errors.join('; ')}`]
        );
      } catch {}
      return res.status(400).json({ ok: false, error: 'Verifique los campos obligatorios', details: errors });
    }

    await client.query('BEGIN');

    // 2) RN01: DUCA única
    const exists = await client.query(
      `SELECT 1 FROM public.duca_declarations WHERE numero_documento = $1 LIMIT 1`,
      [data.numero_documento]
    );
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      try {
        await pool.query(
          `INSERT INTO public.declaration_log
             (user_id, ip_address, user_agent, operation, result, numero_declaracion, notes)
           VALUES
             ($1, NULLIF($2,'')::inet, $3, 'DECLARATION_CREATE', 'FALLO', $4, 'DUCA ya registrada')`,
          [userId, ip, ua, data.numero_documento]
        );
      } catch {}
      return res.status(409).json({ ok: false, error: 'DUCA ya registrada' });
    }

    // 3) Insert cabecera (estado por defecto: PENDIENTE)
    const cab = await client.query(
      `INSERT INTO public.duca_declarations (
        numero_documento, fecha_emision, pais_emisor, tipo_operacion,
        id_exportador, nombre_exportador, direccion_exportador, telefono_exportador, email_exportador,
        id_importador, nombre_importador, direccion_importador, telefono_importador, email_importador,
        medio_transporte, placa_vehiculo, nombre_conductor, licencia_conductor, pais_licencia,
        aduana_salida, aduana_entrada, pais_destino, km_aproximados,
        valor_factura, gastos_transporte, seguro, otros_gastos, valor_aduana_total, moneda,
        selectivo_codigo, selectivo_descripcion,
        estado_documento, firma_electronica,
        created_by_user_id
      )
      VALUES ($1,$2,$3,$4,  $5,$6,$7,$8,$9,  $10,$11,$12,$13,$14,
              $15,$16,$17,$18,$19,  $20,$21,$22,$23,
              $24,$25,$26,$27,$28,$29,  $30,$31,  $32,$33,  $34)
      RETURNING id`,
      [
        data.numero_documento, data.fecha_emision, data.pais_emisor, data.tipo_operacion,
        data.id_exportador, data.nombre_exportador, data.direccion_exportador, data.telefono_exportador, data.email_exportador,
        data.id_importador, data.nombre_importador, data.direccion_importador, data.telefono_importador, data.email_importador,
        data.medio_transporte, data.placa_vehiculo, data.nombre_conductor, data.licencia_conductor, data.pais_licencia,
        data.aduana_salida, data.aduana_entrada, data.pais_destino, data.km_aproximados,
        data.valor_factura, data.gastos_transporte, data.seguro, data.otros_gastos, data.valor_aduana_total, data.moneda,
        data.selectivo_codigo, data.selectivo_descripcion,
        data.estado_documento, data.firma_electronica,
        userId
      ]
    );
    const ducaId = cab.rows[0].id;

    // 4) Insert items (batch)
    const items = data.items;
    const values = [];
    const params = [];
    let i = 1;
    for (const it of items) {
      params.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
      values.push(ducaId, it.linea, it.descripcion, it.cantidad, it.unidadMedida, it.valorUnitario, it.paisOrigen);
    }
    await client.query(
      `INSERT INTO public.duca_items
         (duca_id, linea, descripcion, cantidad, unidad_medida, valor_unitario, pais_origen)
       VALUES ${params.join(', ')}`,
      values
    );

    await client.query('COMMIT');

    // 5) Bitácora éxito
    try {
      await pool.query(
        `INSERT INTO public.declaration_log
           (user_id, ip_address, user_agent, operation, result, numero_declaracion, notes)
         VALUES
           ($1, NULLIF($2,'')::inet, $3, 'DECLARATION_CREATE', 'EXITO', $4, 'Declaración guardada con estado PENDIENTE')`,
        [userId, ip, ua, data.numero_documento]
      );
    } catch {}

    return res.status(201).json({
      ok: true,
      message: 'Declaración registrada correctamente',
      numero: data.numero_documento,
      estado: 'PENDIENTE',
      id: ducaId
    });
  } catch (err) {
    console.error('DUCA recepcion error:', err);
    try { await client.query('ROLLBACK'); } catch {}
    try {
      await pool.query(
        `INSERT INTO public.declaration_log
           (user_id, ip_address, user_agent, operation, result, numero_declaracion, notes)
         VALUES
           ($1, NULLIF($2,'')::inet, $3, 'DECLARATION_CREATE', 'FALLO', $4, $5)`,
        [userId, ip, ua, req.body?.duca?.numeroDocumento ?? null, err.message || 'Error 500']
      );
    } catch {}
    return res.status(500).json({ ok: false, error: 'Error al registrar la declaración' });
  } finally {
    client.release();
  }
}
