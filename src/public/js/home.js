const out = document.getElementById('out');
const title = document.getElementById('title');
const logoutBtn = document.getElementById('logout');

function goLogin() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } finally {
    location.replace('/index.html'); // login vive en index.html
  }
}

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) return goLogin();

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    const data = await res.json();

    if (!res.ok || !data.ok) return goLogin();

    const u = JSON.parse(localStorage.getItem('user') || '{}');
    title.textContent = `Bienvenido, ${u.name || 'Usuario'}`;
    out.textContent = JSON.stringify(data, null, 2);
  } catch {
    goLogin();
  }
}

logoutBtn.addEventListener('click', goLogin);
loadProfile();
