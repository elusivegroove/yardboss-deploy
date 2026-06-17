/**
 * YardBoss — SMS Templates UI (Settings page)
 * Loads templates from /api/sms-templates, renders editable rows,
 * and saves customized bodies back on "Save Templates".
 */

(function () {
  'use strict';

  var TEMPLATE_LABELS = {
    gate_code:          'Gate Code',
    renewal_30:         '30-Day Renewal Reminder',
    renewal_7:          '7-Day Renewal Reminder',
    payment_received:   'Payment Received',
    payment_past_due:   'Payment Past Due',
    welcome:            'Welcome / Move-In',
    moveout_reminder:   'Move-Out Reminder',
    insurance_expiring: 'Insurance Expiring',
  };

  var container = document.getElementById('smsTemplatesList');
  var saveBtn   = document.getElementById('saveSmsTemplatesBtn');
  var savedMsg  = document.getElementById('smsTplSavedMsg');

  if (!container) return; // not on settings page

  // ── Load & render ────────────────────────────────────────────────────────

  function renderTemplates(templates) {
    container.innerHTML = '';
    Object.keys(TEMPLATE_LABELS).forEach(function (key) {
      var tpl = templates[key];
      if (!tpl) return;

      var varPills = (tpl.vars || []).map(function (v) {
        return '<code style="background:var(--gray-100);border:1px solid var(--gray-200);padding:1px 6px;border-radius:4px;font-size:0.72rem;color:var(--navy);">{{' + v + '}}</code>';
      }).join(' ');

      var row = document.createElement('div');
      row.style.cssText = 'border:1px solid var(--gray-200);border-radius:8px;padding:14px 16px;';
      row.innerHTML = [
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:12px;">',
          '<div>',
            '<div style="font-size:0.85rem;font-weight:700;color:var(--navy);margin-bottom:4px;">' + tpl.name + '</div>',
            '<div style="display:flex;gap:4px;flex-wrap:wrap;">' + varPills + '</div>',
          '</div>',
          '<span class="sms-tpl-charcount" style="font-size:0.72rem;color:var(--gray-400);white-space:nowrap;padding-top:2px;">0 / 160</span>',
        '</div>',
        '<textarea data-key="' + key + '" rows="3" style="width:100%;resize:vertical;padding:10px;border:1px solid var(--gray-200);border-radius:6px;font-family:Inter,sans-serif;font-size:0.82rem;line-height:1.5;box-sizing:border-box;">' + escapeHtml(tpl.body) + '</textarea>',
      ].join('');

      var textarea  = row.querySelector('textarea');
      var charCount = row.querySelector('.sms-tpl-charcount');
      updateCharCount(textarea, charCount);
      textarea.addEventListener('input', function () { updateCharCount(textarea, charCount); });

      container.appendChild(row);
    });
  }

  function updateCharCount(textarea, el) {
    var len = textarea.value.length;
    var segs = Math.ceil(len / 160) || 1;
    el.textContent = len + ' / 160' + (segs > 1 ? ' (' + segs + ' segments)' : '');
    el.style.color = len > 160 ? '#dc2626' : 'var(--gray-400)';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch('/api/sms-templates')
    .then(function (r) { return r.json(); })
    .then(renderTemplates)
    .catch(function (err) {
      container.innerHTML = '<p style="color:#dc2626;font-size:0.85rem;">Failed to load SMS templates: ' + err.message + '</p>';
    });

  // ── Save ─────────────────────────────────────────────────────────────────

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var textareas = container.querySelectorAll('textarea[data-key]');
      var payload = {};
      textareas.forEach(function (ta) {
        payload[ta.dataset.key] = { body: ta.value.trim() };
      });

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      fetch('/api/sms-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          savedMsg.style.display = 'flex';
          setTimeout(function () { savedMsg.style.display = 'none'; }, 3000);
        })
        .catch(function (err) {
          alert('Failed to save templates: ' + err.message);
        })
        .finally(function () {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Templates';
        });
    });
  }
})();
