let fieldLabels = {}; // field key -> readable label, e.g. "dob" -> "Date of birth"

function statusTag(doc) {
  if (doc.status === 'missing') return '<span class="tag">Missing</span>';
  if (doc.status === 'fetched') return '<span class="tag">From DigiLocker</span>';
  return `<span class="tag">Uploaded: ${esc(doc.file_name)}</span>`;
}

function documentRow(doc) {
  const fields = Object.entries(doc.extracted_data || {})
    .map(([key, value]) => `<div><span>${esc(fieldLabels[key] || key)}</span><span>${esc(value)}</span></div>`)
    .join('');

  const actions =
    doc.status === 'missing'
      ? `<button class="ghost" data-fetch="${doc.doc_type}">Fetch from DigiLocker</button>
         <label class="btn">Upload <input type="file" accept=".pdf,image/*" data-upload="${doc.doc_type}" hidden /></label>`
      : `<button class="ghost" data-remove="${doc.doc_type}">Remove</button>`;

  return `
    <div class="item">
      <div style="flex: 1">
        <b>${esc(doc.label)}</b>
        <div class="muted">${esc(doc.hint)}</div>
        ${fields ? `<div class="kv">${fields}</div>` : ''}
      </div>
      <div>${statusTag(doc)} ${actions}</div>
    </div>`;
}

async function loadVault() {
  const vault = await api('/api/documents/vault');
  document.getElementById('content').innerHTML = `
    <p class="muted">${vault.ready} of ${vault.total} documents added</p>
    ${vault.documents.map(documentRow).join('')}`;
}

// --- DigiLocker fetch: ask for an OTP, show the popup, confirm ---
async function fetchFromDigiLocker(docType) {
  const { session_id, phone_masked } = await api('/api/documents/fetch/request-otp', {
    method: 'POST',
    json: { doc_type: docType },
  });

  const dialog = document.getElementById('otpDialog');
  document.getElementById('otpPhone').textContent = phone_masked;
  document.getElementById('otpInput').value = '';
  dialog.returnValue = ''; // pressing Esc keeps the old value, so reset it
  dialog.showModal();

  dialog.onclose = async () => {
    if (dialog.returnValue !== 'confirm') return;
    try {
      const otp = document.getElementById('otpInput').value.trim();
      await api('/api/documents/fetch/confirm', { method: 'POST', json: { doc_type: docType, session_id, otp } });
      await loadVault();
    } catch (err) {
      alert(err.message);
    }
  };
}

async function uploadFile(docType, file) {
  const body = new FormData();
  body.append('doc_type', docType);
  body.append('file', file);
  await api('/api/documents/upload', { method: 'POST', body });
  await loadVault();
}

async function removeDocument(docType) {
  if (!confirm('Remove this document from your vault?')) return;
  await api('/api/documents/' + docType, { method: 'DELETE' });
  await loadVault();
}

// One click / change handler for the whole list (rows are re-rendered, so we listen on the parent).
const content = document.getElementById('content');

content.onclick = (event) => {
  const fetchBtn = event.target.closest('[data-fetch]');
  const removeBtn = event.target.closest('[data-remove]');
  if (fetchBtn) fetchFromDigiLocker(fetchBtn.dataset.fetch).catch((err) => alert(err.message));
  if (removeBtn) removeDocument(removeBtn.dataset.remove).catch((err) => alert(err.message));
};

content.onchange = (event) => {
  const input = event.target.closest('[data-upload]');
  if (input?.files[0]) uploadFile(input.dataset.upload, input.files[0]).catch((err) => alert(err.message));
};

api('/api/schemes/fields')
  .then((defs) => {
    for (const def of defs) fieldLabels[def.key] = def.label;
    return loadVault();
  })
  .catch(showError);

