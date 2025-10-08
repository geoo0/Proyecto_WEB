const statusEl = document.getElementById('status');
const serverOut = document.getElementById('serverOut');
const jsonInput = document.getElementById('jsonInput');
const valErrors = document.getElementById('valErrors');
const roleInfo = document.getElementById('roleInfo');

document.getElementById('btnLogout').addEventListener('click', logout);
document.getElementById('btnPreload').addEventListener('click', preload);
document.getElementById('btnPretty').addEventListener('click', pretty);
document.getElementById('btnValidate').addEventListener('click', validateOnly);
document.getElementById('btnSend').addEventListener('click', sendDUCA);

init();

function init() {
  const user = safeJson(localStorage.getItem('user')) || {};
  roleInfo.textContent = user?.role ? `Autenticado como: ${user.role} · ${user.email || ''}` : '';
  const token = localStorage.getItem('token');
  if (!token) return goLogin();

  if (user?.role !== 'TRANSPORTISTA') {
    showError('Solo TRANSPORTISTA puede usar este módulo. Redirigiendo…');
    setTimeout(() => location.replace('/usuarios.html'), 1500);
  }
}

function goLogin() {
  location.replace('/index.html');
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  goLogin();
}

function authHeaders() {
  const t = localStorage.getItem('token');
  return { 'Authorization': `Bearer ${t}` };
}

function showStatus(msg) {
  statusEl.textContent = msg || '';
}
function showError(msg, details) {
  statusEl.textContent = msg || 'Error';
  statusEl.classList.remove('text-muted');
  statusEl.classList.add('text-danger');
  if (details?.length) {
    valErrors.innerHTML = `<div class="alert alert-danger"><ul class="mb-0">${details.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
  } else {
    valErrors.innerHTML = '';
  }
}
function clearMsgs() {
  statusEl.textContent = '';
  statusEl.classList.remove('text-danger');
  statusEl.classList.add('text-muted');
  valErrors.innerHTML = '';
  serverOut.textContent = '{}';
}

function safeJson(x) {
  try { return JSON.parse(x); } catch { return null; }
}

function preload() {
  const sample = {
    "duca": {
      "numeroDocumento": "GT2025DUCA001234",
      "fechaEmision": "2025-10-04",
      "paisEmisor": "GT",
      "tipoOperacion": "IMPORTACION",
      "exportador": {
        "idExportador": "EXP-00145",
        "nombreExportador": "Comercial del Norte S.A.",
        "direccionExportador": "Zona 12, Ciudad de Guatemala",
        "contactoExportador": {
          "telefono": "+50245678900",
          "email": "exportaciones@comnorte.gt"
        }
      },
      "importador": {
        "idImportador": "IMP-00984",
        "nombreImportador": "Distribuciones del Sur Ltda.",
        "direccionImportador": "San Salvador, El Salvador",
        "contactoImportador": {
          "telefono": "+50377780000",
          "email": "compras@distsur.sv"
        }
      },
      "transporte": {
        "medioTransporte": "TERRESTRE",
        "placaVehiculo": "C123BGT",
        "conductor": {
          "nombreConductor": "Juan Pérez",
          "licenciaConductor": "L-987654",
          "paisLicencia": "GT"
        },
        "ruta": {
          "aduanaSalida": "PUERTO BARRIOS",
          "aduanaEntrada": "SAN CRISTÓBAL",
          "paisDestino": "SV",
          "kilometrosAproximados": 325
        }
      },
      "mercancias": {
        "numeroItems": 2,
        "items": [
          {
            "linea": 1,
            "descripcion": "Componentes electrónicos",
            "cantidad": 500,
            "unidadMedida": "CAJA",
            "valorUnitario": 45.50,
            "paisOrigen": "CN"
          },
          {
            "linea": 2,
            "descripcion": "Cables industriales",
            "cantidad": 200,
            "unidadMedida": "ROLLO",
            "valorUnitario": 20.00,
            "paisOrigen": "MX"
          }
        ]
      },
      "valores": {
        "valorFactura": 32500.00,
        "gastosTransporte": 1500.00,
        "seguro": 300.00,
        "otrosGastos": 100.00,
        "valorAduanaTotal": 34400.00,
        "moneda": "USD"
      },
      "resultadoSelectivo": {
        "codigo": "R",
        "descripcion": "Revisión documental"
      },
      "estadoDocumento": "CONFIRMADO",
      "firmaElectronica": "AB12CD34EF56GH78"
    }
  };
  jsonInput.value = JSON.stringify(sample, null, 2);
  showStatus('Ejemplo cargado');
}

function pretty() {
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido, no se puede formatear');
  jsonInput.value = JSON.stringify(data, null, 2);
  showStatus('Formateado');
}

function validateOnly() {
  clearMsgs();
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido', ['No se pudo parsear el JSON.']);
  // Validación ligera en front: al menos debe tener duca/numeroDocumento
  const e = [];
  if (!data.duca) e.push('Falta objeto raíz "duca".');
  if (!data?.duca?.numeroDocumento) e.push('Falta "duca.numeroDocumento".');
  if (e.length) return showError('Verifique los campos obligatorios', e);
  showStatus('JSON con estructura básica OK');
}

async function sendDUCA() {
  clearMsgs();
  const data = safeJson(jsonInput.value);
  if (!data) return showError('JSON inválido', ['No se pudo parsear el JSON.']);

  showStatus('Enviando...');
  try {
    const res = await fetch('/api/duca/recepcion', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store'
    });
    const body = await res.json().catch(() => ({}));

    serverOut.textContent = JSON.stringify(body, null, 2);

    if (!res.ok || !body.ok) {
      if (res.status === 400) {
        return showError('Verifique los campos obligatorios', body.details || [body.error || 'Solicitud inválida']);
      }
      if (res.status === 409) {
        return showError('DUCA ya registrada', [body.error]);
      }
      if (res.status === 403) {
        return showError('No autorizado (se requiere TRANSPORTISTA)');
      }
      return showError('Error al registrar la declaración', [body.error || `HTTP ${res.status}`]);
    }

    showStatus('Declaración registrada correctamente ✅');
  } catch (err) {
    serverOut.textContent = String(err);
    showError('No se pudo conectar con el servidor');
  }
}

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
