// Application flow for one scheme: 1. Fill, 2. Submit, 3. Done

const schemeId = new URLSearchParams(location.search).get('id');
let scheme; // the scheme, incl. eligible / filled_fields / missing_fields for this user
let fieldDefs = {}; // field key -> { label, kind, options }
let values = {}; // the form values the user will submit

const INPUT_TYPES = { date: 'date', email: 'email', tel: 'tel', number: 'number', file: 'file' };

// <input type="date"> needs "1962-01-01", but documents store "01 Jan 1962".
function toIsoDate(text) {
  const date = new Date(text + ' UTC');
  return isNaN(date) ? '' : date.toISOString().slice(0, 10);
}

function showStep(number) {
  document.getElementById('steps').innerHTML = ['Fill', 'Submit', 'Done']
    .map((name, i) => `<span class="tag ${i < number ? 'active' : ''}">${i + 1}. ${name}</span>`)
    .join('');
}

function fieldInput(key) {
  const def = fieldDefs[key] || { label: key, kind: 'text' };
  const value = values[key] || '';
  const attrs = `name="${esc(key)}" required`;

  if (def.kind === 'select') {
    const options = def.options.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('');
    return `<select ${attrs}><option value="">Select…</option>${options}</select>`;
  }
  if (def.kind === 'textarea') return `<textarea ${attrs} rows="2">${esc(value)}</textarea>`;
  if (def.kind === 'file' && value) return `<input ${attrs} value="${esc(value)}" readonly />`;
  if (def.kind === 'date') return `<input type="date" ${attrs} value="${toIsoDate(value)}" />`;
  return `<input type="${INPUT_TYPES[def.kind] || 'text'}" ${attrs} value="${esc(value)}" />`;
}

// ---------- Step 1: fill in the form ----------
function showFillStep() {
  showStep(1);
  const content = document.getElementById('content');

  if (!scheme.eligible) {
    content.innerHTML = `
      <div class="banner">Not eligible: ${esc(scheme.eligibility_reason)}</div>
      <div class="row"><a class="btn ghost" href="documents.html">Check my documents</a></div>`;
    return;
  }

  content.innerHTML = `
    <form class="card" id="fillForm">
      <h3>Your details</h3>
      <p class="muted">Fields marked "from vault" were filled for you. Fill in the rest.</p>
      ${scheme.fields
        .map((key) => {
          const fromVault = key in scheme.filled_fields;
          return `
          <label>${esc(fieldDefs[key]?.label || key)} <span class="muted">(${fromVault ? 'from vault' : 'needed'})</span></label>
          ${fieldInput(key)}`;
        })
        .join('')}
      <div class="row"><button>Continue</button></div>
    </form>`;

  document.getElementById('fillForm').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    for (const key of scheme.fields) {
      const value = form.get(key);
      values[key] = value instanceof File ? value.name : value.trim();
    }

    // Remember the answers the user typed, so the next form that needs them is pre-filled.
    for (const key of scheme.missing_fields) {
      await api('/api/checklist', { method: 'PUT', json: { field_key: key, value: values[key] } });
    }
    showSubmitStep();
  };
}

// ---------- Step 2: review and submit ----------
function showSubmitStep() {
  showStep(2);
  const summary = scheme.fields
    .map((key) => `<div><span>${esc(fieldDefs[key]?.label || key)}</span><span>${esc(values[key])}</span></div>`)
    .join('');

  // Some departments accept applications directly; for the rest the user finishes on the official portal.
  const actions = scheme.has_direct_api
    ? `<button id="submitBtn">Submit application</button>`
    : `<a class="btn ghost" href="${esc(scheme.portal_url)}" target="_blank" rel="noopener">Open ${esc(scheme.portal)}</a>
       <button id="submitBtn">I've submitted it on the portal</button>`;

  document.getElementById('content').innerHTML = `
    <div class="card">
      <h3>Check your details</h3>
      ${scheme.has_direct_api ? '' : `<div class="banner">This department has no direct submission. Open the portal, fill it using the details below, then come back and confirm.</div>`}
      <div class="kv">${summary}</div>
      <div class="row">
        <button class="ghost" id="backBtn">Back</button>
        ${actions}
      </div>
    </div>`;

  document.getElementById('backBtn').onclick = showFillStep;
  document.getElementById('submitBtn').onclick = async () => {
    try {
      const application = await api('/api/applications', {
        method: 'POST',
        json: { scheme_id: scheme.id, mode: scheme.has_direct_api ? 'direct' : 'redirect', form_data: values },
      });
      showDoneStep(application);
    } catch (err) {
      alert(err.message);
    }
  };
}

// ---------- Step 3: done ----------
function showDoneStep(application) {
  showStep(3);
  document.getElementById('content').innerHTML = `
    <div class="banner">Application submitted. Reference number: <b>${esc(application.ref_number)}</b></div>
    <div class="row"><a class="btn" href="track.html">Track applications</a></div>`;
}

async function loadScheme() {
  const [schemeData, defs] = await Promise.all([api('/api/schemes/' + encodeURIComponent(schemeId)), api('/api/schemes/fields')]);
  scheme = schemeData;
  for (const def of defs) fieldDefs[def.key] = def;
  values = { ...scheme.filled_fields };

  document.getElementById('header').innerHTML = `
    <p class="muted">${esc(scheme.category)}</p>
    <h1>${esc(scheme.name)}</h1>
    <p>${esc(scheme.long_description || scheme.description)}</p>
    <div class="row">${(scheme.benefits || []).map((b) => `<span class="tag">${esc(b)}</span>`).join('')}</div>`;

  showFillStep();
}

loadScheme().catch(showError);

