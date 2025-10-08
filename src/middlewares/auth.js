import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' '); // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // payload: { sub, role, iat, exp }
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}
