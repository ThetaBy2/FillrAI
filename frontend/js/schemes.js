let schemes = [];
let category = 'All';

function schemeCard(s) {
  return `
    <div class="card">
      <b>${esc(s.name)}</b>
      <p class="muted">${esc(s.description)}</p>
      <div>
        <span class="tag">${esc(s.category)}</span>
        <span class="tag">${s.has_direct_api ? 'Submit in FillrAI' : 'Official portal'}</span>
        ${s.eligible ? '<span class="tag">eligible</span>' : `<span class="tag">${esc(s.eligibility_reason)}</span>`}
      </div>
      <div class="row">
        <a class="btn ${s.eligible ? '' : 'ghost'}" href="scheme.html?id=${encodeURIComponent(s.id)}">
          ${s.eligible ? 'Start application' : 'View details'}
        </a>
      </div>
    </div>`;
}

function render() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const visible = schemes.filter(
    (s) =>
      (category === 'All' || s.category === category) &&
      (s.name + ' ' + s.description).toLowerCase().includes(query),
  );

  const categories = ['All', ...new Set(schemes.map((s) => s.category))];
  document.getElementById('categories').innerHTML = categories
    .map((c) => `<button class="ghost ${c === category ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`)
    .join('');

  document.getElementById('content').innerHTML = visible.length
    ? `<div class="grid">${visible.map(schemeCard).join('')}</div>`
    : '<p class="muted">No schemes match.</p>';
}

document.getElementById('search').oninput = render;

document.getElementById('categories').onclick = (event) => {
  const chip = event.target.closest('[data-category]');
  if (!chip) return;
  category = chip.dataset.category;
  render();
};

api('/api/schemes')
  .then((data) => {
    schemes = data;
    render();
  })
  .catch(showError);

