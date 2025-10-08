const API = {
  list:  () => fetch('/api/users', { headers: authHeaders() }).then(r => r.json()),
  create:(body) => fetch('/api/users', { method:'POST', headers: { ...authHeaders(), 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  update:(id, body) => fetch(`/api/users/${id}`, { method:'PUT', headers: { ...authHeaders(), 'Content-Type':'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  del:   (id) => fetch(`/api/users/${id}`, { method:'DELETE', headers: authHeaders() }).then(r => r.json())
};

function authHeaders() {
  const t = localStorage.getItem('token');
  if (!t) { location.replace('/index.html'); return {}; }
  return { 'Authorization': `Bearer ${t}` };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.replace('/index.html');
}

const form = document.getElementById('formNew');
const tblBody = document.querySelector('#tblUsers tbody');
const statusEl = document.getElementById('status');
document.getElementById('btnReload').addEventListener('click', loadUsers);
document.getElementById('btnLogout').addEventListener('click', logout);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Creando...';
  const body = {
    full_name:  document.getElementById('full_name').value.trim(),
    email:      document.getElementById('email').value.trim(),
    role_code:  document.getElementById('role_code').value,
    is_active:  document.getElementById('is_active').value === 'true',
    password:   document.getElementById('password').value
  };

  const res = await API.create(body);
  if (!res.ok) {
    statusEl.textContent = res.error || 'Error';
    return;
  }
  statusEl.textContent = 'Usuario creado exitosamente';
  form.reset();
  document.getElementById('is_active').value = 'true';
  loadUsers();
});

async function loadUsers() {
  statusEl.textContent = 'Cargando...';
  const res = await API.list();
  if (!res.ok) {
    statusEl.textContent = res.error || 'Error al cargar';
    if (res.error && /Token/.test(res.error)) logout();
    return;
  }
  statusEl.textContent = '';
  renderUsers(res.users || []);
}

function renderUsers(users) {
  tblBody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><input class="form-control form-control-sm" value="${escapeHtml(u.full_name)}" data-k="full_name"></td>
      <td><input class="form-control form-control-sm" value="${escapeHtml(u.email)}" data-k="email"></td>
      <td>
        <select class="form-select form-select-sm" data-k="role_code">
          ${['ADMIN','IMPORTADOR','AGENTE','TRANSPORTISTA'].map(rc => `<option value="${rc}" ${rc===u.role_code?'selected':''}>${rc}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="form-select form-select-sm" data-k="is_active">
          <option value="true" ${u.is_active?'selected':''}>true</option>
          <option value="false" ${!u.is_active?'selected':''}>false</option>
        </select>
      </td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-success" data-act="save" data-id="${u.id}">Guardar</button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${u.id}">Desactivar</button>
      </td>
    `;
    tblBody.appendChild(tr);
  });
}

tblBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.act === 'save') {
    const tr = btn.closest('tr');
    const payload = pickRow(tr);
    const res = await API.update(id, payload);
    statusEl.textContent = res.ok ? 'Actualizado' : (res.error || 'Error');
    if (res.ok) loadUsers();
  }

  if (btn.dataset.act === 'del') {
    const res = await API.del(id);
    statusEl.textContent = res.ok ? 'Usuario desactivado' : (res.error || 'Error');
    if (res.ok) loadUsers();
  }
});

function pickRow(tr) {
  const get = (k) => tr.querySelector(`[data-k="${k}"]`);
  return {
    full_name: get('full_name').value.trim(),
    email: get('email').value.trim(),
    role_code: get('role_code').value,
    is_active: get('is_active').value === 'true'
  };
}

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

loadUsers();
