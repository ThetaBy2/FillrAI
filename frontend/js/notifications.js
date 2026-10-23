// A notification's "link" is a page name ("track", "documents") or a scheme id.
function linkTarget(link) {
  if (!link) return '';
  if (link === 'track' || link === 'documents') return link + '.html';
  return 'scheme.html?id=' + encodeURIComponent(link);
}

async function loadNotifications() {
  const list = await api('/api/notifications');
  document.getElementById('content').innerHTML =
    list
      .map(
        (n) => `
      <div class="item ${n.is_read ? '' : 'unread'}" style="cursor: pointer" data-id="${n.id}" data-href="${linkTarget(n.link)}">
        <div>
          <b>${esc(n.title)}</b>
          <div class="muted">${esc(n.body)}</div>
        </div>
        <span class="tag">${esc(n.kind)}</span>
      </div>`,
      )
      .join('') || '<p class="muted">No notifications.</p>';
}

// Click a notification: mark it read, then open what it points to.
document.getElementById('content').onclick = async (event) => {
  const row = event.target.closest('[data-id]');
  if (!row) return;
  await api(`/api/notifications/${row.dataset.id}/read`, { method: 'POST' });
  if (row.dataset.href) location.href = row.dataset.href;
  else await loadNotifications();
};

document.getElementById('readAllBtn').onclick = async () => {
  await api('/api/notifications/read-all', { method: 'POST' });
  await loadNotifications();
};

loadNotifications().catch(showError);

