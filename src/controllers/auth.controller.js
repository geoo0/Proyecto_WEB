import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES = '2h'; // RN02

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || '';

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email y password requeridos' });
    }

    // Validación con pgcrypto (crypt) en una sola query
    const q = `
      SELECT u.id, u.full_name, u.email, u.is_active, r.code AS role_code, r.name AS role_name
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE lower(u.email) = lower($1)
        AND u.is_active = TRUE
        AND crypt($2, u.password_hash) = u.password_hash
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [email, password]);

    if (rows.length === 0) {
      // Bitácora fallo
      await pool.query(
        `INSERT INTO public.login_log (user_id, username_entered, ip_address, user_agent, operation, result)
         VALUES (NULL, $1, $2, $3, 'login', 'FALLO')`,
        [email, ip, userAgent]
      );
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrecta' });
    }

    const u = rows[0];

    // Token (2h)
    const token = jwt.sign(
      { sub: u.id, role: u.role_code },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // Actualiza last_login_at y registra éxito
    await pool.query(`UPDATE public.users SET last_login_at = NOW() WHERE id = $1`, [u.id]);
    await pool.query(
      `INSERT INTO public.login_log (user_id, username_entered, ip_address, user_agent, operation, result)
       VALUES ($1, $2, $3, $4, 'login', 'EXITO')`,
      [u.id, email, ip, userAgent]
    );

    res.json({
      ok: true,
      token,
      user: {
        id: u.id,
        name: u.full_name,
        email: u.email,
        role: u.role_code,
        role_name: u.role_name
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  // req.user viene del middleware authRequired
  res.json({ ok: true, user: req.user });
}
