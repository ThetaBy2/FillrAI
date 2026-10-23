async function loadDashboard() {
  const d = await api('/api/dashboard');
  const firstName = d.user.full_name.split(' ')[0];
  document.getElementById('greeting').textContent = `Good to see you, ${firstName}`;

  document.getElementById('content').innerHTML = `
    <div class="grid">
      <div class="card"><h2>${d.docs_ready}/${d.docs_total}</h2><span class="muted">Documents in your vault</span></div>
      <div class="card"><h2>${d.eligible_count}</h2><span class="muted">Schemes you're eligible for</span></div>
      <div class="card"><h2>${d.applications_count}</h2><span class="muted">Applications</span></div>
    </div>

    <div class="card">
      <h3>Profile completeness · ${d.profile_completeness}%</h3>
      <progress value="${d.profile_completeness}" max="100"></progress>
      <div class="row">
        <a class="btn" href="documents.html">Add documents</a>
        <a class="btn ghost" href="schemes.html">Browse schemes</a>
        <a class="btn ghost" href="assistant.html">Ask FillrAI</a>
      </div>
    </div>

    <div class="card">
      <h3>Recommended for you</h3>
      ${d.recommended
        .map(
          (s) => `
        <div class="item">
          <div>
            <b>${esc(s.name)}</b>
            <div class="muted">${esc(s.description)}</div>
          </div>
          <a class="btn ghost" href="scheme.html?id=${encodeURIComponent(s.id)}">Open</a>
        </div>`,
        )
        .join('') || '<p class="muted">Nothing yet. Add documents to see what you qualify for.</p>'}
    </div>

    <div class="card">
      <h3>Recent applications</h3>
      ${d.recent_applications
        .map(
          (a) => `
        <div class="item">
          <div>
            <b>${esc(a.name)}</b>
            <div class="muted">Ref# ${esc(a.ref_number)}</div>
          </div>
          <span class="tag">${esc(a.status)}</span>
        </div>`,
        )
        .join('') || '<p class="muted">No applications yet.</p>'}
      <div class="row"><a class="btn ghost" href="track.html">Open tracker</a></div>
    </div>`;
}

loadDashboard().catch(showError);

