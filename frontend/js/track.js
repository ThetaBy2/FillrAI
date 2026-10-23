const formatDate = (iso) => new Date(iso).toLocaleString();

function applicationCard(app) {
  const history = app.status_history
    .map(
      (h) => `
      <li><b>${esc(h.status)}</b> <span class="muted">${esc(h.detail)} · ${formatDate(h.at)}</span></li>`,
    )
    .join('');

  return `
    <div class="card">
      <div class="item">
        <div>
          <b>${esc(app.name)}</b>
          <div class="muted">Ref# ${esc(app.ref_number)} · ${app.mode === 'direct' ? 'Submitted via FillrAI' : 'Submitted on official portal'}</div>
        </div>
        <span class="tag">${esc(app.status)}</span>
      </div>
      <ul>${history}</ul>
      <button class="ghost" data-advance="${app.id}">Advance status</button>
    </div>`;
}

async function loadApplications() {
  const apps = await api('/api/applications');
  document.getElementById('content').innerHTML = apps.length
    ? apps.map(applicationCard).join('')
    : '<p class="muted">Nothing submitted yet. <a href="schemes.html">Browse schemes</a></p>';
}

document.getElementById('content').onclick = async (event) => {
  const button = event.target.closest('[data-advance]');
  if (!button) return;
  try {
    await api(`/api/applications/${button.dataset.advance}/advance`, { method: 'POST' });
    await loadApplications();
  } catch (err) {
    alert(err.message);
  }
};

loadApplications().catch(showError);

