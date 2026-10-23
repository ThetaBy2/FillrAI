async function loadSettings() {
  const [user, vault] = await Promise.all([api('/api/auth/me'), api('/api/documents/vault')]);
  document.getElementById('fullName').value = user.full_name;
  document.getElementById('phone').value = user.phone || '';
  document.getElementById('email').value = user.email;
  document.getElementById('content').textContent = JSON.stringify(vault.profile, null, 2);
}

document.getElementById('accountForm').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await api('/api/auth/me', {
      method: 'PATCH',
      json: {
        full_name: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim() || null,
      },
    });
    document.getElementById('savedMsg').hidden = false;
  } catch (err) {
    alert(err.message);
  }
};

loadSettings().catch(showError);

