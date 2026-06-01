// YardBoss — Receipt Generator
// Generates printable/emailable receipts for tenant payments.
// Usage: receipts.print(tenant, payment) | receipts.email(tenant, payment)

var YardBossReceipts = (function() {
  'use strict';

  var OWNER = {
    name: 'Toby Herndon',
    business: 'TransVega RV and Truck Center',
    address: '7406 HWY 27 North',
    city: 'Sebring, FL 33870',
    phone: '(863) 441-3444',
    email: 'toby@transvegalogistics.com'
  };

  function padLeft(n, len) {
    return String(n).padStart(len, '0');
  }

  function receiptNumber() {
    var now = new Date();
    var date = now.getFullYear().toString()
      + padLeft(now.getMonth()+1, 2)
      + padLeft(now.getDate(), 2);
    var rand = padLeft(Math.floor(Math.random()*9000)+1000, 4);
    return 'RCP-' + date + '-' + rand;
  }

  function formatD(str) {
    if (!str) return '—';
    var d = new Date(str.includes('T') ? str : str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  }

  function fmtCurrency(n) {
    if (!n && n!==0) return '$0.00';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  }

  function generateHTML(tenant, payment, opts) {
    opts = opts || {};
    var rcp = opts.receiptNumber || receiptNumber();
    var now = new Date();
    var dateStr = now.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
    var timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    var lot = (typeof getLot === 'function' && tenant.lotId) ? getLot(tenant.lotId) : null;
    var lotName = lot ? lot.name : 'TransVega RV and Truck Center';
    var serviceStart = tenant.startDate || '';
    var serviceEnd   = tenant.endDate || '';
    var amount = payment ? payment.amount : (tenant.monthlyRate || 0);
    var method = payment ? (payment.method || 'Manual') : 'Manual';
    var payStatus = payment ? (payment.status || 'paid') : 'paid';
    var methodLabel = method === 'autopay' ? 'Auto-Pay (Card on file)' : method.charAt(0).toUpperCase() + method.slice(1);

    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<style>' +
      'body{font-family:Inter,Arial,sans-serif;color:#1e293b;margin:0;padding:0;background:#f8fafc;}' +
      '.receipt{max-width:600px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}' +
      '.receipt-header{background:#0f1e3c;color:#fff;padding:28px 32px;}' +
      '.receipt-header .logo{font-size:1.3rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;}' +
      '.receipt-header .logo span{color:#00b4a0;}' +
      '.receipt-header .sub{font-size:0.78rem;color:rgba(255,255,255,0.6);margin-top:2px;}' +
      '.receipt-meta{display:flex;justify-content:space-between;padding:18px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:0.82rem;}' +
      '.receipt-meta .label{color:#64748b;margin-bottom:2px;}' +
      '.receipt-meta .val{font-weight:700;color:#0f1e3c;}' +
      '.receipt-body{padding:24px 32px;}' +
      '.section-title{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;margin-bottom:10px;margin-top:20px;}' +
      '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}' +
      '.info-row{display:flex;flex-direction:column;gap:2px;font-size:0.82rem;}' +
      '.info-row .lbl{color:#64748b;font-size:0.72rem;}' +
      '.info-row .val{font-weight:600;color:#0f1e3c;}' +
      '.line-items{margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}' +
      '.line-item{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:0.85rem;}' +
      '.line-item:last-child{border-bottom:none;}' +
      '.line-item.total{background:#f8fafc;font-weight:800;font-size:0.95rem;color:#0f1e3c;}' +
      '.badge-paid{display:inline-block;background:#d1fae5;color:#065f46;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:0.5px;}' +
      '.badge-overdue{display:inline-block;background:#fee2e2;color:#991b1b;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:0.5px;}' +
      '.receipt-footer{text-align:center;padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:0.78rem;color:#94a3b8;}' +
      '@media print{body{background:#fff;}.receipt{box-shadow:none;border:none;margin:0;border-radius:0;}}' +
      '</style></head><body>' +
      '<div class="receipt">' +
      '<div class="receipt-header">' +
      '<div class="logo">Yard<span>Boss</span></div>' +
      '<div class="sub">' + OWNER.business + ' &nbsp;|&nbsp; ' + OWNER.address + ', ' + OWNER.city + '</div>' +
      '<div class="sub">' + OWNER.phone + ' &nbsp;|&nbsp; ' + OWNER.email + '</div>' +
      '</div>' +
      '<div class="receipt-meta">' +
      '<div><div class="label">Receipt Number</div><div class="val">' + rcp + '</div></div>' +
      '<div><div class="label">Date / Time</div><div class="val">' + dateStr + ' at ' + timeStr + '</div></div>' +
      '<div><div class="label">Payment Status</div><div class="val">' +
        (payStatus === 'paid' ? '<span class="badge-paid">Paid</span>' : '<span class="badge-overdue">Overdue</span>') +
      '</div></div>' +
      '</div>' +
      '<div class="receipt-body">' +

      '<div class="section-title">Tenant</div>' +
      '<div class="info-grid">' +
      '<div class="info-row"><span class="lbl">Name</span><span class="val">' + (tenant.name||'—') + '</span></div>' +
      '<div class="info-row"><span class="lbl">Company</span><span class="val">' + (tenant.company||'—') + '</span></div>' +
      (tenant.truckNumber ? '<div class="info-row"><span class="lbl">Truck #</span><span class="val">' + tenant.truckNumber + '</span></div>' : '') +
      (tenant.trailerNumber ? '<div class="info-row"><span class="lbl">Trailer #</span><span class="val">' + tenant.trailerNumber + '</span></div>' : '') +
      '<div class="info-row"><span class="lbl">License Plate</span><span class="val">' + ((tenant.vehicle&&tenant.vehicle.plate)||'—') + ' ' + (tenant.plateState||'') + '</span></div>' +
      '<div class="info-row"><span class="lbl">Email</span><span class="val">' + (tenant.email||'—') + '</span></div>' +
      '</div>' +

      '<div class="section-title">Spot Assignment</div>' +
      '<div class="info-grid">' +
      '<div class="info-row"><span class="lbl">Facility</span><span class="val">' + lotName + '</span></div>' +
      '<div class="info-row"><span class="lbl">Space #</span><span class="val">' + (tenant.spaceNumber||'—') + '</span></div>' +
      '<div class="info-row"><span class="lbl">Service Period</span><span class="val">' + formatD(serviceStart) + ' — ' + formatD(serviceEnd) + '</span></div>' +
      '<div class="info-row"><span class="lbl">Payment Method</span><span class="val">' + methodLabel + '</span></div>' +
      '</div>' +

      '<div class="section-title">Charges</div>' +
      '<div class="line-items">' +
      '<div class="line-item"><span>Monthly Parking — Space ' + (tenant.spaceNumber||'') + '</span><span>' + fmtCurrency(amount) + '</span></div>' +
      '<div class="line-item total"><span>Total Paid</span><span>' + fmtCurrency(amount) + '</span></div>' +
      '</div>' +

      '</div>' +
      '<div class="receipt-footer">Thank you for your business — YardBoss by TransVega &nbsp;·&nbsp; ' + OWNER.phone + '</div>' +
      '</div>' +
      '</body></html>';
  }

  // ── Print a receipt (opens browser print dialog via hidden iframe) ─────────
  function print(tenant, payment, opts) {
    var html = generateHTML(tenant, payment, opts);
    var printFrame = document.getElementById('yb-receipt-frame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'yb-receipt-frame';
      printFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(printFrame);
    }
    printFrame.srcdoc = html;
    printFrame.onload = function() {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch(e) { window.print(); }
    };
  }

  // ── Show receipt in a modal for preview ───────────────────────────────────
  function preview(tenant, payment, opts) {
    var html = generateHTML(tenant, payment, opts);
    var modalId = 'receiptPreviewModal';
    var existing = document.getElementById(modalId);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = modalId;
      existing.className = 'modal-backdrop';
      existing.innerHTML =
        '<div class="modal" style="max-width:660px;padding:0;overflow:hidden;">' +
          '<div class="modal-header" style="padding:14px 20px;">' +
            '<h3 class="modal-title"><i class="fas fa-receipt" style="margin-right:8px;color:var(--teal);"></i>Receipt Preview</h3>' +
            '<div style="display:flex;gap:8px;">' +
              '<button class="btn btn-secondary btn-sm" id="rcpPrintBtn"><i class="fas fa-print"></i> Print</button>' +
              '<button class="btn btn-primary btn-sm" id="rcpEmailBtn"><i class="fas fa-envelope"></i> Email</button>' +
              '<button class="modal-close" id="rcpCloseBtn"><i class="fas fa-times"></i></button>' +
            '</div>' +
          '</div>' +
          '<div id="rcpIframeWrap" style="height:520px;overflow:hidden;">' +
            '<iframe id="rcpIframe" style="width:100%;height:100%;border:none;" sandbox="allow-same-origin"></iframe>' +
          '</div>' +
        '</div>';
      document.body.appendChild(existing);

      document.getElementById('rcpCloseBtn').addEventListener('click', function() {
        existing.classList.remove('open');
      });
      existing.addEventListener('click', function(e) {
        if (e.target === existing) existing.classList.remove('open');
      });
    }

    // Store current tenant/payment on modal for email button
    existing.dataset.tenantId = tenant.id || '';
    existing.dataset.paymentIdx = '0';

    var iframe = document.getElementById('rcpIframe');
    iframe.srcdoc = html;

    document.getElementById('rcpPrintBtn').onclick = function() { print(tenant, payment, opts); };
    document.getElementById('rcpEmailBtn').onclick = function() { email(tenant, payment, opts); };

    existing.classList.add('open');
  }

  // ── Email receipt via backend ─────────────────────────────────────────────
  function email(tenant, payment, opts) {
    if (!tenant.email) { showToast('No email address on file for this tenant.', 'error'); return; }
    opts = opts || {};
    var html = generateHTML(tenant, payment, opts);
    var subject = 'Your Receipt — TransVega RV & Truck Center';
    var btn = document.getElementById('rcpEmailBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; }

    fetch('/api/send-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: tenant.email, tenantName: tenant.name, subject: subject, html: html })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.error) throw new Error(res.error);
      showToast(res.mock
        ? 'Receipt logged (SMTP not configured — see server console)'
        : 'Receipt emailed to ' + tenant.email, 'success');
    })
    .catch(function(e) { showToast('Email failed: ' + e.message, 'error'); })
    .finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-envelope"></i> Email'; }
    });
  }

  return { print: print, preview: preview, email: email, generateHTML: generateHTML };
}());
