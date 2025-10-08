window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const statusEl = document.getElementById('status');
  const out = document.getElementById('out');

  console.log('[index.js] cargado'); // <-- Te confirma que el JS sí corrió

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    statusEl.textContent = 'Autenticando...';
    out.hidden = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      console.log('[login] POST /api/auth/login', { email });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));
      console.log('[login] response', res.status, data);

      if (!res.ok || !data.ok) {
        statusEl.textContent = data?.error || `Error de autenticación (HTTP ${res.status})`;
        out.hidden = false;
        out.textContent = JSON.stringify(data, null, 2);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      statusEl.textContent = 'OK ✅ Redirigiendo...';
      location.href = '/home.html';
    } catch (err) {
      console.error('[login] error', err);
      statusEl.textContent = 'Fallo la solicitud';
      out.hidden = false;
      out.textContent = String(err);
    }
  });
});
