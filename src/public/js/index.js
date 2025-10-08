window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

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
        msg.textContent = data?.error || 'Usuario o contraseña incorrecta';
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      location.replace('/usuarios.html');
    } catch (err) {
      msg.textContent = 'No se pudo conectar. Intenta de nuevo.';
    }
  });
});
