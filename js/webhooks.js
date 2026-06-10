// YardBoss — Webhook Notifications (Settings page)

var _whEventTypes = [];
var _whEditingId = null;

function whEventLabel(id) {
  var match = _whEventTypes.find(function (e) { return e.id === id; });
  return match ? match.label : id;
}

function whRenderList(webhooks) {
  var list = document.getElementById('webhookList');
  var empty = document.getElementById('webhookEmpty');
  if (!list) return;

  if (!webhooks.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = webhooks.map(function (w) {
    var badges = (w.events || []).map(function (e) {
      return '<span class="badge badge-gray">' + whEventLabel(e) + '</span>';
    }).join(' ');
    if (!badges) badges = '<span class="badge badge-yellow">No events selected</span>';

    return '<div class="notif-row" data-id="' + w.id + '">'
      + '<div class="notif-row-info">'
      + '<h4>' + (w.name || w.url) + '</h4>'
      + '<p style="word-break:break-all;">' + w.url + '</p>'
      + '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">' + badges + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
      + '<button class="btn-icon webhook-test-btn" title="Send test event"><i class="fas fa-paper-plane"></i></button>'
      + '<button class="btn-icon webhook-edit-btn" title="Edit"><i class="fas fa-pen"></i></button>'
      + '<button class="btn-icon webhook-delete-btn" title="Delete"><i class="fas fa-trash"></i></button>'
      + '<label class="toggle-switch">'
      + '<input type="checkbox" class="webhook-enabled-toggle" ' + (w.enabled ? 'checked' : '') + '>'
      + '<span class="toggle-slider"></span>'
      + '</label>'
      + '</div>'
      + '</div>';
  }).join('');

  list.querySelectorAll('.notif-row').forEach(function (row) {
    var id = row.dataset.id;

    row.querySelector('.webhook-test-btn').addEventListener('click', function () {
      whTestWebhook(id, this);
    });
    row.querySelector('.webhook-edit-btn').addEventListener('click', function () {
      whOpenModal(webhooks.find(function (w) { return w.id === id; }));
    });
    row.querySelector('.webhook-delete-btn').addEventListener('click', function () {
      whDeleteWebhook(id);
    });
    row.querySelector('.webhook-enabled-toggle').addEventListener('change', function () {
      whToggleEnabled(id, this.checked);
    });
  });
}

async function whLoadAll() {
  try {
    var [eventTypes, webhooks] = await Promise.all([
      fetch('/api/webhooks/event-types').then(function (r) { return r.json(); }),
      fetch('/api/webhooks').then(function (r) { return r.json(); })
    ]);
    _whEventTypes = eventTypes;
    whRenderList(webhooks);
  } catch (err) {
    var list = document.getElementById('webhookList');
    if (list) list.innerHTML = '<div class="empty-state" style="padding:24px 20px;"><i class="fas fa-plug"></i><p>Webhooks unavailable (offline)</p></div>';
  }
}

function whOpenModal(webhook) {
  var form = document.getElementById('webhookForm');
  form.reset();
  _whEditingId = webhook ? webhook.id : null;

  document.getElementById('webhookModalTitle').innerHTML = webhook
    ? '<i class="fas fa-plug" style="margin-right:8px;color:var(--teal);"></i>Edit Webhook'
    : '<i class="fas fa-plug" style="margin-right:8px;color:var(--teal);"></i>Add Webhook';

  document.getElementById('whName').value = webhook ? (webhook.name || '') : '';
  document.getElementById('whUrl').value = webhook ? webhook.url : '';
  document.getElementById('whEnabled').checked = webhook ? !!webhook.enabled : true;

  var eventsContainer = document.getElementById('whEventTypes');
  var selected = webhook ? (webhook.events || []) : [];
  eventsContainer.innerHTML = _whEventTypes.map(function (e) {
    var checked = selected.indexOf(e.id) !== -1 ? 'checked' : '';
    return '<label style="display:flex;align-items:flex-start;gap:8px;font-weight:400;cursor:pointer;">'
      + '<input type="checkbox" value="' + e.id + '" class="wh-event-checkbox" style="margin-top:3px;" ' + checked + '>'
      + '<span><strong style="font-size:0.85rem;color:var(--navy);">' + e.label + '</strong><br>'
      + '<span style="font-size:0.75rem;color:var(--gray-500);">' + e.description + '</span></span>'
      + '</label>';
  }).join('');

  document.getElementById('webhookModal').classList.add('open');
}

function whCloseModal() {
  document.getElementById('webhookModal').classList.remove('open');
  _whEditingId = null;
}

async function whHandleSubmit(e) {
  e.preventDefault();
  var name = document.getElementById('whName').value.trim();
  var url = document.getElementById('whUrl').value.trim();
  var enabled = document.getElementById('whEnabled').checked;
  var events = Array.from(document.querySelectorAll('.wh-event-checkbox:checked')).map(function (cb) { return cb.value; });

  if (!url) { showToast('Please enter an endpoint URL.', 'error'); return; }

  var payload = { name: name, url: url, enabled: enabled, events: events };

  try {
    if (_whEditingId) {
      await fetch('/api/webhooks/' + _whEditingId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { if (!r.ok) throw new Error('Save failed'); return r.json(); });
      showToast('Webhook updated', 'success');
    } else {
      await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { if (!r.ok) throw new Error('Save failed'); return r.json(); });
      showToast('Webhook added', 'success');
    }
    whCloseModal();
    whLoadAll();
  } catch (err) {
    showToast('Could not save webhook', 'error');
  }
}

async function whToggleEnabled(id, enabled) {
  try {
    await fetch('/api/webhooks/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: enabled })
    });
    showToast(enabled ? 'Webhook enabled' : 'Webhook disabled', 'success');
  } catch (err) {
    showToast('Could not update webhook', 'error');
    whLoadAll();
  }
}

async function whDeleteWebhook(id) {
  if (!confirm('Delete this webhook? This cannot be undone.')) return;
  try {
    await fetch('/api/webhooks/' + id, { method: 'DELETE' });
    showToast('Webhook deleted', 'success');
    whLoadAll();
  } catch (err) {
    showToast('Could not delete webhook', 'error');
  }
}

async function whTestWebhook(id, btn) {
  var icon = btn.querySelector('i');
  var originalClass = icon.className;
  icon.className = 'fas fa-spinner fa-spin';
  btn.disabled = true;

  try {
    var res = await fetch('/api/webhooks/' + id + '/test', { method: 'POST' });
    var result = await res.json();
    if (result.ok) {
      showToast('Test event delivered (HTTP ' + result.status + ')', 'success');
    } else {
      showToast('Test failed: ' + (result.error || ('HTTP ' + result.status)), 'error');
    }
  } catch (err) {
    showToast('Could not send test event', 'error');
  } finally {
    icon.className = originalClass;
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('webhookList')) return;

  whLoadAll();

  document.getElementById('addWebhookBtn').addEventListener('click', function () { whOpenModal(null); });
  document.getElementById('closeWebhookModal').addEventListener('click', whCloseModal);
  document.getElementById('cancelWebhookModal').addEventListener('click', whCloseModal);
  document.getElementById('webhookModal').addEventListener('click', function (e) { if (e.target === this) whCloseModal(); });
  document.getElementById('webhookForm').addEventListener('submit', whHandleSubmit);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('webhookModal');
      if (modal && modal.classList.contains('open')) whCloseModal();
    }
  });
});
