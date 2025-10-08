import { pool } from '../db/pool.js';

// Helpers
function getClientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').toString();
}
function getUA(req) {
  return (req.headers['user-agent'] || '').toString();
}

// =====================
// GET /api/users
// =====================
export async function listUsers(req, res, next) {
  try {
    const q = `
      SELECT u.id, u.full_name, u.email, r.code as role_code, r.name as role_name,
             u.is_active, u.last_login_at, u.created_at, u.updated_at
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      ORDER BY u.id ASC;
    `;
    const { rows } = await pool.query(q);
    res.json({ ok: true, users: rows });
  } catch (err) {
    next(err);
  }
}

// =====================
// POST /api/users
// { full_name, email, role_code, is_active, password }
// =====================
export async function createUser(req, res) {
  const client = await pool.connect();
  try {
    const { full_name, email, role_code, is_active = true, password } = req.body ?? {};
    if (!full_name || !email || !role_code || !password) {
      return res.status(400).json({ ok: false, error: 'Complete todos los campos obligatorios' });
    }

    const ip = getClientIp(req);
    const ua = getUA(req);
    const actorId = req.user.id;

    await client.query('BEGIN');

    const roleRes = await client.query(`SELECT id FROM public.roles WHERE code = $1`, [role_code]);
    if (roleRes.rowCount === 0) {
      throw Object.assign(new Error('Rol inválido'), { status: 400 });
    }

    const insertRes = await client.query(
      `INSERT INTO public.users (full_name, email, password_hash, role_id, is_active)
       VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, $5)
       RETURNING id, full_name, email, is_active`,
      [full_name, email, password, roleRes.rows[0].id, !!is_active]
    );

    const newUser = insertRes.rows[0];

    await client.query(
      `INSERT INTO public.admin_log (actor_user_id, target_user_id, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'USER_CREATE', 'EXITO', $5)`,
      [actorId, newUser.id, ip, ua, `creado ${newUser.email} con rol ${role_code}`]
    );

    await client.query('COMMIT');
    return res.status(201).json({ ok: true, user: newUser });
  } catch (err) {
    // Revierte la transacción de este client
    try { await client.query('ROLLBACK'); } catch {}
    // Manejo de email duplicado
    if (err?.code === '23505') {
      try {
        await pool.query(
          `INSERT INTO public.admin_log (actor_user_id, target_user_id, ip_address, user_agent, operation, result, notes)
           VALUES ($1, NULL, $2, $3, 'USER_CREATE', 'FALLO', $4)`,
          [req.user.id, getClientIp(req), getUA(req), `email duplicado: ${req.body?.email}`]
        );
      } catch {}
      return res.status(409).json({ ok: false, error: 'Correo ya registrado' });
    }
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Error creando usuario' });
  } finally {
    client.release();
  }
}

// =====================
// PUT /api/users/:id
// { full_name?, email?, role_code?, is_active?, password? }
// =====================
export async function updateUser(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { full_name, email, role_code, is_active, password } = req.body ?? {};
    if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

    const ip = getClientIp(req);
    const ua = getUA(req);
    const actorId = req.user.id;

    await client.query('BEGIN');

    const currentRes = await client.query(`SELECT * FROM public.users WHERE id = $1`, [id]);
    if (currentRes.rowCount === 0) {
      throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    }

    let roleId = currentRes.rows[0].role_id;
    if (role_code) {
      const roleRes = await client.query(`SELECT id FROM public.roles WHERE code = $1`, [role_code]);
      if (roleRes.rowCount === 0) {
        throw Object.assign(new Error('Rol inválido'), { status: 400 });
      }
      roleId = roleRes.rows[0].id;
    }

    const sets = [];
    const vals = [];
    let idx = 1;

    if (full_name !== undefined) { sets.push(`full_name = $${idx++}`); vals.push(full_name); }
    if (email !== undefined)     { sets.push(`email = $${idx++}`); vals.push(email); }
    if (roleId !== undefined)    { sets.push(`role_id = $${idx++}`); vals.push(roleId); }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(!!is_active); }
    if (password) { sets.push(`password_hash = crypt($${idx++}, gen_salt('bf', 10))`); vals.push(password); }

    if (sets.length === 0) {
      await client.query('ROLLBACK'); // no hubo cambios
      return res.json({ ok: true, user: currentRes.rows[0] });
    }

    vals.push(id);
    const updateRes = await client.query(
      `UPDATE public.users SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, full_name, email, is_active`,
      vals
    );

    await client.query(
      `INSERT INTO public.admin_log (actor_user_id, target_user_id, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'USER_UPDATE', 'EXITO', $5)`,
      [actorId, id, ip, ua, `actualizado ${updateRes.rows[0].email}`]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, user: updateRes.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err?.code === '23505') {
      try {
        await pool.query(
          `INSERT INTO public.admin_log (actor_user_id, target_user_id, ip_address, user_agent, operation, result, notes)
           VALUES ($1, $2, $3, $4, 'USER_UPDATE', 'FALLO', $5)`,
          [req.user.id, req.params.id, getClientIp(req), getUA(req), `email duplicado: ${req.body?.email}`]
        );
      } catch {}
      return res.status(409).json({ ok: false, error: 'Correo ya registrado' });
    }
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Error actualizando usuario' });
  } finally {
    client.release();
  }
}

// =====================
// DELETE /api/users/:id  (borrado lógico: is_active = false)
// =====================
export async function deactivateUser(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

    const ip = getClientIp(req);
    const ua = getUA(req);
    const actorId = req.user.id;

    await client.query('BEGIN');

    const exists = await client.query(`SELECT id, email FROM public.users WHERE id = $1`, [id]);
    if (exists.rowCount === 0) {
      throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    }

    const up = await client.query(
      `UPDATE public.users SET is_active = FALSE WHERE id = $1
       RETURNING id, email, is_active`,
      [id]
    );

    await client.query(
      `INSERT INTO public.admin_log (actor_user_id, target_user_id, ip_address, user_agent, operation, result, notes)
       VALUES ($1, $2, $3, $4, 'USER_DELETE', 'EXITO', $5)`,
      [actorId, id, ip, ua, `desactivado ${up.rows[0].email}`]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, user: up.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message || 'Error desactivando usuario' });
  } finally {
    client.release();
  }
}
