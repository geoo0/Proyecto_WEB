// Not Found
export function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: 'Not Found' });
}

// Error handler
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
}
