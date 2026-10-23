const log = document.getElementById('content');

function addBubble(role, text) {
  log.insertAdjacentHTML('beforeend', `<p class="${role}">${esc(text)}</p>`);
  log.scrollTop = log.scrollHeight;
}

document.getElementById('chatForm').onsubmit = async (event) => {
  event.preventDefault();
  const input = document.getElementById('message');
  const message = input.value.trim();
  input.value = '';
  addBubble('user', message);

  try {
    const { reply } = await api('/api/chat', { method: 'POST', json: { message } });
    addBubble('assistant', reply);
  } catch (err) {
    addBubble('assistant', 'Sorry, something went wrong: ' + err.message);
  }
};

document.getElementById('clearBtn').onclick = async () => {
  await api('/api/chat/history', { method: 'DELETE' });
  log.innerHTML = '';
};

api('/api/chat/history')
  .then((messages) => messages.forEach((m) => addBubble(m.role, m.content)))
  .catch(showError);

