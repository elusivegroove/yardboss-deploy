/**
 * YardBoss — SMS Templates UI (Settings page)
 * Loads templates from /api/sms-templates, renders editable rows,
 * and saves customized bodies back on "Save Templates".
 * Each row has a Test button that sends a live SMS with demo data.
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

  // Demo variable values used when sending a test SMS
  var DEMO_VARS = {
    gate_code:          { name: 'Test', gate_code: '1234', period: 'July 2026' },
    renewal_30:         { name: 'Test', space: 'R-01', renewal_date: '08/01/2026' },
    renewal_7:          { name: 'Test', space: 'R-01', renewal_date: '08/01/2026' },
    payment_received:   { name: 'Test', space: 'R-01', amount: '350.00' },
    payment_past_due:   { name: 'Test', space: 'R-01', amount: '350.00' },
    welcome:            { name: 'Test', space: 'R-01', gate_code: '1234' },
    moveout_reminder:   { name: 'Test', space: 'R-01', moveout_date: '08/01/2026' },
    insurance_expiring: { name: 'Test', expiry_date: '08/01/2026' },
  };

  var container = document.getElementById('smsTemplatesList');
  var saveBtn   = document.getElementById('saveSmsTemplatesBtn');
  var savedMsg  = document.getElementById('smsTplSavedMsg');

  if (!container) return; // not on settings page

  // ── Test SMS Modal ───────────────────────────────────────────────────────
  var testModal = document.createElement('div');
  testModal.className = 'modal-backdrop';
  testModal.id = 'smsTestModal';
  testModal.innerHTML = [
    '<div class="modal" style="max-width:420px;">',
      '<div class="modal-header">',
        '<h3 class="modal-title"><i class="fas fa-paper-plane" style="margin-right:8px;color:var(--teal);"></i>Test SMS — <span id="smsTestTplName"></span></h3>',
        '<button class="modal-close" id="closeSmsTestModal"><i class="fas fa-times"></i></button>',
      '</div>',
      '<div style="padding:20px;">',
        '<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.82rem;color:var(--gray-600);line-height:1.55;" id="smsTestPreview"></div>',
        '<div class="form-group" style="margin-bottom:0;">',
          '<label>Send test to</label>',
          '<input type="tel" id="smsTestPhone" placeholder="(863) 555-0100" style="font-size:1rem;">',
          '<span style="display:block;font-size:0.72rem;color:var(--gray-400);margin-top:4px;">Enter any number — variables are filled with sample data.</span>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-100);">',
          '<button id="smsTestSendBtn" class="btn-primary" style="min-width:120px;"><i class="fas fa-paper-plane"></i> Send Test</button>',
          '<span id="smsTestFeedback" style="font-size:0.82rem;"></span>',
        '</div>',
      '</div>',
    '</div>',
  ].join('');
  document.body.appendChild(testModal);

  var _testKey = null;

  function openTestModal(key, tplName, bodyText) {
    _testKey = key;
    document.getElementById('smsTestTplName').textContent = tplName;
    document.getElementById('smsTestPreview').textContent = bodyText;
    document.getElementById('smsTestFeedback').textContent = '';
    document.getElementById('smsTestSendBtn').disabled = false;
    document.getElementById('smsTestSendBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Send Test';
    testModal.classList.add('open');
    setTimeout(function () { document.getElementById('smsTestPhone').focus(); }, 80);
  }

  function closeTestModal() {
    testModal.classList.remove('open');
    _testKey = null;
  }

  document.getElementById('closeSmsTestModal').addEventListener('click', closeTestModal);
  testModal.addEventListener('click', function (e) {
    if (e.target === testModal) closeTestModal();
  });

  document.getElementById('smsTestSendBtn').addEventListener('click', function () {
    var phone = document.getElementById('smsTestPhone').value.trim();
    var feedback = document.getElementById('smsTestFeedback');
    if (!phone) {
      feedback.style.color = '#dc2626';
      feedback.textContent = 'Enter a phone number first.';
      return;
    }
    if (!_testKey) return;

    var btn = document.getElementById('smsTestSendBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    feedback.textContent = '';

    // Get the current body from the textarea (reflects any unsaved edits)
    var ta = container.querySelector('textarea[data-key="' + _testKey + '"]');
    var currentBody = ta ? ta.value.trim() : '';

    // Temporarily use the current (possibly unsaved) body by calling send with vars
    fetch('/api/sms-templates/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: _testKey, to: phone, vars: DEMO_VARS[_testKey] || {} }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.error) throw new Error(res.error);
        feedback.style.color = '#16a34a';
        feedback.innerHTML = res.mock
          ? '<i class="fas fa-info-circle"></i> Mock mode — not sent (no Twilio keys)'
          : '<i class="fas fa-check-circle"></i> Sent to ' + res.to;
        btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
        setTimeout(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Test';
        }, 3000);
      })
      .catch(function (err) {
        feedback.style.color = '#dc2626';
        feedback.textContent = 'Failed: ' + (err.message || 'Unknown error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Test';
      });
  });

  // Allow Enter key in phone input to trigger send
  document.getElementById('smsTestPhone').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('smsTestSendBtn').click();
  });

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
          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">',
            '<span class="sms-tpl-charcount" style="font-size:0.72rem;color:var(--gray-400);white-space:nowrap;padding-top:2px;">0 / 160</span>',
            '<button type="button" class="sms-test-btn btn-secondary" data-key="' + key + '" style="font-size:0.72rem;padding:3px 10px;white-space:nowrap;"><i class="fas fa-paper-plane" style="margin-right:4px;"></i>Test</button>',
          '</div>',
        '</div>',
        '<textarea data-key="' + key + '" rows="3" style="width:100%;resize:vertical;padding:10px;border:1px solid var(--gray-200);border-radius:6px;font-family:Inter,sans-serif;font-size:0.82rem;line-height:1.5;box-sizing:border-box;">' + escapeHtml(tpl.body) + '</textarea>',
      ].join('');

      var textarea  = row.querySelector('textarea');
      var charCount = row.querySelector('.sms-tpl-charcount');
      updateCharCount(textarea, charCount);
      textarea.addEventListener('input', function () { updateCharCount(textarea, charCount); });

      row.querySelector('.sms-test-btn').addEventListener('click', function () {
        openTestModal(key, tpl.name, textarea.value.trim());
      });

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
