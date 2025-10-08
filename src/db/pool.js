import pg from 'pg';
const { Pool } = pg;

const connectionString =
  'postgresql://db_web_rnpd_user:MkTqFGNda8p79AqNvweWiZzuGypq32BK@dpg-d3ijuoruibrs73d00gug-a.oregon-postgres.render.com:5432/db_web_rnpd?sslmode=require';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});