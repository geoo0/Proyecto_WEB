const form = document.getElementById('form');
const statusEl = document.getElementById('status');
const out = document.getElementById('out');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Autenticando...';
  out.hidden = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      statusEl.textContent = data.error || 'Error de autenticación';
      out.hidden = false;
      out.textContent = JSON.stringify(data, null, 2);
      return;
    }

    // Guarda token y redirige
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    location.href = '/home.html';
  } catch (err) {
    statusEl.textContent = 'Fallo la solicitud';
    out.hidden = false;
    out.textContent = String(err);
  }
});
