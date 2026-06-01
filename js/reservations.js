// YardBoss — reservations.js  |  Full Tenants & Reservations functionality

var AVATAR_COLORS = ['#0f1e3c','#00b4a0','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#22c55e','#ec4899','#06b6d4','#f97316'];
var currentTab = 'all';
var currentSearch = '';
var _pendingInsuranceDoc = null; // { name, type, data } base64 from file picker
var _panelTenantId = null;       // tenant currently open in slide panel

function getAvatarColor(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

function getFilteredTenants() {
  var list = APP_DATA.tenants.slice();
  if (currentTab !== 'all') list = list.filter(function(t){ return t.status === currentTab; });
  if (currentSearch) {
    var q = currentSearch.toLowerCase();
    list = list.filter(function(t){
      return t.name.toLowerCase().includes(q)
        || t.email.toLowerCase().includes(q)
        || t.company.toLowerCase().includes(q)
        || (t.phone && t.phone.includes(q));
    });
  }
  return list;
}

function updateTabCounts() {
  var counts = { all: APP_DATA.tenants.length, active: 0, pending: 0, past: 0 };
  APP_DATA.tenants.forEach(function(t){ if (counts[t.status] !== undefined) counts[t.status]++; });
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    var tab = btn.dataset.tab;
    var badge = btn.querySelector('.tab-count');
    if (badge && counts[tab] !== undefined) badge.textContent = counts[tab];
  });
}

function renderTenantsTable() {
  var tbody = document.getElementById('tenantsTbody');
  if (!tbody) return;
  var list = getFilteredTenants();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-users"></i><p>No tenants found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(t) {
    var globalIdx = APP_DATA.tenants.indexOf(t);
    var color = getAvatarColor(globalIdx);
    var regBadge = t.registrationStatus === 'verified'
      ? '<span class="badge badge-green"><i class="fas fa-check-circle" style="margin-right:3px;font-size:0.65rem;"></i>Verified</span>'
      : '<span class="badge badge-yellow"><i class="fas fa-clock" style="margin-right:3px;font-size:0.65rem;"></i>Pending</span>';
    var stBadge = t.status === 'active'
      ? '<span class="badge badge-green">Active</span>'
      : t.status === 'pending'
        ? '<span class="badge badge-yellow">Pending</span>'
        : '<span class="badge badge-gray">Past</span>';
    var autopayBadge = t.paymentMethod === 'autopay'
      ? ' <span class="badge badge-teal" style="font-size:0.65rem;"><i class="fas fa-credit-card" style="margin-right:2px;"></i>AutoPay</span>'
      : '';
    return '<tr style="cursor:pointer;" onclick="openTenantPanel(\''+t.id+'\')">'
      +'<td><div style="display:flex;align-items:center;gap:10px;">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:'+color+';color:white;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;flex-shrink:0;">'+t.initials+'</div>'
      +'<div><div style="font-weight:600;color:var(--navy);">'+t.name+'</div><div style="font-size:0.75rem;color:var(--gray-400);">'+t.company+'</div></div>'
      +'</div></td>'
      +'<td>'+regBadge+'</td>'
      +'<td style="font-size:0.82rem;"><a href="mailto:'+t.email+'" style="color:var(--teal);text-decoration:none;" onclick="event.stopPropagation()">'+t.email+'</a></td>'
      +'<td style="font-size:0.82rem;white-space:nowrap;">'+t.phone+'</td>'
      +'<td style="font-size:0.82rem;">'+getLotName(t.lotId)+'</td>'
      +'<td>'+stBadge+'</td>'
      +'<td style="font-size:0.82rem;"><span class="badge badge-teal">'+formatCurrency(t.monthlyRate)+'/mo</span>'+autopayBadge+'</td>'
      +'<td onclick="event.stopPropagation()">'
      +'<div style="display:flex;gap:5px;">'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="View Details" onclick="openTenantPanel(\''+t.id+'\')"><i class="fas fa-eye"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Send Message" onclick="openMessageModal(\''+t.id+'\')"><i class="fas fa-envelope"></i></button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
}

// ── Tenant Detail Panel ───────────────────────────────────────────────────
function openTenantPanel(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  _panelTenantId = tenantId;
  var globalIndex = APP_DATA.tenants.indexOf(tenant);
  var color = getAvatarColor(globalIndex);
  var lot = getLot(tenant.lotId);

  document.getElementById('panelAvatar').textContent = tenant.initials;
  document.getElementById('panelAvatar').style.background = color;
  document.getElementById('panelName').textContent = tenant.name;

  var statusEl = document.getElementById('panelStatus');
  statusEl.className = 'badge '+(tenant.status==='active'?'badge-green':tenant.status==='pending'?'badge-yellow':'badge-gray');
  statusEl.textContent = tenant.status.charAt(0).toUpperCase()+tenant.status.slice(1);

  document.getElementById('panelEmail').textContent = tenant.email || '—';
  document.getElementById('panelPhone').textContent = tenant.phone || '—';
  document.getElementById('panelCompany').textContent = tenant.company || '—';
  document.getElementById('panelLot').textContent = lot ? lot.name : '—';
  document.getElementById('panelSpace').textContent = tenant.spaceNumber || '—';
  document.getElementById('panelRate').textContent = formatCurrency(tenant.monthlyRate)+'/mo';
  document.getElementById('panelStart').textContent = formatDate(tenant.startDate);
  document.getElementById('panelEnd').textContent = formatDate(tenant.endDate);

  // Vehicle
  if (tenant.vehicle) {
    var vy = tenant.vehicle.year || '';
    var vm = tenant.vehicle.make || '';
    var vmo = tenant.vehicle.model || '';
    document.getElementById('panelVehicle').textContent = [vy, vm, vmo].filter(Boolean).join(' ') || '—';
    document.getElementById('panelVehicleType').textContent = tenant.vehicle.type || '—';
    document.getElementById('panelPlate').textContent = [tenant.vehicle.plate, tenant.plateState].filter(Boolean).join(' ') || '—';
  } else {
    document.getElementById('panelVehicle').textContent = '—';
    document.getElementById('panelVehicleType').textContent = '—';
    document.getElementById('panelPlate').textContent = '—';
  }

  // Equipment
  document.getElementById('panelTruckNumber').textContent = tenant.truckNumber || '—';
  document.getElementById('panelTrailerNumber').textContent = tenant.trailerNumber || '—';
  document.getElementById('panelPlateState').textContent = tenant.plateState || '—';

  // Insurance
  var insPreview = document.getElementById('panelInsurancePreview');
  if (tenant.insuranceDoc && tenant.insuranceDoc.data) {
    var src = 'data:' + tenant.insuranceDoc.type + ';base64,' + tenant.insuranceDoc.data;
    if (tenant.insuranceDoc.type && tenant.insuranceDoc.type.startsWith('image/')) {
      insPreview.innerHTML = '<img src="'+src+'" style="max-width:100%;max-height:90px;border-radius:6px;border:1px solid var(--gray-200);">';
    } else {
      insPreview.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;background:var(--gray-50);border-radius:6px;font-size:0.82rem;"><i class="fas fa-file-pdf" style="color:#ef4444;font-size:1.1rem;"></i>'+(tenant.insuranceDoc.name||'Insurance document')+'</div>';
    }
  } else {
    insPreview.innerHTML = '<span style="font-size:0.8rem;color:var(--gray-400);font-style:italic;">No document uploaded</span>';
  }
  document.getElementById('panelInsurancePolicy').textContent = tenant.insurancePolicyNumber || '—';
  document.getElementById('panelInsuranceCompany').textContent = tenant.insuranceCompany || '—';
  document.getElementById('panelInsuranceExp').textContent = tenant.insuranceExpDate ? formatDate(tenant.insuranceExpDate) : '—';

  // Billing
  var isAutopay = tenant.paymentMethod === 'autopay';
  document.getElementById('panelPaymentMethod').innerHTML = isAutopay
    ? '<span class="badge badge-teal"><i class="fas fa-credit-card" style="margin-right:4px;"></i>Auto-Pay</span>'
    : '<span class="badge badge-gray"><i class="fas fa-money-bill-wave" style="margin-right:4px;"></i>Manual</span>';

  var cardRow = document.getElementById('panelAutopayCardRow');
  var nextRow = document.getElementById('panelAutopayNextRow');
  if (isAutopay) {
    cardRow.style.display = '';
    nextRow.style.display = '';
    document.getElementById('panelAutopayCard').textContent = tenant.autopayCard ? '•••• '+tenant.autopayCard : '—';
    document.getElementById('panelAutopayNext').textContent = tenant.autopayNextDate ? formatDate(tenant.autopayNextDate) : '—';
  } else {
    cardRow.style.display = 'none';
    nextRow.style.display = 'none';
  }

  var hasAutoRenew = !!tenant.autoRenew;
  document.getElementById('panelAutoRenew').innerHTML = hasAutoRenew
    ? '<span class="badge badge-green"><i class="fas fa-sync-alt" style="margin-right:4px;"></i>Enabled</span>'
    : '<span class="badge badge-gray">Disabled</span>';
  var renewPeriodRow = document.getElementById('panelRenewalPeriodRow');
  var renewRateRow = document.getElementById('panelRenewalRateRow');
  if (hasAutoRenew) {
    renewPeriodRow.style.display = '';
    renewRateRow.style.display = '';
    document.getElementById('panelRenewalPeriod').textContent = tenant.renewalPeriod
      ? tenant.renewalPeriod.charAt(0).toUpperCase()+tenant.renewalPeriod.slice(1)
      : '—';
    document.getElementById('panelRenewalRate').textContent = tenant.renewalRate
      ? formatCurrency(tenant.renewalRate)+'/period'
      : 'Same as monthly rate';
  } else {
    renewPeriodRow.style.display = 'none';
    renewRateRow.style.display = 'none';
  }

  // Run Auto-Pay button
  var autoPayWrap = document.getElementById('panelRunAutopayWrap');
  autoPayWrap.style.display = isAutopay ? 'block' : 'none';
  document.getElementById('panelRunAutopayBtn').onclick = function() { runAutoPay(tenantId); };

  // Payment history
  var payments = tenant.payments || [];
  var paymentsHtml = payments.map(function(p, pi) {
    var cls = p.status==='paid'?'badge-green':p.status==='late'?'badge-yellow':'badge-red';
    var methodIcon = p.method==='autopay'
      ? '<i class="fas fa-credit-card" style="margin-right:3px;color:var(--teal);font-size:0.7rem;"></i>'
      : '<i class="fas fa-money-bill-wave" style="margin-right:3px;color:var(--gray-400);font-size:0.7rem;"></i>';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
      +'<div style="display:flex;flex-direction:column;gap:2px;">'
      +'<span style="font-size:0.82rem;color:var(--gray-500);">'+formatDate(p.date)+'</span>'
      +'<span style="font-size:0.72rem;color:var(--gray-400);">'+methodIcon+(p.method==='autopay'?'Auto-Pay':'Manual')+'</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:5px;">'
      +'<span style="font-weight:600;font-size:0.875rem;">'+formatCurrency(p.amount)+'</span>'
      +'<span class="badge '+cls+'">'+p.status.charAt(0).toUpperCase()+p.status.slice(1)+'</span>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Print Receipt" onclick="printPaymentReceipt(\''+tenantId+'\','+pi+')"><i class="fas fa-print"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Email Receipt" onclick="emailPaymentReceipt(\''+tenantId+'\','+pi+')"><i class="fas fa-envelope"></i></button>'
      +'</div></div>';
  }).join('');

  document.getElementById('panelPayments').innerHTML = paymentsHtml
    || '<p style="color:var(--gray-400);font-size:0.82rem;padding:8px 0;">No payment history</p>';

  document.getElementById('panelMessageBtn').onclick = function() { openMessageModal(tenantId); };
  document.getElementById('panelEditBtn').onclick = function() { openEditTenantModal(tenantId); };

  document.getElementById('tenantPanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('show');
}

function closeTenantPanel() {
  document.getElementById('tenantPanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('show');
  _panelTenantId = null;
}

// ── Receipt helpers ───────────────────────────────────────────────────────
function printPaymentReceipt(tenantId, paymentIdx) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var payment = tenant.payments[paymentIdx];
  YardBossReceipts.print(tenant, payment);
}

function emailPaymentReceipt(tenantId, paymentIdx) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var payment = tenant.payments[paymentIdx];
  YardBossReceipts.email(tenant, payment);
}

// ── Auto-Pay ──────────────────────────────────────────────────────────────
function runAutoPay(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  if (tenant.paymentMethod !== 'autopay') {
    showToast('This tenant is not set up for auto-pay.', 'error');
    return;
  }
  var btn = document.getElementById('panelRunAutopayBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

  var amount = tenant.renewalRate || tenant.monthlyRate || 0;

  fetch('/api/payments/process-autopay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: tenantId, amount: amount, description: 'Auto-pay for '+tenant.name })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.error) throw new Error(res.error);
    var payment = { date: new Date().toISOString().split('T')[0], amount: amount, status: 'paid', method: 'autopay' };
    tenant.payments.unshift(payment);
    showToast(res.mock ? 'Auto-pay processed (mock mode)' : 'Auto-pay of '+formatCurrency(amount)+' processed', 'success');
    openTenantPanel(tenantId); // refresh panel
  })
  .catch(function(e) { showToast('Auto-pay failed: '+e.message, 'error'); })
  .finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-credit-card"></i> Run Auto-Pay Now'; }
  });
}

// ── Message Modal ─────────────────────────────────────────────────────────
function openMessageModal(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  document.getElementById('msgToName').textContent = tenant.name;
  document.getElementById('msgToEmail').textContent = tenant.email;
  document.getElementById('msgSubject').value = '';
  document.getElementById('msgBody').value = '';
  document.getElementById('sendMsgBtn').dataset.tenantId = tenantId;
  document.getElementById('msgModal').classList.add('open');
}

function sendMessage() {
  var subject = document.getElementById('msgSubject').value.trim();
  var body    = document.getElementById('msgBody').value.trim();
  if (!subject || !body) { showToast('Please fill in subject and message.','error'); return; }
  var tenantId = document.getElementById('sendMsgBtn').dataset.tenantId;
  var tenant = getTenant(tenantId);
  showToast('Message sent to '+tenant.name+' ('+tenant.email+')','success');
  document.getElementById('msgModal').classList.remove('open');
}

// ── Insurance File Handling ───────────────────────────────────────────────
function handleInsuranceFileChange(e) {
  var file = e.target.files[0];
  if (!file) return;
  var fileName = document.getElementById('atInsuranceFileName');
  var preview  = document.getElementById('atInsurancePreview');
  var scanBtn  = document.getElementById('atScanBtn');
  fileName.textContent = file.name;

  var reader = new FileReader();
  reader.onload = function(ev) {
    var base64 = ev.target.result.split(',')[1];
    _pendingInsuranceDoc = { name: file.name, type: file.type, data: base64 };
    if (file.type.startsWith('image/')) {
      preview.innerHTML = '<img src="'+ev.target.result+'" style="max-width:100%;max-height:110px;border-radius:6px;border:1px solid var(--gray-200);">';
    } else {
      preview.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;background:var(--gray-50);border-radius:6px;font-size:0.82rem;"><i class="fas fa-file-pdf" style="color:#ef4444;font-size:1.1rem;"></i>'+file.name+'</div>';
    }
    if (scanBtn) scanBtn.style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

function scanInsurance() {
  if (!_pendingInsuranceDoc) { showToast('Please select an insurance file first.', 'error'); return; }
  var btn = document.getElementById('atScanBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...'; }

  fetch('/api/scan-insurance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData: _pendingInsuranceDoc.data, mimeType: _pendingInsuranceDoc.type })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.error) throw new Error(res.error);
    if (res.policyNumber)     document.getElementById('atInsurancePolicy').value = res.policyNumber;
    if (res.insuranceCompany) document.getElementById('atInsuranceCompany').value = res.insuranceCompany;
    if (res.expirationDate) {
      var d = new Date(res.expirationDate);
      document.getElementById('atInsuranceExpDate').value = !isNaN(d)
        ? d.toISOString().split('T')[0]
        : res.expirationDate;
    }
    showToast('Insurance scanned \u2713 \u2014 fields auto-filled', 'success');
  })
  .catch(function(e) { showToast('Scan failed: '+e.message, 'error'); })
  .finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Scan &amp; Auto-Fill'; }
  });
}

// ── Add Tenant Modal ──────────────────────────────────────────────────────
function clearInsuranceFields() {
  _pendingInsuranceDoc = null;
  document.getElementById('atInsuranceFile').value = '';
  document.getElementById('atInsuranceFileName').textContent = 'No file selected';
  document.getElementById('atInsurancePreview').innerHTML = '';
  document.getElementById('atScanBtn').style.display = 'none';
}

function openAddTenantModal() {
  document.getElementById('addTenantForm').reset();
  document.getElementById('addTenantForm').dataset.tenantId = '';
  document.getElementById('addTenantModalTitle').textContent = 'Add New Tenant';
  var lotSel = document.getElementById('atLotId');
  lotSel.innerHTML = APP_DATA.lots.map(function(l){ return '<option value="'+l.id+'">'+l.name+'</option>'; }).join('');
  clearInsuranceFields();
  document.getElementById('atAutoRenewFields').style.display = 'none';
  document.getElementById('atAutopayFields').style.display = 'none';
  document.getElementById('addTenantModal').classList.add('open');
}

function openEditTenantModal(tenantId) {
  var t = getTenant(tenantId);
  if (!t) return;
  document.getElementById('addTenantModalTitle').textContent = 'Edit Tenant \u2014 '+t.name;
  var lotSel = document.getElementById('atLotId');
  lotSel.innerHTML = APP_DATA.lots.map(function(l){ return '<option value="'+l.id+'"'+(l.id===t.lotId?' selected':'')+'>'+l.name+'</option>'; }).join('');

  // Basic fields
  document.getElementById('atName').value    = t.name || '';
  document.getElementById('atEmail').value   = t.email || '';
  document.getElementById('atPhone').value   = t.phone || '';
  document.getElementById('atCompany').value = t.company || '';
  document.getElementById('atSpace').value   = t.spaceNumber || '';
  document.getElementById('atRate').value    = t.monthlyRate || '';
  document.getElementById('atStart').value   = t.startDate || '';
  document.getElementById('atEnd').value     = t.endDate || '';
  document.getElementById('atStatus').value  = t.status || 'active';

  // Vehicle
  document.getElementById('atVehicleMake').value  = t.vehicle ? (t.vehicle.make || '') : '';
  document.getElementById('atVehicleModel').value = t.vehicle ? (t.vehicle.model || '') : '';
  document.getElementById('atVehicleYear').value  = t.vehicle ? (t.vehicle.year || '') : '';
  document.getElementById('atVehiclePlate').value = t.vehicle ? (t.vehicle.plate || '') : '';
  document.getElementById('atVehicleType').value  = t.vehicle ? (t.vehicle.type || 'Semi Truck') : 'Semi Truck';
  document.getElementById('atPlateState').value   = t.plateState || '';

  // Equipment
  document.getElementById('atTruckNumber').value   = t.truckNumber || '';
  document.getElementById('atTrailerNumber').value = t.trailerNumber || '';

  // Insurance
  clearInsuranceFields();
  if (t.insuranceDoc && t.insuranceDoc.data) {
    _pendingInsuranceDoc = t.insuranceDoc;
    document.getElementById('atInsuranceFileName').textContent = t.insuranceDoc.name || 'Existing document';
    document.getElementById('atScanBtn').style.display = 'inline-flex';
    var src = 'data:'+t.insuranceDoc.type+';base64,'+t.insuranceDoc.data;
    if (t.insuranceDoc.type && t.insuranceDoc.type.startsWith('image/')) {
      document.getElementById('atInsurancePreview').innerHTML = '<img src="'+src+'" style="max-width:100%;max-height:110px;border-radius:6px;border:1px solid var(--gray-200);">';
    } else {
      document.getElementById('atInsurancePreview').innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;background:var(--gray-50);border-radius:6px;font-size:0.82rem;"><i class="fas fa-file-pdf" style="color:#ef4444;font-size:1.1rem;"></i>'+(t.insuranceDoc.name||'Insurance document')+'</div>';
    }
  }
  document.getElementById('atInsurancePolicy').value    = t.insurancePolicyNumber || '';
  document.getElementById('atInsuranceCompany').value   = t.insuranceCompany || '';
  document.getElementById('atInsuranceExpDate').value   = t.insuranceExpDate || '';

  // Auto-Renewal
  document.getElementById('atAutoRenew').checked = !!t.autoRenew;
  document.getElementById('atAutoRenewFields').style.display = t.autoRenew ? 'block' : 'none';
  document.getElementById('atRenewalPeriod').value = t.renewalPeriod || 'monthly';
  document.getElementById('atRenewalRate').value   = t.renewalRate || '';

  // Payment Method
  document.getElementById('atPaymentMethod').value = t.paymentMethod || 'manual';
  document.getElementById('atAutopayFields').style.display = t.paymentMethod === 'autopay' ? 'block' : 'none';
  document.getElementById('atAutopayCard').value      = t.autopayCard || '';
  document.getElementById('atAutopayNextDate').value  = t.autopayNextDate || '';

  document.getElementById('addTenantForm').dataset.tenantId = tenantId;
  document.getElementById('addTenantModal').classList.add('open');
}

function handleAddTenantSubmit(e) {
  e.preventDefault();
  var form   = document.getElementById('addTenantForm');
  var editId = form.dataset.tenantId;

  var name    = document.getElementById('atName').value.trim();
  var email   = document.getElementById('atEmail').value.trim();
  var phone   = document.getElementById('atPhone').value.trim();
  var company = document.getElementById('atCompany').value.trim();
  var lotId   = document.getElementById('atLotId').value;
  var space   = document.getElementById('atSpace').value.trim();
  var rate    = parseFloat(document.getElementById('atRate').value) || 0;
  var start   = document.getElementById('atStart').value;
  var end     = document.getElementById('atEnd').value;
  var status  = document.getElementById('atStatus').value;

  var vMake   = document.getElementById('atVehicleMake').value.trim();
  var vModel  = document.getElementById('atVehicleModel').value.trim();
  var vYear   = parseInt(document.getElementById('atVehicleYear').value) || null;
  var vPlate  = document.getElementById('atVehiclePlate').value.trim();
  var vType   = document.getElementById('atVehicleType').value;
  var plateState = document.getElementById('atPlateState').value;

  var truckNumber   = document.getElementById('atTruckNumber').value.trim() || null;
  var trailerNumber = document.getElementById('atTrailerNumber').value.trim() || null;

  var insuranceDoc          = _pendingInsuranceDoc || null;
  var insurancePolicyNumber = document.getElementById('atInsurancePolicy').value.trim() || null;
  var insuranceCompany      = document.getElementById('atInsuranceCompany').value.trim() || null;
  var insuranceExpDate      = document.getElementById('atInsuranceExpDate').value || null;

  var autoRenew     = document.getElementById('atAutoRenew').checked;
  var renewalPeriod = autoRenew ? document.getElementById('atRenewalPeriod').value : null;
  var renewalRate   = autoRenew ? (parseFloat(document.getElementById('atRenewalRate').value) || null) : null;

  var paymentMethod   = document.getElementById('atPaymentMethod').value;
  var autopayCard     = paymentMethod === 'autopay' ? (document.getElementById('atAutopayCard').value.trim() || null) : null;
  var autopayNextDate = paymentMethod === 'autopay' ? (document.getElementById('atAutopayNextDate').value || null) : null;

  if (!name || !email || !lotId || !space) {
    showToast('Name, email, lot, and space are required.', 'error');
    return;
  }

  var initials = name.split(' ').map(function(p){ return p[0]; }).join('').toUpperCase().slice(0,2);

  if (editId) {
    var t = getTenant(editId);
    if (t) {
      t.name=name; t.email=email; t.phone=phone; t.company=company; t.initials=initials;
      t.lotId=lotId; t.spaceNumber=space; t.monthlyRate=rate;
      t.startDate=start; t.endDate=end; t.status=status;
      t.vehicle={ make:vMake, model:vModel, year:vYear, plate:vPlate, type:vType };
      t.plateState=plateState;
      t.truckNumber=truckNumber; t.trailerNumber=trailerNumber;
      if (insuranceDoc) t.insuranceDoc=insuranceDoc;
      t.insurancePolicyNumber=insurancePolicyNumber;
      t.insuranceCompany=insuranceCompany;
      t.insuranceExpDate=insuranceExpDate;
      t.autoRenew=autoRenew; t.renewalPeriod=renewalPeriod; t.renewalRate=renewalRate;
      t.paymentMethod=paymentMethod; t.autopayCard=autopayCard; t.autopayNextDate=autopayNextDate;
      showToast('Tenant updated: '+name, 'success');
    }
  } else {
    APP_DATA.tenants.push({
      id: generateId('t'), name:name, initials:initials, email:email, phone:phone,
      company:company, lotId:lotId, spaceNumber:space, monthlyRate:rate,
      startDate:start, endDate:end, status:status, registrationStatus:'pending',
      vehicle:{ make:vMake, model:vModel, year:vYear, plate:vPlate, type:vType },
      plateState:plateState, truckNumber:truckNumber, trailerNumber:trailerNumber,
      insuranceDoc:insuranceDoc, insurancePolicyNumber:insurancePolicyNumber,
      insuranceCompany:insuranceCompany, insuranceExpDate:insuranceExpDate,
      autoRenew:autoRenew, renewalPeriod:renewalPeriod, renewalRate:renewalRate,
      paymentMethod:paymentMethod, autopayCard:autopayCard, autopayNextDate:autopayNextDate,
      payments:[]
    });
    fetch('/api/reservations',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ lotId, spaceType:vType, tenantName:name, email, phone, company,
        vehicleMake:vMake, vehicleModel:vModel, vehicleYear:vYear, vehiclePlate:vPlate,
        startDate:start, monthlyRate:rate })
    }).catch(function(){});
    showToast('Tenant added: '+name, 'success');
  }

  document.getElementById('addTenantModal').classList.remove('open');
  updateTabCounts();
  renderTenantsTable();

  // Refresh panel if open for this tenant
  if (_panelTenantId === editId) openTenantPanel(editId);
}

// ── Export tenants CSV ────────────────────────────────────────────────────
function exportTenants() {
  var list = getFilteredTenants();
  exportToCSV(
    ['Name','Email','Phone','Company','Lot','Space','Rate/Mo','Start','End','Status','Truck#','Trailer#','Plate','PlateState','InsurancePolicy','InsuranceCompany','InsuranceExp','AutoRenew','PaymentMethod'],
    list.map(function(t){ return [
      t.name, t.email, t.phone, t.company, getLotName(t.lotId),
      t.spaceNumber, t.monthlyRate, t.startDate, t.endDate, t.status,
      t.truckNumber||'', t.trailerNumber||'',
      (t.vehicle?t.vehicle.plate:''), t.plateState||'',
      t.insurancePolicyNumber||'', t.insuranceCompany||'', t.insuranceExpDate||'',
      t.autoRenew?'Yes':'No', t.paymentMethod||'manual'
    ]; }),
    'tenants-'+currentTab+'.csv'
  );
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  updateTabCounts();
  renderTenantsTable();

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
      currentTab = this.dataset.tab;
      renderTenantsTable();
    });
  });

  // Search
  var search = document.getElementById('tenantSearch');
  if (search) search.addEventListener('input', function() { currentSearch=this.value; renderTenantsTable(); });

  // Panel close
  var closePanel = document.getElementById('closePanelBtn');
  if (closePanel) closePanel.addEventListener('click', closeTenantPanel);
  var overlay = document.getElementById('panelOverlay');
  if (overlay) overlay.addEventListener('click', closeTenantPanel);

  // Add tenant button
  var addBtn = document.getElementById('addTenantBtn');
  if (addBtn) addBtn.addEventListener('click', openAddTenantModal);

  // Add tenant form
  var atForm = document.getElementById('addTenantForm');
  if (atForm) atForm.addEventListener('submit', handleAddTenantSubmit);

  // Close add tenant modal
  document.getElementById('closeAddTenantModal').addEventListener('click', function(){ document.getElementById('addTenantModal').classList.remove('open'); });
  document.getElementById('cancelAddTenantModal').addEventListener('click', function(){ document.getElementById('addTenantModal').classList.remove('open'); });
  document.getElementById('addTenantModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });

  // Auto-renew toggle
  document.getElementById('atAutoRenew').addEventListener('change', function() {
    document.getElementById('atAutoRenewFields').style.display = this.checked ? 'block' : 'none';
  });

  // Payment method toggle
  document.getElementById('atPaymentMethod').addEventListener('change', function() {
    document.getElementById('atAutopayFields').style.display = this.value === 'autopay' ? 'block' : 'none';
  });

  // Insurance file input
  document.getElementById('atInsuranceFile').addEventListener('change', handleInsuranceFileChange);

  // Scan insurance button
  document.getElementById('atScanBtn').addEventListener('click', scanInsurance);

  // Message modal
  document.getElementById('sendMsgBtn').addEventListener('click', sendMessage);
  document.getElementById('closeMsgModal').addEventListener('click', function(){ document.getElementById('msgModal').classList.remove('open'); });
  document.getElementById('cancelMsgModal').addEventListener('click', function(){ document.getElementById('msgModal').classList.remove('open'); });
  document.getElementById('msgModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });

  // Export button
  var exportBtn = document.getElementById('exportTenantsBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportTenants);

  // Import button
  var importBtn = document.getElementById('importTenantsBtn');
  if (importBtn) importBtn.addEventListener('click', function(){ document.getElementById('importModal').classList.add('open'); });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key==='Escape') closeTenantPanel();
  });
});
