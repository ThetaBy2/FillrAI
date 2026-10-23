// Shared by every page: login check, API helper, sidebar.

const token = localStorage.getItem('fillrai_token');
const onLoginPage = location.pathname.endsWith('login.html');

if (!token && !onLoginPage) {
  location.href = 'login.html';
}

function logout() {
  localStorage.removeItem('fillrai_token');
  location.href = 'login.html';
}

// Escape text before putting it into HTML (stops user data from becoming HTML/script).
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Call the backend. Sends the login token, parses JSON, throws on errors.
//   api('/api/schemes')
//   api('/api/checklist', { method: 'PUT', json: { field_key: 'pan', value: '...' } })
async function api(path, { method = 'GET', json, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const res = await fetch(path, { method, headers, body });
  if (res.status === 401 && token) logout(); // token expired
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}

const PAGES = [
  { file: 'dashboard.html', label: 'Dashboard' },
  { file: 'schemes.html', label: 'Apply' },
  { file: 'documents.html', label: 'My Documents' },
  { file: 'track.html', label: 'Track applications' },
  { file: 'assistant.html', label: 'AI Assistant' },
  { file: 'notifications.html', label: 'Notifications' },
  { file: 'settings.html', label: 'Settings' },
];

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const current = location.pathname.split('/').pop();
  sidebar.innerHTML = `
    <h2>FillrAI</h2>
    <p class="muted">One place for every government document</p>
    <ul>
      ${PAGES.map((p) => `<li><a href="${p.file}" class="${p.file === current ? 'active' : ''}">${p.label}</a></li>`).join('')}
    </ul>
    <button class="link" id="logoutBtn">Sign out</button>`;
  document.getElementById('logoutBtn').onclick = logout;
}

// Show a load error in place of the page content.
function showError(err) {
  document.getElementById('content').innerHTML = `<div class="banner">${esc(err.message)}</div>`;
}

renderSidebar();

