import { pool } from '../db/pool.js';

export async function getDbDiag(req, res, next) {
  try {
    const q = async (sql) => (await pool.query(sql)).rows;

    const now = await q('SELECT now()');
    const version = await q('SELECT version()');
    const db = await q('SELECT current_database() AS db');
    const user = await q('SELECT current_user AS current_user, session_user AS session_user');
    const searchPath = await q(`SHOW search_path`);

    res.json({
      ok: true,
      info: {
        now,
        version,
        db,
        user,
        search_path: searchPath
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getHealth(req, res) {
  res.json({ ok: true, service: 'PG Render Demo', health: 'green' });
}
