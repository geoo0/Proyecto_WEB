const btn = document.getElementById('btn');
const out = document.getElementById('out');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
  status.textContent = 'Consultando...';
  out.textContent = '{}';
  try {
    const res = await fetch('/api/_diag/db');
    const data = await res.json();
    status.textContent = data.ok ? 'OK ✅' : 'Con error ⚠️';
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    status.textContent = 'Falló la solicitud';
    out.textContent = String(e);
  }
});
