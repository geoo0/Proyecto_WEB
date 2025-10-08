const out = document.getElementById('out');
const title = document.getElementById('title');
const logoutBtn = document.getElementById('logout');

function goLogin() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = '/login.html';
}

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) return goLogin();

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return goLogin();
    }

    title.textContent = `Bienvenido, ${data.user?.id ? (JSON.parse(localStorage.getItem('user'))?.name || 'Usuario') : 'Usuario'}`;
    out.textContent = JSON.stringify(data, null, 2);
  } catch {
    goLogin();
  }
}

logoutBtn.addEventListener('click', goLogin);
loadProfile();
