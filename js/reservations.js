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
        || (t.email && t.email.toLowerCase().includes(q))
        || t.company.toLowerCase().includes(q)
        || (t.phone && t.phone.includes(q));
    });
  }
  return list;
}

function updateTabCounts() {
  var counts = { all: APP_DATA.tenants.length, active: 0, pending: 0, moveout: 0, past: 0 };
  APP_DATA.tenants.forEach(function(t){ if (counts[t.status] !== undefined) counts[t.status]++; });
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    var tab = btn.dataset.tab;
    var badge = btn.querySelector('.tab-count');
    if (badge && counts[tab] !== undefined) badge.textContent = counts[tab];
  });
}

var MEMBERSHIP_CONFIG = {
  'truck-parking-club': { label: 'Truck Parking Club', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  'stackly':            { label: 'Stackly',            color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  'neighbor':           { label: 'Neighbor',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'standard':           { label: null, color: null, bg: null, border: null }
};

function getMembershipConfig(t) {
  return MEMBERSHIP_CONFIG[t.membershipType] || MEMBERSHIP_CONFIG['standard'];
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
    var mc = getMembershipConfig(t);
    var rowStyle = mc.bg ? 'cursor:pointer;background:'+mc.bg+';' : 'cursor:pointer;';
    var regBadge = t.registrationStatus === 'verified'
      ? '<span class="badge badge-green"><i class="fas fa-check-circle" style="margin-right:3px;font-size:0.65rem;"></i>Verified</span>'
      : '<span class="badge badge-yellow"><i class="fas fa-clock" style="margin-right:3px;font-size:0.65rem;"></i>Pending</span>';
    var stBadge = t.status === 'active'
      ? '<span class="badge badge-green">Active</span>'
      : t.status === 'pending'
        ? '<span class="badge badge-yellow">Pending</span>'
        : t.status === 'moveout'
          ? '<span class="badge badge-orange">Moving Out</span>'
          : t.rejectionReason
            ? '<span class="badge badge-red">Rejected</span>'
            : '<span class="badge badge-gray">Past</span>';
    var autopayBadge = t.paymentMethod === 'autopay'
      ? ' <span class="badge badge-teal" style="font-size:0.65rem;"><i class="fas fa-credit-card" style="margin-right:2px;"></i>AutoPay</span>'
      : '';
    var walkInBadge = t.walkIn
      ? ' <span class="badge" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:0.62rem;"><i class="fas fa-bolt" style="margin-right:2px;"></i>Walk-In</span>'
      : '';
    var lockBadge = t.priceLocked
      ? ' <span class="badge badge-navy" title="Rate is locked" style="font-size:0.65rem;"><i class="fas fa-lock" style="margin-right:2px;"></i>Locked</span>'
      : '';
    var membershipBadge = mc.label
      ? ' <span class="badge" style="background:'+mc.bg+';color:'+mc.color+';border:1px solid '+mc.border+';font-size:0.62rem;">'+mc.label+'</span>'
      : '';
    var allSpaces = (t.spaceNumbers && t.spaceNumbers.length)
      ? t.spaceNumbers.join(', ')
      : (t.spaceNumber || '—');
    var approvalActions = t.status === 'pending'
      ? '<button class="btn btn-secondary btn-sm btn-icon" title="Approve Booking" style="color:#16a34a;" onclick="approveTenant(\''+t.id+'\')"><i class="fas fa-check"></i></button>'
        + '<button class="btn btn-secondary btn-sm btn-icon" title="Reject Booking" style="color:#ef4444;" onclick="openRejectModal(\''+t.id+'\')"><i class="fas fa-ban"></i></button>'
      : (t.registrationStatus !== 'verified'
        ? '<button class="btn btn-secondary btn-sm btn-icon" title="Mark Registration Verified" style="color:#16a34a;" onclick="verifyRegistration(\''+t.id+'\')"><i class="fas fa-check"></i></button>'
        : '');
    return '<tr style="'+rowStyle+'" onclick="openTenantPanel(\''+t.id+'\')">'
      +'<td><div style="display:flex;align-items:center;gap:10px;">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:'+color+';color:white;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;flex-shrink:0;">'+t.initials+'</div>'
      +'<div><div style="font-weight:600;color:var(--navy);">'+t.name+walkInBadge+membershipBadge+'</div><div style="font-size:0.75rem;color:var(--gray-400);">'+t.company+'</div></div>'
      +'</div></td>'
      +'<td>'+regBadge+'</td>'
      +'<td style="font-size:0.82rem;">'+(t.email ? '<a href="mailto:'+t.email+'" style="color:var(--teal);text-decoration:none;" onclick="event.stopPropagation()">'+t.email+'</a>' : '<span style="color:var(--gray-400);">—</span>')+'</td>'
      +'<td style="font-size:0.82rem;white-space:nowrap;">'+t.phone+'</td>'
      +'<td style="font-size:0.82rem;"><div style="font-size:0.78rem;color:var(--gray-500);">'+getLotName(t.lotId)+'</div><div style="font-weight:600;color:var(--navy);font-size:0.82rem;">'+allSpaces+'</div></td>'
      +'<td>'+stBadge+'</td>'
      +'<td style="font-size:0.82rem;"><span class="badge badge-teal">'+formatCurrency(t.monthlyRate)+'/mo</span>'+autopayBadge+lockBadge+'</td>'
      +'<td onclick="event.stopPropagation()">'
      +'<div style="display:flex;gap:5px;">'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="View Details" onclick="openTenantPanel(\''+t.id+'\')"><i class="fas fa-eye"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Send Message" onclick="openMessageModal(\''+t.id+'\')"><i class="fas fa-envelope"></i></button>'
      +approvalActions
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
  var stClass = tenant.status==='active' ? 'badge-green'
    : tenant.status==='pending' ? 'badge-yellow'
    : tenant.status==='moveout' ? 'badge-orange'
    : tenant.rejectionReason ? 'badge-red'
    : 'badge-gray';
  var stLabel = tenant.status==='moveout' ? 'Moving Out'
    : (tenant.status==='past' && tenant.rejectionReason) ? 'Rejected'
    : tenant.status.charAt(0).toUpperCase()+tenant.status.slice(1);
  statusEl.className = 'badge '+stClass;
  statusEl.textContent = stLabel;

  // Membership badge
  var panelMcEl = document.getElementById('panelMembershipBadge');
  if (panelMcEl) {
    var mc = getMembershipConfig(tenant);
    if (mc.label) {
      panelMcEl.style.display = '';
      panelMcEl.textContent = mc.label;
      panelMcEl.style.background = mc.bg;
      panelMcEl.style.color = mc.color;
      panelMcEl.style.border = '1px solid '+mc.border;
    } else {
      panelMcEl.style.display = 'none';
    }
  }

  // Approval banner (pending bookings only)
  var approvalBanner = document.getElementById('panelApprovalBanner');
  if (tenant.status === 'pending') {
    approvalBanner.style.display = '';
    document.getElementById('panelApproveBtn').onclick = function(){ approveTenant(tenantId); };
    document.getElementById('panelRejectBtn').onclick = function(){ openRejectModal(tenantId); };
  } else {
    approvalBanner.style.display = 'none';
  }

  // Verify registration banner (active tenants with unverified registration)
  var verifyBanner = document.getElementById('panelVerifyBanner');
  if (tenant.status !== 'pending' && tenant.registrationStatus !== 'verified') {
    verifyBanner.style.display = '';
    document.getElementById('panelVerifyBtn').onclick = function(){ verifyRegistration(tenantId); };
  } else {
    verifyBanner.style.display = 'none';
  }

  document.getElementById('panelEmail').textContent = tenant.email || '—';
  document.getElementById('panelPhone').textContent = tenant.phone || '—';
  document.getElementById('panelCompany').textContent = tenant.company || '—';
  document.getElementById('panelLot').textContent = lot ? lot.name : '—';
  document.getElementById('panelSpace').textContent = tenant.spaceNumber || '—';
  document.getElementById('panelRate').textContent = formatCurrency(tenant.monthlyRate)+'/mo';

  // Additional Spaces
  var additionalSpaces = tenant.additionalSpaces || [];
  document.getElementById('panelAdditionalSpaces').innerHTML = additionalSpaces.length
    ? additionalSpaces.map(function(sp) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
          +'<span style="font-size:0.85rem;font-weight:600;color:var(--navy);">'+sp+'</span>'
          +'<button class="btn btn-secondary btn-sm btn-icon" title="Remove Space" onclick="removeAdditionalSpace(\''+tenantId+'\',\''+sp+'\')"><i class="fas fa-times"></i></button>'
          +'</div>';
      }).join('')
    : '<p style="color:var(--gray-400);font-size:0.82rem;padding:4px 0;">Only the primary space</p>';
  document.getElementById('panelAddSpaceBtn').onclick = function(){ openAdditionalSpaceModal(tenantId); };
  document.getElementById('panelStart').textContent = formatDate(tenant.startDate);
  document.getElementById('panelEnd').textContent = formatDate(tenant.endDate);

  // Price Lock toggle
  var lockBtn = document.getElementById('panelPriceLockBtn');
  if (tenant.priceLocked) {
    lockBtn.innerHTML = '<i class="fas fa-lock"></i> Locked';
    lockBtn.style.background = 'var(--navy)';
    lockBtn.style.borderColor = 'var(--navy)';
    lockBtn.style.color = '#fff';
  } else {
    lockBtn.innerHTML = '<i class="fas fa-lock-open"></i> Unlocked';
    lockBtn.style.background = '';
    lockBtn.style.borderColor = '';
    lockBtn.style.color = '';
  }
  lockBtn.onclick = function(){ togglePriceLock(tenantId); };

  // Late Fee Exemption toggle
  var lateFeeBtn = document.getElementById('panelLateFeeExemptBtn');
  if (tenant.lateFeeExempt) {
    lateFeeBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Exempt';
    lateFeeBtn.style.background = 'var(--navy)';
    lateFeeBtn.style.borderColor = 'var(--navy)';
    lateFeeBtn.style.color = '#fff';
  } else {
    lateFeeBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Applies';
    lateFeeBtn.style.background = '';
    lateFeeBtn.style.borderColor = '';
    lateFeeBtn.style.color = '';
  }
  lateFeeBtn.onclick = function(){ toggleLateFeeExempt(tenantId); };

  // Move-Out section
  var moveOutSection = document.getElementById('panelMoveOutSection');
  var moveOutContent = document.getElementById('panelMoveOutContent');
  if (tenant.status === 'pending') {
    moveOutSection.style.display = 'none';
  } else {
    moveOutSection.style.display = '';
    if (tenant.status === 'moveout') {
      moveOutContent.innerHTML = '<div class="panel-info-row"><span class="label">Expected Vacate</span><span class="value">'+formatDate(tenant.moveOutDate)+'</span></div>'
        +'<div style="display:flex;gap:8px;margin-top:10px;">'
        +'<button class="btn btn-secondary btn-sm" style="flex:1;" onclick="cancelMoveOut(\''+tenantId+'\')"><i class="fas fa-undo"></i> Cancel Move-Out</button>'
        +'<button class="btn btn-primary btn-sm" style="flex:1;background:#f97316;border-color:#f97316;" onclick="confirmMoveOut(\''+tenantId+'\')"><i class="fas fa-check"></i> Confirm Move-Out</button>'
        +'</div>';
    } else if (tenant.status === 'active') {
      moveOutContent.innerHTML = '<button class="btn btn-secondary btn-sm" style="width:100%;" onclick="openMoveOutModal(\''+tenantId+'\')"><i class="fas fa-dolly"></i> Initiate Move-Out</button>';
    } else if (tenant.rejectionReason) {
      moveOutContent.innerHTML = '<p style="font-size:0.82rem;color:var(--gray-500);"><strong>Rejected:</strong> '+tenant.rejectionReason+'</p>';
    } else {
      moveOutContent.innerHTML = '<p style="font-size:0.82rem;color:var(--gray-400);font-style:italic;">Tenant has moved out'+(tenant.moveOutDate ? (' on '+formatDate(tenant.moveOutDate)) : '')+'.</p>';
    }
  }

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

  // Additional Drivers
  var drivers = tenant.additionalDrivers || [];
  document.getElementById('panelDrivers').innerHTML = drivers.length
    ? drivers.map(function(d) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
          +'<div style="display:flex;flex-direction:column;gap:2px;">'
          +'<span style="font-size:0.85rem;font-weight:600;color:var(--navy);">'+d.name+'</span>'
          +'<span style="font-size:0.75rem;color:var(--gray-400);">'+[d.phone, d.license ? 'Lic# '+d.license : null].filter(Boolean).join(' · ')+'</span>'
          +'</div>'
          +'<button class="btn btn-secondary btn-sm btn-icon" title="Remove Driver" onclick="removeAdditionalDriver(\''+tenantId+'\',\''+d.id+'\')"><i class="fas fa-times"></i></button>'
          +'</div>';
      }).join('')
    : '<p style="color:var(--gray-400);font-size:0.82rem;padding:4px 0;">No additional drivers</p>';
  document.getElementById('panelAddDriverBtn').onclick = function(){ openAdditionalDriverModal(tenantId); };

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

  // Customer Ledger — account balance
  var balance = computeTenantBalance(tenant);
  var balanceEl = document.getElementById('panelBalance');
  if (balance > 0.005) {
    balanceEl.innerHTML = '<span class="badge badge-red">'+formatCurrency(balance)+' due</span>';
  } else if (balance < -0.005) {
    balanceEl.innerHTML = '<span class="badge badge-blue">'+formatCurrency(Math.abs(balance))+' credit</span>';
  } else {
    balanceEl.innerHTML = '<span class="badge badge-green">Paid in full</span>';
  }
  document.getElementById('panelAddChargeBtn').onclick = function(){ openLedgerEntryModal(tenantId, 'charge'); };
  document.getElementById('panelRecordPaymentBtn').onclick = function(){ openLedgerEntryModal(tenantId, 'payment'); };
  document.getElementById('panelPoyntBtn').onclick = function(){ openPoyntChargeModal(tenantId); };
  document.getElementById('panelPayLinkBtn').onclick = function(){ copyPaymentLink(tenantId); };

  // Payment / charge history
  var payments = tenant.payments || [];
  var paymentsHtml = payments.map(function(p, pi) {
    if (p.type === 'charge') {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
        +'<div style="display:flex;flex-direction:column;gap:2px;">'
        +'<span style="font-size:0.82rem;color:var(--gray-500);">'+formatDate(p.date)+'</span>'
        +'<span style="font-size:0.72rem;color:var(--gray-400);">'+(p.description||'Charge')+'</span>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:5px;">'
        +'<span style="font-weight:600;font-size:0.875rem;color:#ef4444;">+'+formatCurrency(p.amount)+'</span>'
        +'<span class="badge badge-orange">Charge</span>'
        +'</div></div>';
    }
    var cls = p.status==='paid'?'badge-green':p.status==='late'?'badge-yellow':'badge-red';
    var methodIcon = (p.method==='autopay' || p.method==='card')
      ? '<i class="fas fa-credit-card" style="margin-right:3px;color:var(--teal);font-size:0.7rem;"></i>'
      : '<i class="fas fa-money-bill-wave" style="margin-right:3px;color:var(--gray-400);font-size:0.7rem;"></i>';
    var methodLabel = p.method==='autopay' ? 'Auto-Pay' : p.method==='card' ? 'Card' : p.method==='check' ? 'Check' : p.method==='cash' ? 'Cash' : 'Manual';
    if (p.cardSurcharge) methodLabel += ' (incl. 3.5% fee)';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
      +'<div style="display:flex;flex-direction:column;gap:2px;">'
      +'<span style="font-size:0.82rem;color:var(--gray-500);">'+formatDate(p.date)+'</span>'
      +'<span style="font-size:0.72rem;color:var(--gray-400);">'+methodIcon+methodLabel+'</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:5px;">'
      +'<span style="font-weight:600;font-size:0.875rem;">'+formatCurrency(p.amount)+'</span>'
      +'<span class="badge '+cls+'">'+p.status.charAt(0).toUpperCase()+p.status.slice(1)+'</span>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Print Receipt" onclick="printPaymentReceipt(\''+tenantId+'\','+pi+')"><i class="fas fa-print"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Email Receipt" onclick="emailPaymentReceipt(\''+tenantId+'\','+pi+')"><i class="fas fa-envelope"></i></button>'
      +'</div></div>';
  }).join('');

  document.getElementById('panelPayments').innerHTML = paymentsHtml
    || '<p style="color:var(--gray-400);font-size:0.82rem;padding:8px 0;">No ledger entries yet</p>';

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

// ── Price Lock ────────────────────────────────────────────────────────────
async function togglePriceLock(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var newVal = !tenant.priceLocked;
  try {
    await YB.saveTenant({ id: tenantId, priceLocked: newVal });
    tenant.priceLocked = newVal;
    showToast(newVal ? 'Rate locked for '+tenant.name : 'Rate unlocked for '+tenant.name, 'success');
  } catch (err) {
    tenant.priceLocked = newVal;
    showToast('Rate '+(newVal?'locked':'unlocked')+' (offline)', 'warning');
  }
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

// ── Late Fee Exemption ────────────────────────────────────────────────────
async function toggleLateFeeExempt(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var newVal = !tenant.lateFeeExempt;
  try {
    await YB.saveTenant({ id: tenantId, lateFeeExempt: newVal });
    tenant.lateFeeExempt = newVal;
    showToast(newVal ? tenant.name+' is now exempt from late fees' : 'Late fees re-enabled for '+tenant.name, 'success');
  } catch (err) {
    tenant.lateFeeExempt = newVal;
    showToast('Late fee setting '+(newVal?'exempted':'re-enabled')+' (offline)', 'warning');
  }
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

// ── Move-Out workflow ─────────────────────────────────────────────────────
function openMoveOutModal(tenantId) {
  document.getElementById('moMoveOutDate').value = '';
  document.getElementById('confirmMoveOutModalBtn').dataset.tenantId = tenantId;
  document.getElementById('moveOutModal').classList.add('open');
}

async function handleMoveOutSubmit() {
  var tenantId = document.getElementById('confirmMoveOutModalBtn').dataset.tenantId;
  var date = document.getElementById('moMoveOutDate').value;
  if (!date) { showToast('Please select an expected vacate date.', 'error'); return; }
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  try {
    await YB.saveTenant({ id: tenantId, status: 'moveout', moveOutDate: date });
    tenant.status = 'moveout';
    tenant.moveOutDate = date;
    showToast('Move-out initiated for '+tenant.name, 'success');
  } catch (err) {
    tenant.status = 'moveout';
    tenant.moveOutDate = date;
    showToast('Move-out initiated (offline)', 'warning');
  }
  document.getElementById('moveOutModal').classList.remove('open');
  updateTabCounts();
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

async function cancelMoveOut(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  try {
    await YB.saveTenant({ id: tenantId, status: 'active', moveOutDate: null });
    tenant.status = 'active';
    tenant.moveOutDate = null;
    showToast('Move-out cancelled for '+tenant.name, 'success');
  } catch (err) {
    tenant.status = 'active';
    tenant.moveOutDate = null;
    showToast('Move-out cancelled (offline)', 'warning');
  }
  updateTabCounts();
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

async function confirmMoveOut(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var endDate = tenant.moveOutDate || new Date().toISOString().split('T')[0];
  try {
    await YB.saveTenant({ id: tenantId, status: 'past', endDate: endDate });
    tenant.status = 'past';
    tenant.endDate = endDate;
    showToast(tenant.name+' moved out', 'success');
  } catch (err) {
    tenant.status = 'past';
    tenant.endDate = endDate;
    showToast('Tenant moved out (offline)', 'warning');
  }

  fireWebhookEvent('tenant.moveout', {
    tenantId: tenantId,
    tenantName: tenant.name,
    spaceNumber: tenant.spaceNumber,
    endDate: endDate
  });

  updateTabCounts();
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

// ── Pending Approval workflow ────────────────────────────────────────────
async function approveTenant(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var fields = { id: tenantId, status: 'active', registrationStatus: 'verified' };
  if (!tenant.startDate) fields.startDate = new Date().toISOString().split('T')[0];
  try {
    await YB.saveTenant(fields);
    Object.assign(tenant, fields);
    showToast('Booking approved for '+tenant.name, 'success');
  } catch (err) {
    Object.assign(tenant, fields);
    showToast('Booking approved (offline)', 'warning');
  }
  updateTabCounts();
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

function openRejectModal(tenantId) {
  document.getElementById('rejReason').value = '';
  document.getElementById('confirmRejectModalBtn').dataset.tenantId = tenantId;
  document.getElementById('rejectModal').classList.add('open');
}

async function handleRejectSubmit() {
  var tenantId = document.getElementById('confirmRejectModalBtn').dataset.tenantId;
  var reason = document.getElementById('rejReason').value.trim() || null;
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var fields = { id: tenantId, status: 'past', rejectionReason: reason };
  try {
    await YB.saveTenant(fields);
    Object.assign(tenant, fields);
    showToast('Booking rejected for '+tenant.name, 'success');
  } catch (err) {
    Object.assign(tenant, fields);
    showToast('Booking rejected (offline)', 'warning');
  }
  document.getElementById('rejectModal').classList.remove('open');
  updateTabCounts();
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

async function verifyRegistration(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var fields = { id: tenantId, registrationStatus: 'verified' };
  try {
    await YB.saveTenant(fields);
    Object.assign(tenant, fields);
    showToast(tenant.name + ' marked as Verified', 'success');
  } catch (err) {
    Object.assign(tenant, fields);
    showToast('Marked Verified (offline)', 'warning');
  }
  renderTenantsTable();
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

// Formats a dollar amount with cents (formatCurrency() rounds to whole dollars,
// which isn't precise enough for the exact amount to charge a card).
function fmtUSD2(n) {
  return '$' + Number(n || 0).toFixed(2);
}

// Emails the current month's gate code (Settings → Gate Code) to a tenant
// after a payment is recorded, so they always have the latest code. Silent
// no-op if the tenant has no email on file or no gate code has been set.
function sendGateCodeEmail(tenant, opts) {
  if (!tenant || !tenant.email) return;
  if (!window.YB || typeof YB.sendGateCodeEmail !== 'function') return;
  var payload = { to: tenant.email, tenantName: tenant.name };
  if (opts && opts.welcome) payload.welcome = true;
  YB.sendGateCodeEmail(payload).catch(function (err) {
    console.warn('Could not send gate code email:', err && err.message);
  });
}

// Shows/hides a "total to charge" hint when the selected payment method is
// "Card" — the 3.5% card processing surcharge is added on top of the entered
// amount for ANY card payment (walk-in, manual ledger entry, or auto-pay).
function updateCardFeeHint(amountFieldId, methodFieldId, hintFieldId) {
  var hint = document.getElementById(hintFieldId);
  var method = document.getElementById(methodFieldId).value;
  var amount = parseFloat(document.getElementById(amountFieldId).value) || 0;
  if (method !== 'card' || amount <= 0) {
    hint.style.display = 'none';
    return;
  }
  var surcharge = YardBossReceipts.calcSurcharge(amount);
  var total = Math.round((amount + surcharge) * 100) / 100;
  hint.textContent = 'Total to charge card: ' + fmtUSD2(total) + ' (includes ' + fmtUSD2(surcharge) + ' card processing fee, 3.5%)';
  hint.style.display = '';
}

// ── Customer Ledger — Add Charge / Record Payment ────────────────────────
var _ledgerEntryType = 'charge';

function openLedgerEntryModal(tenantId, type) {
  _ledgerEntryType = type;
  var form = document.getElementById('ledgerEntryForm');
  form.reset();
  form.dataset.tenantId = tenantId;
  document.getElementById('leDate').value = new Date().toISOString().split('T')[0];

  var isCharge = type === 'charge';
  document.getElementById('ledgerEntryModalTitle').innerHTML = isCharge
    ? '<i class="fas fa-receipt" style="margin-right:8px;color:var(--teal);"></i>Add Charge'
    : '<i class="fas fa-money-bill-wave" style="margin-right:8px;color:var(--teal);"></i>Record Payment';
  document.getElementById('leDescriptionGroup').style.display = isCharge ? '' : 'none';
  document.getElementById('leMethodGroup').style.display = isCharge ? 'none' : '';
  document.getElementById('ledgerEntrySubmitBtn').innerHTML = isCharge
    ? '<i class="fas fa-save"></i> Add Charge'
    : '<i class="fas fa-save"></i> Record Payment';
  document.getElementById('leCardFeeHint').style.display = 'none';

  document.getElementById('ledgerEntryModal').classList.add('open');
}

async function handleLedgerEntrySubmit(e) {
  e.preventDefault();
  var form = document.getElementById('ledgerEntryForm');
  var tenantId = form.dataset.tenantId;
  var tenant = getTenant(tenantId);
  if (!tenant) return;

  var date = document.getElementById('leDate').value;
  var amount = parseFloat(document.getElementById('leAmount').value);
  if (!date || !amount || amount <= 0) { showToast('Please enter a valid date and amount.', 'error'); return; }

  var entry;
  if (_ledgerEntryType === 'charge') {
    var description = document.getElementById('leDescription').value.trim() || 'Charge';
    entry = { date: date, amount: amount, type: 'charge', description: description };
  } else {
    var method = document.getElementById('leMethod').value;
    if (method === 'card') {
      var leSurcharge = YardBossReceipts.calcSurcharge(amount);
      var leTotal = Math.round((amount + leSurcharge) * 100) / 100;
      entry = {
        date: date, amount: leTotal, baseAmount: amount, cardSurcharge: leSurcharge,
        status: 'paid', method: 'card', type: 'payment',
        note: 'Card payment (' + fmtUSD2(amount) + ' + ' + fmtUSD2(leSurcharge) + ' card surcharge)'
      };
    } else {
      entry = { date: date, amount: amount, status: 'paid', method: method, type: 'payment' };
    }
  }

  try {
    var updated = await YB.addPayment(tenantId, entry);
    tenant.payments = updated.payments;
    showToast((_ledgerEntryType==='charge' ? 'Charge added for ' : 'Payment recorded for ')+tenant.name, 'success');
  } catch (err) {
    tenant.payments = tenant.payments || [];
    tenant.payments.unshift(entry);
    showToast((_ledgerEntryType==='charge' ? 'Charge added' : 'Payment recorded')+' (offline)', 'warning');
  }

  if (_ledgerEntryType === 'payment') {
    fireWebhookEvent('payment.received', {
      tenantId: tenantId,
      tenantName: tenant.name,
      amount: amount,
      date: date
    });
    sendGateCodeEmail(tenant);
  }

  document.getElementById('ledgerEntryModal').classList.remove('open');
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

// ── Additional Spaces ─────────────────────────────────────────────────────
function openAdditionalSpaceModal(tenantId) {
  var form = document.getElementById('additionalSpaceForm');
  form.reset();
  form.dataset.tenantId = tenantId;
  document.getElementById('additionalSpaceModal').classList.add('open');
  setTimeout(function(){ document.getElementById('asSpaceNumber').focus(); }, 80);
}

async function handleAdditionalSpaceSubmit(e) {
  e.preventDefault();
  var form = document.getElementById('additionalSpaceForm');
  var tenantId = form.dataset.tenantId;
  var tenant = getTenant(tenantId);
  if (!tenant) return;

  var spaceNumber = document.getElementById('asSpaceNumber').value.trim();
  if (!spaceNumber) { showToast('Please enter a space number.', 'error'); return; }

  var existing = getTenantSpaceNumbers(tenant);
  if (existing.includes(spaceNumber)) { showToast('Tenant already has space '+spaceNumber+'.', 'error'); return; }

  var additionalSpaces = (tenant.additionalSpaces || []).concat([spaceNumber]);

  try {
    await YB.saveTenant({ id: tenantId, additionalSpaces: additionalSpaces });
    tenant.additionalSpaces = additionalSpaces;
    showToast('Space '+spaceNumber+' added for '+tenant.name, 'success');
  } catch (err) {
    tenant.additionalSpaces = additionalSpaces;
    showToast('Space added (offline)', 'warning');
  }

  document.getElementById('additionalSpaceModal').classList.remove('open');
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
  renderTenantsTable();
}

async function removeAdditionalSpace(tenantId, spaceNumber) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var additionalSpaces = (tenant.additionalSpaces || []).filter(function(sp){ return sp !== spaceNumber; });

  try {
    await YB.saveTenant({ id: tenantId, additionalSpaces: additionalSpaces });
    tenant.additionalSpaces = additionalSpaces;
    showToast('Space '+spaceNumber+' removed', 'success');
  } catch (err) {
    tenant.additionalSpaces = additionalSpaces;
    showToast('Space removed (offline)', 'warning');
  }

  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
  renderTenantsTable();
}

// ── Additional Drivers ────────────────────────────────────────────────────
function openAdditionalDriverModal(tenantId) {
  var form = document.getElementById('additionalDriverForm');
  form.reset();
  form.dataset.tenantId = tenantId;
  document.getElementById('additionalDriverModal').classList.add('open');
  setTimeout(function(){ document.getElementById('adName').focus(); }, 80);
}

async function handleAdditionalDriverSubmit(e) {
  e.preventDefault();
  var form = document.getElementById('additionalDriverForm');
  var tenantId = form.dataset.tenantId;
  var tenant = getTenant(tenantId);
  if (!tenant) return;

  var name = document.getElementById('adName').value.trim();
  var phone = document.getElementById('adPhone').value.trim();
  var license = document.getElementById('adLicense').value.trim();
  if (!name) { showToast('Please enter the driver\'s name.', 'error'); return; }

  var driver = { id: generateId('drv'), name: name, phone: phone, license: license };
  var drivers = (tenant.additionalDrivers || []).concat([driver]);

  try {
    await YB.saveTenant({ id: tenantId, additionalDrivers: drivers });
    tenant.additionalDrivers = drivers;
    showToast('Driver added for '+tenant.name, 'success');
  } catch (err) {
    tenant.additionalDrivers = drivers;
    showToast('Driver added (offline)', 'warning');
  }

  document.getElementById('additionalDriverModal').classList.remove('open');
  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
}

async function removeAdditionalDriver(tenantId, driverId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  var drivers = (tenant.additionalDrivers || []).filter(function(d){ return d.id !== driverId; });

  try {
    await YB.saveTenant({ id: tenantId, additionalDrivers: drivers });
    tenant.additionalDrivers = drivers;
    showToast('Driver removed', 'success');
  } catch (err) {
    tenant.additionalDrivers = drivers;
    showToast('Driver removed (offline)', 'warning');
  }

  if (_panelTenantId === tenantId) openTenantPanel(tenantId);
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

  var baseAmount = tenant.renewalRate || tenant.monthlyRate || 0;
  var surcharge = YardBossReceipts.calcSurcharge(baseAmount);
  var amount = Math.round((baseAmount + surcharge) * 100) / 100;

  fetch('/api/payments/process-autopay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: tenantId, amount: amount, description: 'Auto-pay for '+tenant.name })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.error) throw new Error(res.error);
    var payment = {
      date: new Date().toISOString().split('T')[0], amount: amount, baseAmount: baseAmount, cardSurcharge: surcharge,
      status: 'paid', method: 'autopay',
      note: 'Auto-pay (' + fmtUSD2(baseAmount) + ' + ' + fmtUSD2(surcharge) + ' card surcharge)'
    };
    tenant.payments.unshift(payment);
    showToast(res.mock ? 'Auto-pay processed (mock mode) — ' + fmtUSD2(amount) + ' (incl. 3.5% card fee)' : 'Auto-pay of '+fmtUSD2(amount)+' processed (incl. 3.5% card fee)', 'success');
    sendGateCodeEmail(tenant);
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
  document.getElementById('msgToEmail').textContent = tenant.email ? '<'+tenant.email+'>' : '(no email on file)';
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
  if (!tenant.email) { showToast('This tenant has no email on file.','error'); return; }
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

// ── Pricing Plan dropdowns ────────────────────────────────────────────────
// Populates a "Pricing Plan" select with the centralized plans (js/data.js
// APP_DATA.lots[0].pricingPlans) that match the given vehicle type. Always
// includes a "Manual Entry" option so staff can override/enter a custom rate.
function populatePricingPlanSelect(selectEl, vehicleType, selectedPlanId) {
  var options = getPricingOptionsForType(vehicleType);
  var html = '<option value="">— Manual Entry —</option>';
  options.forEach(function(plan) {
    html += '<option value="'+plan.id+'">'+plan.label+' ($'+plan.price.toFixed(2)+')</option>';
  });
  selectEl.innerHTML = html;
  selectEl.value = (selectedPlanId && options.some(function(p){ return p.id===selectedPlanId; })) ? selectedPlanId : '';
}

// Counts how many spaces a tenant occupies — 1 for the primary space plus
// however many are listed in the "Additional Spaces" field (comma-separated).
function countTenantSpaces(additionalSpacesEl) {
  if (!additionalSpacesEl) return 1;
  var extra = additionalSpacesEl.value.split(',')
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0; })
    .length;
  return 1 + extra;
}

// Applies the selected plan's price to the rate field and shows a hint, or
// leaves the rate field as-is for manual entry. If additionalSpacesEl is
// given, the rate is multiplied by the tenant's total space count (1 primary
// + any additional spaces) so multi-space tenants get the combined total. If
// rateTypeEl is given, the plan's billing cadence (day/week/month) is
// mirrored into it. If both startDateEl and dueDateEl are given, the due date
// is set to the start date plus one plan period.
function applyPricingPlanSelection(planSelectEl, rateEl, hintEl, rateTypeEl, startDateEl, dueDateEl, additionalSpacesEl) {
  var planId = planSelectEl.value;
  if (!planId) {
    hintEl.textContent = '';
    return;
  }
  var plan = findPricingPlanById(planId);
  if (!plan) return;
  var spaceCount = countTenantSpaces(additionalSpacesEl);
  var total = Math.round(plan.price * spaceCount * 100) / 100;
  rateEl.value = total;
  hintEl.textContent = spaceCount > 1
    ? plan.label + ' plan — $' + plan.price.toFixed(2) + ' × ' + spaceCount + ' spaces = $' + total.toFixed(2) + ' (you can still adjust this manually)'
    : plan.label + ' plan — $' + plan.price.toFixed(2) + ' (you can still adjust this manually)';
  if (rateTypeEl) rateTypeEl.value = unitToRateType(plan.unit);
  if (startDateEl && dueDateEl) {
    dueDateEl.value = computeDueDateFromPlan(startDateEl.value, plan);
  }
}

// Maps a pricing plan's billing unit to a tenant rate type used for
// renewal notice windows (daily=1 day, weekly=3 days, monthly=5 days).
function unitToRateType(unit) {
  switch (unit) {
    case 'day':  return 'daily';
    case 'week': return 'weekly';
    case 'month':
    default:     return 'monthly';
  }
}

// Computes a due date by adding one plan period (qty * unit) to startDate.
function computeDueDateFromPlan(startDate, plan) {
  if (!startDate || !plan) return '';
  var d = new Date(startDate + 'T00:00:00');
  var qty = plan.qty || 1;
  switch (plan.unit) {
    case 'day':  d.setDate(d.getDate() + qty); break;
    case 'week': d.setDate(d.getDate() + (qty * 7)); break;
    case 'month':
    default:     d.setMonth(d.getMonth() + qty); break;
  }
  return d.toISOString().split('T')[0];
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
  populatePricingPlanSelect(document.getElementById('atPricingPlan'), document.getElementById('atVehicleType').value);
  document.getElementById('atRateHint').textContent = '';
  document.getElementById('atRateType').value = 'monthly';
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
  document.getElementById('atSmsConsent').checked = !!t.smsConsent;
  document.getElementById('atSpace').value   = t.spaceNumber || '';
  document.getElementById('atAdditionalSpaces').value = (t.additionalSpaces || []).join(', ');
  document.getElementById('atRate').value    = t.monthlyRate || '';
  document.getElementById('atStart').value   = t.startDate || '';
  document.getElementById('atEnd').value     = t.endDate || '';
  document.getElementById('atStatus').value  = t.status || 'active';
  document.getElementById('atMembershipType').value = t.membershipType || 'standard';
  document.getElementById('atRateType').value = t.rateType || 'monthly';
  document.getElementById('atDueDate').value = t.dueDate || '';

  // Vehicle
  document.getElementById('atVehicleMake').value  = t.vehicle ? (t.vehicle.make || '') : '';
  document.getElementById('atVehicleModel').value = t.vehicle ? (t.vehicle.model || '') : '';
  document.getElementById('atVehicleYear').value  = t.vehicle ? (t.vehicle.year || '') : '';
  document.getElementById('atVehiclePlate').value = t.vehicle ? (t.vehicle.plate || '') : '';
  document.getElementById('atVehicleType').value  = t.vehicle ? (t.vehicle.type || 'Semi Truck') : 'Semi Truck';
  document.getElementById('atPlateState').value   = t.plateState || '';
  populatePricingPlanSelect(document.getElementById('atPricingPlan'), document.getElementById('atVehicleType').value);
  document.getElementById('atRateHint').textContent = '';

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

async function handleAddTenantSubmit(e) {
  e.preventDefault();
  var form   = document.getElementById('addTenantForm');
  var editId = form.dataset.tenantId;

  var name    = document.getElementById('atName').value.trim();
  var email   = document.getElementById('atEmail').value.trim();
  var phone   = document.getElementById('atPhone').value.trim();
  var company = document.getElementById('atCompany').value.trim();
  var smsConsent = document.getElementById('atSmsConsent').checked;
  var lotId   = document.getElementById('atLotId').value;
  var space   = document.getElementById('atSpace').value.trim();
  var additionalSpaces = document.getElementById('atAdditionalSpaces').value.split(',')
    .map(function(s){ return s.trim(); })
    .filter(function(s, i, arr){ return s && s !== space && arr.indexOf(s) === i; });
  var rate    = parseFloat(document.getElementById('atRate').value) || 0;
  var start   = document.getElementById('atStart').value;
  var end     = document.getElementById('atEnd').value;
  var status  = document.getElementById('atStatus').value;
  var membershipType = document.getElementById('atMembershipType').value;
  var rateType = document.getElementById('atRateType').value;
  var dueDate  = document.getElementById('atDueDate').value || null;

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

  if (!name || !lotId || !space) {
    showToast('Name, lot, and space are required.', 'error');
    return;
  }

  var initials = name.split(' ').map(function(p){ return p[0]; }).join('').toUpperCase().slice(0,2);

  var tenantData = {
    name:name, email:email, phone:phone, company:company, initials:initials,
    lotId:lotId, spaceNumber:space, additionalSpaces:additionalSpaces, monthlyRate:rate,
    startDate:start, endDate:end, status:status,
    vehicle:{ make:vMake, model:vModel, year:vYear, plate:vPlate, type:vType },
    plateState:plateState, truckNumber:truckNumber, trailerNumber:trailerNumber,
    insurancePolicyNumber:insurancePolicyNumber, insuranceCompany:insuranceCompany,
    insuranceExpDate:insuranceExpDate,
    autoRenew:autoRenew, renewalPeriod:renewalPeriod, renewalRate:renewalRate,
    paymentMethod:paymentMethod, autopayCard:autopayCard, autopayNextDate:autopayNextDate,
    rateType:rateType, dueDate:dueDate, smsConsent:smsConsent, membershipType:membershipType
  };
  tenantData.renewalStatus = computeRenewalStatus(Object.assign({}, editId ? getTenant(editId) : {}, {
    dueDate: dueDate, rateType: rateType, status: status
  }));
  if (editId) tenantData.id = editId;
  if (insuranceDoc) tenantData.insuranceDoc = insuranceDoc;

  try {
    var saved = await YB.saveTenant(tenantData);
    // Reload fresh tenant list from API
    var tenants = await YB.loadTenants();
    APP_DATA.tenants = tenants;
    showToast(editId ? 'Tenant updated: '+name : 'Tenant added: '+name, 'success');
  } catch (err) {
    // Fallback: update local state only
    if (editId) {
      var t = getTenant(editId);
      if (t) Object.assign(t, tenantData);
    } else {
      tenantData.id = generateId('t');
      tenantData.registrationStatus = 'pending';
      tenantData.payments = [];
      APP_DATA.tenants.push(tenantData);
    }
    showToast((editId ? 'Tenant updated' : 'Tenant added')+' (offline)', 'warning');
  }

  if (!editId) {
    fireWebhookEvent('tenant.created', {
      name: name, email: email, company: company,
      lotId: lotId, spaceNumber: space, monthlyRate: rate
    });
  }

  document.getElementById('addTenantModal').classList.remove('open');
  updateTabCounts();
  renderTenantsTable();

  // Refresh panel if open for this tenant
  if (_panelTenantId === editId) openTenantPanel(editId);
}

// ── Walk-In Check-In ──────────────────────────────────────────────────────
function openWalkInModal() {
  document.getElementById('walkInForm').reset();
  var lotSel = document.getElementById('wiLotId');
  lotSel.innerHTML = APP_DATA.lots.map(function(l){ return '<option value="'+l.id+'">'+l.name+'</option>'; }).join('');
  document.getElementById('wiStart').value = new Date().toISOString().split('T')[0];
  populatePricingPlanSelect(document.getElementById('wiPricingPlan'), document.getElementById('wiVehicleType').value);
  document.getElementById('wiRateHint').textContent = '';
  document.getElementById('wiRateType').value = 'monthly';
  document.getElementById('wiDueDate').value = '';
  document.getElementById('wiCardFeeHint').style.display = 'none';
  document.getElementById('walkInModal').classList.add('open');
  setTimeout(function(){ document.getElementById('wiName').focus(); }, 80);
}

async function handleWalkInSubmit(e) {
  e.preventDefault();
  var name       = document.getElementById('wiName').value.trim();
  var phone      = document.getElementById('wiPhone').value.trim();
  var email      = document.getElementById('wiEmail').value.trim();
  var company    = document.getElementById('wiCompany').value.trim();
  var lotId      = document.getElementById('wiLotId').value;
  var space      = document.getElementById('wiSpace').value.trim();
  var additionalSpaces = document.getElementById('wiAdditionalSpaces').value.split(',')
    .map(function(s){ return s.trim(); })
    .filter(function(s, i, arr){ return s && s !== space && arr.indexOf(s) === i; });
  var rate       = parseFloat(document.getElementById('wiRate').value) || 0;
  var start      = document.getElementById('wiStart').value;
  var rateType   = document.getElementById('wiRateType').value;
  var dueDate    = document.getElementById('wiDueDate').value || null;
  var vType      = document.getElementById('wiVehicleType').value;
  var wiMembershipType = document.getElementById('wiMembershipType').value;
  var plate      = '';
  var plateState = '';
  var payAmt     = parseFloat(document.getElementById('wiPayAmount').value) || 0;
  var payMethod  = document.getElementById('wiPayMethod').value;
  var smsConsent = document.getElementById('wiSmsConsent').checked;

  if (!name || !lotId || !space) {
    showToast('Name, lot, and space are required.', 'error');
    return;
  }

  var initials = name.split(' ').map(function(p){ return p[0]; }).join('').toUpperCase().slice(0,2);
  var payments = [];
  if (payAmt > 0 && payMethod !== 'none') {
    if (payMethod === 'card') {
      var wiSurcharge = YardBossReceipts.calcSurcharge(payAmt);
      var wiTotal = Math.round((payAmt + wiSurcharge) * 100) / 100;
      payments.push({
        date: start || new Date().toISOString().split('T')[0], amount: wiTotal, baseAmount: payAmt, cardSurcharge: wiSurcharge,
        status: 'paid', method: 'card',
        note: 'Walk-in payment (' + fmtUSD2(payAmt) + ' + ' + fmtUSD2(wiSurcharge) + ' card surcharge)'
      });
    } else {
      payments.push({ date: start || new Date().toISOString().split('T')[0], amount: payAmt, status: 'paid', method: payMethod });
    }
  }

  var tenantData = {
    name: name, email: email, phone: phone, company: company, initials: initials,
    lotId: lotId, spaceNumber: space, additionalSpaces: additionalSpaces, monthlyRate: rate,
    startDate: start, endDate: '', status: 'active',
    vehicle: { make: '', model: '', year: null, plate: plate, type: vType },
    plateState: plateState, truckNumber: null, trailerNumber: null,
    registrationStatus: 'pending', walkIn: true, payments: payments,
    paymentMethod: 'manual', rateType: rateType, dueDate: dueDate, smsConsent: smsConsent,
    membershipType: wiMembershipType
  };
  tenantData.renewalStatus = computeRenewalStatus(tenantData);

  try {
    var saved = await YB.saveTenant(tenantData);
    var tenants = await YB.loadTenants();
    APP_DATA.tenants = tenants;
    showToast('Walk-in checked in: '+name, 'success');
  } catch (err) {
    tenantData.id = generateId('t');
    APP_DATA.tenants.push(tenantData);
    showToast('Walk-in checked in: '+name+' (offline)', 'warning');
  }

  fireWebhookEvent('tenant.created', {
    name: name, email: email, company: company,
    lotId: lotId, spaceNumber: space, monthlyRate: rate, walkIn: true
  });

  if (payments.length) {
    sendGateCodeEmail({ name: name, email: email }, { welcome: true });
  }

  document.getElementById('walkInModal').classList.remove('open');
  updateTabCounts();
  renderTenantsTable();
}

// ── Export tenants CSV ────────────────────────────────────────────────────
function exportTenants() {
  var list = getFilteredTenants();
  exportToCSV(
    ['Name','Email','Phone','Company','Lot','Space(s)','Rate/Mo','Start','End','Status','Truck#','Trailer#','Plate','PlateState','InsurancePolicy','InsuranceCompany','InsuranceExp','AutoRenew','PaymentMethod','PriceLocked','MoveOutDate','RejectionReason','Balance'],
    list.map(function(t){ return [
      t.name, t.email, t.phone, t.company, getLotName(t.lotId),
      getTenantSpaceNumbers(t).join('; '), t.monthlyRate, t.startDate, t.endDate, t.status,
      t.truckNumber||'', t.trailerNumber||'',
      (t.vehicle?t.vehicle.plate:''), t.plateState||'',
      t.insurancePolicyNumber||'', t.insuranceCompany||'', t.insuranceExpDate||'',
      t.autoRenew?'Yes':'No', t.paymentMethod||'manual',
      t.priceLocked?'Yes':'No', t.moveOutDate||'', t.rejectionReason||'',
      computeTenantBalance(t)
    ]; }),
    'tenants-'+currentTab+'.csv'
  );
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  // Load tenants and lots from API; fall back to static APP_DATA on failure
  try {
    var tenants = await YB.loadTenants();
    APP_DATA.tenants = tenants;
    var lots = await YB.loadLots();
    if (lots && lots.length) APP_DATA.lots = lots;
  } catch (err) {
    console.warn('[YardBoss] API unavailable, using static data:', err.message);
  }

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

  // Walk-In button
  var walkInBtn = document.getElementById('walkInBtn');
  if (walkInBtn) walkInBtn.addEventListener('click', openWalkInModal);
  document.getElementById('walkInForm').addEventListener('submit', handleWalkInSubmit);
  document.getElementById('closeWalkInModal').addEventListener('click', function(){ document.getElementById('walkInModal').classList.remove('open'); });
  document.getElementById('cancelWalkInModal').addEventListener('click', function(){ document.getElementById('walkInModal').classList.remove('open'); });
  document.getElementById('walkInModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('wiPayAmount').addEventListener('input', function(){ updateCardFeeHint('wiPayAmount', 'wiPayMethod', 'wiCardFeeHint'); });
  document.getElementById('wiPayMethod').addEventListener('change', function(){ updateCardFeeHint('wiPayAmount', 'wiPayMethod', 'wiCardFeeHint'); });

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

  // Pricing plan dropdowns — repopulate when vehicle type changes, apply price when plan chosen
  document.getElementById('atVehicleType').addEventListener('change', function() {
    populatePricingPlanSelect(document.getElementById('atPricingPlan'), this.value);
    document.getElementById('atRateHint').textContent = '';
  });
  document.getElementById('atPricingPlan').addEventListener('change', function() {
    applyPricingPlanSelection(this, document.getElementById('atRate'), document.getElementById('atRateHint'),
      document.getElementById('atRateType'), document.getElementById('atStart'), document.getElementById('atDueDate'),
      document.getElementById('atAdditionalSpaces'));
  });
  document.getElementById('wiVehicleType').addEventListener('change', function() {
    populatePricingPlanSelect(document.getElementById('wiPricingPlan'), this.value);
    document.getElementById('wiRateHint').textContent = '';
  });
  document.getElementById('wiPricingPlan').addEventListener('change', function() {
    applyPricingPlanSelection(this, document.getElementById('wiRate'), document.getElementById('wiRateHint'),
      document.getElementById('wiRateType'), document.getElementById('wiStart'), document.getElementById('wiDueDate'),
      document.getElementById('wiAdditionalSpaces'));
  });

  // Recalculate the rate when "Additional Spaces" changes, as long as a
  // pricing plan (not manual entry) is selected.
  document.getElementById('atAdditionalSpaces').addEventListener('input', function() {
    if (document.getElementById('atPricingPlan').value) {
      applyPricingPlanSelection(document.getElementById('atPricingPlan'), document.getElementById('atRate'), document.getElementById('atRateHint'),
        document.getElementById('atRateType'), document.getElementById('atStart'), document.getElementById('atDueDate'),
        document.getElementById('atAdditionalSpaces'));
    }
  });
  document.getElementById('wiAdditionalSpaces').addEventListener('input', function() {
    if (document.getElementById('wiPricingPlan').value) {
      applyPricingPlanSelection(document.getElementById('wiPricingPlan'), document.getElementById('wiRate'), document.getElementById('wiRateHint'),
        document.getElementById('wiRateType'), document.getElementById('wiStart'), document.getElementById('wiDueDate'),
        document.getElementById('wiAdditionalSpaces'));
    }
  });

  // Insurance file input
  document.getElementById('atInsuranceFile').addEventListener('change', handleInsuranceFileChange);

  // Scan insurance button
  document.getElementById('atScanBtn').addEventListener('click', scanInsurance);

  // Move-Out modal
  document.getElementById('closeMoveOutModal').addEventListener('click', function(){ document.getElementById('moveOutModal').classList.remove('open'); });
  document.getElementById('cancelMoveOutModal').addEventListener('click', function(){ document.getElementById('moveOutModal').classList.remove('open'); });
  document.getElementById('moveOutModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('confirmMoveOutModalBtn').addEventListener('click', handleMoveOutSubmit);

  // Reject modal
  document.getElementById('closeRejectModal').addEventListener('click', function(){ document.getElementById('rejectModal').classList.remove('open'); });
  document.getElementById('cancelRejectModal').addEventListener('click', function(){ document.getElementById('rejectModal').classList.remove('open'); });
  document.getElementById('rejectModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('confirmRejectModalBtn').addEventListener('click', handleRejectSubmit);

  // Ledger entry modal (Add Charge / Record Payment)
  document.getElementById('closeLedgerEntryModal').addEventListener('click', function(){ document.getElementById('ledgerEntryModal').classList.remove('open'); });
  document.getElementById('cancelLedgerEntryModal').addEventListener('click', function(){ document.getElementById('ledgerEntryModal').classList.remove('open'); });
  document.getElementById('ledgerEntryModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('ledgerEntryForm').addEventListener('submit', handleLedgerEntrySubmit);
  document.getElementById('leAmount').addEventListener('input', function(){ updateCardFeeHint('leAmount', 'leMethod', 'leCardFeeHint'); });
  document.getElementById('leMethod').addEventListener('change', function(){ updateCardFeeHint('leAmount', 'leMethod', 'leCardFeeHint'); });

  // Additional Driver modal
  document.getElementById('closeAdditionalDriverModal').addEventListener('click', function(){ document.getElementById('additionalDriverModal').classList.remove('open'); });
  document.getElementById('cancelAdditionalDriverModal').addEventListener('click', function(){ document.getElementById('additionalDriverModal').classList.remove('open'); });
  document.getElementById('additionalDriverModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('additionalDriverForm').addEventListener('submit', handleAdditionalDriverSubmit);

  // Additional Space modal
  document.getElementById('closeAdditionalSpaceModal').addEventListener('click', function(){ document.getElementById('additionalSpaceModal').classList.remove('open'); });
  document.getElementById('cancelAdditionalSpaceModal').addEventListener('click', function(){ document.getElementById('additionalSpaceModal').classList.remove('open'); });
  document.getElementById('additionalSpaceModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('additionalSpaceForm').addEventListener('submit', handleAdditionalSpaceSubmit);

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

  // Bulk Update Period button
  var bulkPeriodBtn = document.getElementById('bulkPeriodBtn');
  if (bulkPeriodBtn) bulkPeriodBtn.addEventListener('click', openBulkPeriodModal);
  document.getElementById('closeBulkPeriodModal').addEventListener('click', function(){ document.getElementById('bulkPeriodModal').classList.remove('open'); });
  document.getElementById('cancelBulkPeriodModal').addEventListener('click', function(){ document.getElementById('bulkPeriodModal').classList.remove('open'); });
  document.getElementById('bulkPeriodModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('applyBulkPeriodBtn').addEventListener('click', applyBulkPeriod);
  document.querySelectorAll('.bulkp-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.bulkp-filter-btn').forEach(function(b){
        b.classList.remove('active');
        b.style.background='#fff'; b.style.color='var(--gray-500)'; b.style.borderColor='var(--gray-200)';
      });
      this.classList.add('active');
      this.style.background='#8b5cf6'; this.style.color='#fff'; this.style.borderColor='#8b5cf6';
      updateBulkPeriodPreview();
    });
  });

  // Load SMS templates and wire quick-fill buttons in broadcast modal
  (function loadBroadcastTemplates() {
    var btnContainer = document.getElementById('bcastTemplateBtns');
    if (!btnContainer) return;
    fetch('/api/sms-templates')
      .then(function(r){ return r.json(); })
      .then(function(templates) {
        btnContainer.innerHTML = '';
        Object.keys(templates).forEach(function(key) {
          var tpl = templates[key];
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = tpl.name;
          btn.style.cssText = 'padding:4px 10px;border-radius:99px;border:1.5px solid var(--gray-200);background:#fff;color:var(--gray-600);font-size:0.75rem;font-weight:500;cursor:pointer;';
          btn.addEventListener('mouseenter', function(){ this.style.borderColor='var(--teal)'; this.style.color='var(--teal)'; });
          btn.addEventListener('mouseleave', function(){ this.style.borderColor='var(--gray-200)'; this.style.color='var(--gray-600)'; });
          btn.addEventListener('click', function() {
            var bodyEl = document.getElementById('bcastBody');
            if (bodyEl) {
              bodyEl.value = tpl.body;
              bodyEl.dispatchEvent(new Event('input'));
              bodyEl.focus();
            }
          });
          btnContainer.appendChild(btn);
        });
      })
      .catch(function() {
        btnContainer.innerHTML = '<span style="font-size:0.78rem;color:var(--gray-400);">Templates unavailable</span>';
      });
  })();

  // Broadcast button
  var broadcastBtn = document.getElementById('broadcastBtn');
  if (broadcastBtn) broadcastBtn.addEventListener('click', openBroadcastModal);
  document.getElementById('closeBroadcastModal').addEventListener('click', function(){ document.getElementById('broadcastModal').classList.remove('open'); });
  document.getElementById('cancelBroadcastModal').addEventListener('click', function(){ document.getElementById('broadcastModal').classList.remove('open'); });
  document.getElementById('broadcastModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('sendBroadcastBtn').addEventListener('click', sendBroadcast);

  // Broadcast filter pill buttons
  document.querySelectorAll('.bcast-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.bcast-filter-btn').forEach(function(b){
        b.style.background='#fff'; b.style.color='var(--gray-500)'; b.style.borderColor='var(--gray-200)';
      });
      this.style.background='var(--teal)'; this.style.color='#fff'; this.style.borderColor='var(--teal)';
      updateBroadcastPreview();
    });
  });

  // Broadcast SMS toggle — show/hide segment counter
  document.getElementById('bcastSMS').addEventListener('change', function() {
    document.getElementById('bcastSMSNote').style.display = this.checked ? 'inline' : 'none';
    updateBroadcastPreview();
  });

  // Broadcast test phone — refresh preview as it's typed
  document.getElementById('bcastTestPhone').addEventListener('input', updateBroadcastPreview);

  // Broadcast subject row visible only when email checked
  document.getElementById('bcastEmail').addEventListener('change', function() {
    document.getElementById('bcastSubjectRow').style.display = this.checked ? '' : 'none';
  });

  // Char counter
  document.getElementById('bcastBody').addEventListener('input', function() {
    var len = this.value.length;
    document.getElementById('bcastCharCount').textContent = len;
    document.getElementById('bcastSMSSegments').textContent = Math.ceil(len / 160) || 1;
  });

  // Auto-open walk-in modal if URL has ?walkin=1
  if (new URLSearchParams(window.location.search).get('walkin') === '1') {
    openWalkInModal();
  }

  // Auto-open tenant panel if URL has ?tenant=<id> (e.g. from Billing Center)
  var tenantParam = new URLSearchParams(window.location.search).get('tenant');
  if (tenantParam && getTenant(tenantParam)) {
    openTenantPanel(tenantParam);
  }

  // Poynt modal events
  document.getElementById('closePoyntModal').addEventListener('click', function() {
    if (_poyntPollTimer) { clearInterval(_poyntPollTimer); _poyntPollTimer = null; }
    document.getElementById('poyntChargeModal').classList.remove('open');
  });
  document.getElementById('cancelPoyntModal').addEventListener('click', function() {
    if (_poyntPollTimer) { clearInterval(_poyntPollTimer); _poyntPollTimer = null; }
    document.getElementById('poyntChargeModal').classList.remove('open');
  });
  document.getElementById('poyntChargeModal').addEventListener('click', function(e) {
    if (e.target === this) {
      if (_poyntPollTimer) { clearInterval(_poyntPollTimer); _poyntPollTimer = null; }
      this.classList.remove('open');
    }
  });
  document.getElementById('submitPoyntCharge').addEventListener('click', submitPoyntCharge);

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key==='Escape') {
      closeTenantPanel();
      document.getElementById('walkInModal').classList.remove('open');
      document.getElementById('broadcastModal').classList.remove('open');
      document.getElementById('moveOutModal').classList.remove('open');
      document.getElementById('rejectModal').classList.remove('open');
      document.getElementById('ledgerEntryModal').classList.remove('open');
      document.getElementById('additionalDriverModal').classList.remove('open');
      if (_poyntPollTimer) { clearInterval(_poyntPollTimer); _poyntPollTimer = null; }
      document.getElementById('poyntChargeModal').classList.remove('open');
    }
  });
});

// ── Poynt Terminal Charge ─────────────────────────────────────────────────
var _poyntTenantId = null;
var _poyntPollTimer = null;
var _poyntTerminals = [];

function openPoyntChargeModal(tenantId) {
  var tenant = getTenant(tenantId);
  if (!tenant) return;
  _poyntTenantId = tenantId;
  if (_poyntPollTimer) { clearInterval(_poyntPollTimer); _poyntPollTimer = null; }

  // Reset UI
  document.getElementById('poyntLoadingTerminals').style.display = '';
  document.getElementById('poyntChargeForm').style.display = 'none';
  document.getElementById('poyntErrorState').style.display = 'none';
  document.getElementById('poyntChargeStatus').style.display = 'none';
  document.getElementById('submitPoyntCharge').disabled = false;
  document.getElementById('submitPoyntCharge').innerHTML = '<i class="fas fa-paper-plane"></i> Send to Terminal';

  // Pre-fill
  document.getElementById('poyntTenantName').value = tenant.name;
  document.getElementById('poyntAmount').value = tenant.monthlyRate ? Number(tenant.monthlyRate).toFixed(2) : '';
  var now = new Date();
  document.getElementById('poyntDescription').value = 'Monthly parking — '
    + now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.getElementById('poyntChargeModal').classList.add('open');

  fetch('/api/poynt/status')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('poyntLoadingTerminals').style.display = 'none';
      if (!data.configured) {
        document.getElementById('poyntErrorMsg').textContent = 'Poynt is not configured. Add credentials to .env files and restart the server.';
        document.getElementById('poyntErrorState').style.display = '';
        return;
      }
      if (data.error) {
        document.getElementById('poyntErrorMsg').textContent = 'Connection error: ' + data.error;
        document.getElementById('poyntErrorState').style.display = '';
        return;
      }
      _poyntTerminals = data.terminals || [];
      var sel = document.getElementById('poyntTerminalSelect');
      sel.innerHTML = _poyntTerminals.length
        ? _poyntTerminals.map(function(t) {
            var label = (t.storeName ? t.storeName + ' — ' : '') + t.terminalName;
            if (t.status && t.status !== 'UNKNOWN') label += ' (' + t.status + ')';
            return '<option value="' + t.terminalId + '" data-store="' + t.storeId + '">' + label + '</option>';
          }).join('')
        : '<option value="">No terminals found</option>';
      if (_poyntTerminals.length === 1) sel.value = _poyntTerminals[0].terminalId;
      document.getElementById('poyntChargeForm').style.display = '';
    })
    .catch(function(err) {
      document.getElementById('poyntLoadingTerminals').style.display = 'none';
      document.getElementById('poyntErrorMsg').textContent = 'Failed to load terminals: ' + err.message;
      document.getElementById('poyntErrorState').style.display = '';
    });
}

function submitPoyntCharge() {
  var sel = document.getElementById('poyntTerminalSelect');
  var terminalId = sel.value;
  if (!terminalId) { showToast('Please select a terminal', 'warning'); return; }

  var terminal = _poyntTerminals.find(function(t) { return t.terminalId === terminalId; });
  var storeId = terminal ? terminal.storeId : (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].dataset.store : '');
  if (!storeId) { showToast('Could not determine store ID for terminal', 'error'); return; }

  var amount = parseFloat(document.getElementById('poyntAmount').value);
  if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'warning'); return; }

  var tenant = getTenant(_poyntTenantId);
  var description = document.getElementById('poyntDescription').value.trim();

  var statusEl = document.getElementById('poyntChargeStatus');
  statusEl.style.display = '';
  statusEl.style.background = '#fefce8';
  statusEl.style.color = '#854d0e';
  statusEl.style.border = '1px solid #fde68a';
  statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending to terminal…';
  document.getElementById('submitPoyntCharge').disabled = true;

  fetch('/api/poynt/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: storeId,
      terminalId: terminalId,
      amount: amount,
      tenantId: _poyntTenantId,
      tenantName: tenant ? tenant.name : '',
      description: description,
    }),
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      statusEl.style.background = '#fee2e2';
      statusEl.style.color = '#991b1b';
      statusEl.style.border = '1px solid #fca5a5';
      statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.error;
      document.getElementById('submitPoyntCharge').disabled = false;
      return;
    }
    statusEl.style.background = '#dcfce7';
    statusEl.style.color = '#166534';
    statusEl.style.border = '1px solid #86efac';
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Sent! Waiting for customer to tap card…';
    startPoyntPoll(data.referenceId, amount, description);
  })
  .catch(function(err) {
    statusEl.style.background = '#fee2e2';
    statusEl.style.color = '#991b1b';
    statusEl.style.border = '1px solid #fca5a5';
    statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + err.message;
    document.getElementById('submitPoyntCharge').disabled = false;
  });
}

function startPoyntPoll(referenceId, amount, description) {
  var attempts = 0;
  var maxAttempts = 30;
  var statusEl = document.getElementById('poyntChargeStatus');

  _poyntPollTimer = setInterval(function() {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(_poyntPollTimer);
      _poyntPollTimer = null;
      statusEl.style.background = '#fefce8';
      statusEl.style.color = '#854d0e';
      statusEl.style.border = '1px solid #fde68a';
      statusEl.innerHTML = '<i class="fas fa-clock"></i> Timed out (90s). Check terminal status or record the payment manually.';
      document.getElementById('submitPoyntCharge').disabled = false;
      return;
    }
    fetch('/api/poynt/poll/' + encodeURIComponent(referenceId))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || data.error) return;
        var txnStatus = (data.status || '').toUpperCase();
        if (txnStatus === 'CAPTURED' || txnStatus === 'AUTHORIZED' || txnStatus === 'COMPLETED' || txnStatus === 'SALE') {
          clearInterval(_poyntPollTimer);
          _poyntPollTimer = null;
          var cardInfo = data.transaction && data.transaction.last4 ? ' (•••• ' + data.transaction.last4 + ')' : '';
          statusEl.style.background = '#dcfce7';
          statusEl.style.color = '#166534';
          statusEl.style.border = '1px solid #86efac';
          statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Approved' + cardInfo + '! Recording payment…';
          recordPoyntPayment(amount, description, data.transaction);
        } else if (txnStatus === 'VOIDED' || txnStatus === 'CANCELLED' || txnStatus === 'DECLINED' || txnStatus === 'REFUNDED') {
          clearInterval(_poyntPollTimer);
          _poyntPollTimer = null;
          statusEl.style.background = '#fee2e2';
          statusEl.style.color = '#991b1b';
          statusEl.style.border = '1px solid #fca5a5';
          statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Payment ' + txnStatus.toLowerCase() + '. Try again.';
          document.getElementById('submitPoyntCharge').disabled = false;
        }
      })
      .catch(function() {});
  }, 3000);
}

function recordPoyntPayment(amount, description, txn) {
  var tenant = getTenant(_poyntTenantId);
  if (!tenant) return;
  var last4 = txn && txn.last4 ? ' •••• ' + txn.last4 : '';
  var entry = {
    date: new Date().toISOString().slice(0, 10),
    amount: amount,
    status: 'paid',
    method: 'poynt',
    type: 'payment',
    description: description || ('Poynt terminal payment' + last4),
    poyntTransactionId: txn ? txn.id : null,
    last4: txn ? txn.last4 : null,
  };

  YB.addPayment(_poyntTenantId, entry)
    .then(function(updated) {
      tenant.payments = updated.payments;
      showToast('Payment of ' + formatCurrency(amount) + ' recorded for ' + tenant.name, 'success');
      setTimeout(function() {
        document.getElementById('poyntChargeModal').classList.remove('open');
        openTenantPanel(_poyntTenantId);
      }, 2000);
    })
    .catch(function() {
      tenant.payments = tenant.payments || [];
      tenant.payments.unshift(entry);
      showToast('Payment recorded (offline)', 'warning');
      setTimeout(function() {
        document.getElementById('poyntChargeModal').classList.remove('open');
        openTenantPanel(_poyntTenantId);
      }, 2000);
    });
}

// ── Broadcast Modal ───────────────────────────────────────────────────────
var _broadcastFilter = 'active';

function getBroadcastRecipients() {
  var filter = document.querySelector('.bcast-filter-btn[style*="var(--teal)"]');
  var f = filter ? filter.dataset.filter : 'active';
  if (f === 'all') return APP_DATA.tenants.slice();
  return APP_DATA.tenants.filter(function(t){ return t.status === f; });
}

function updateBroadcastPreview() {
  var list = getBroadcastRecipients();
  var withEmail = list.filter(function(t){ return t.email; }).length;
  var withSMSConsent = list.filter(function(t){ return t.phone && t.smsConsent; }).length;
  var el = document.getElementById('broadcastRecipientPreview');
  var html = '<strong style="color:var(--navy);">'+list.length+' tenant'+(list.length!==1?'s':'')+' selected</strong>'
    +' &nbsp;·&nbsp; '+withEmail+' with email &nbsp;·&nbsp; '+withSMSConsent+' opted in for SMS';
  var testPhone = document.getElementById('bcastTestPhone').value.trim();
  var viaSMS = document.getElementById('bcastSMS').checked;
  if (testPhone && viaSMS) html += ' &nbsp;·&nbsp; + 1 test number';
  el.innerHTML = html;
}

function openBroadcastModal() {
  document.getElementById('bcastSubject').value = '';
  document.getElementById('bcastBody').value = '';
  document.getElementById('bcastCharCount').textContent = '0';
  document.getElementById('bcastSMSSegments').textContent = '1';
  document.getElementById('bcastEmail').checked = true;
  document.getElementById('bcastSMS').checked = false;
  document.getElementById('bcastTestPhone').value = '';
  document.getElementById('bcastSMSNote').style.display = 'none';
  document.getElementById('bcastSubjectRow').style.display = '';
  // Reset filter pills to Active
  document.querySelectorAll('.bcast-filter-btn').forEach(function(b){
    b.style.background='#fff'; b.style.color='var(--gray-500)'; b.style.borderColor='var(--gray-200)';
  });
  var activeBtn = document.querySelector('.bcast-filter-btn[data-filter="active"]');
  if (activeBtn) { activeBtn.style.background='var(--teal)'; activeBtn.style.color='#fff'; activeBtn.style.borderColor='var(--teal)'; }
  updateBroadcastPreview();
  document.getElementById('broadcastModal').classList.add('open');
}

function sendBroadcast() {
  var body    = document.getElementById('bcastBody').value.trim();
  var subject = document.getElementById('bcastSubject').value.trim();
  var viaEmail = document.getElementById('bcastEmail').checked;
  var viaSMS   = document.getElementById('bcastSMS').checked;

  if (!body) { showToast('Please enter a message.', 'error'); return; }
  if (!viaEmail && !viaSMS) { showToast('Select at least one channel (Email or SMS).', 'error'); return; }
  if (viaEmail && !subject) { showToast('Please enter a subject for the email.', 'error'); return; }

  var list = getBroadcastRecipients();
  var testPhone = document.getElementById('bcastTestPhone').value.trim();
  if (!list.length && !testPhone) { showToast('No tenants match that filter.', 'error'); return; }

  var channels = [];
  if (viaEmail) channels.push('email');
  if (viaSMS)   channels.push('sms');

  var tenants = list.map(function(t) {
    return { name: t.name, email: t.email || '', phone: (t.smsConsent ? (t.phone || '') : '') };
  });

  if (testPhone && viaSMS) {
    tenants.push({ name: 'Test', email: '', phone: testPhone });
  }

  var btn = document.getElementById('sendBroadcastBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  fetch('/api/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenants: tenants, subject: subject, body: body, channels: channels })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.error) throw new Error(res.error);
    document.getElementById('broadcastModal').classList.remove('open');

    var parts = [];
    if (res.emailsSent)  parts.push(res.emailsSent + ' email' + (res.emailsSent !== 1 ? 's' : ''));
    if (res.smsSent)     parts.push(res.smsSent + ' SMS' + (res.smsSent !== 1 ? 's' : ''));
    var failed = (res.emailsFailed || 0) + (res.smsFailed || 0);
    var msg = (res.mock ? 'Broadcast queued (mock) \u2014 ' : 'Broadcast sent \u2014 ') + parts.join(' + ');
    if (failed) msg += ' (' + failed + ' failed)';
    showToast(msg, res.mock ? 'warning' : 'success');
  })
  .catch(function(e) { showToast('Broadcast failed: ' + e.message, 'error'); })
  .finally(function() {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Broadcast';
  });
}

// ── Bulk Update Lease Period ──────────────────────────────────────────────
// Lets staff roll every tenant's Start/End Date over to a new period (e.g.
// the start of a new month) in one click instead of editing each tenant.

function getBulkPeriodRecipients() {
  var filter = document.querySelector('.bulkp-filter-btn.active').dataset.filter;
  if (filter === 'all') return APP_DATA.tenants.slice();
  return APP_DATA.tenants.filter(function(t) { return t.status === 'active'; });
}

function updateBulkPeriodPreview() {
  var list = getBulkPeriodRecipients();
  document.getElementById('bulkPeriodPreview').textContent =
    list.length + ' tenant' + (list.length !== 1 ? 's' : '') + ' will be updated.';
}

function openBulkPeriodModal() {
  document.getElementById('bulkPeriodStart').value = '';
  document.getElementById('bulkPeriodEnd').value = '';
  document.querySelectorAll('.bulkp-filter-btn').forEach(function(b) {
    var isActive = b.dataset.filter === 'active';
    b.classList.toggle('active', isActive);
    b.style.background = isActive ? '#8b5cf6' : '#fff';
    b.style.color = isActive ? '#fff' : 'var(--gray-500)';
    b.style.borderColor = isActive ? '#8b5cf6' : 'var(--gray-200)';
  });
  updateBulkPeriodPreview();
  document.getElementById('bulkPeriodModal').classList.add('open');
}

async function applyBulkPeriod() {
  var start = document.getElementById('bulkPeriodStart').value;
  var end = document.getElementById('bulkPeriodEnd').value;
  if (!start || !end) { showToast('Please choose both a Start Date and End Date.', 'error'); return; }
  if (end < start) { showToast('End Date must be on or after Start Date.', 'error'); return; }

  var list = getBulkPeriodRecipients();
  if (!list.length) { showToast('No tenants match that filter.', 'error'); return; }

  if (!confirm('Set Start Date = ' + start + ' and End Date = ' + end + ' for ' + list.length + ' tenant' + (list.length !== 1 ? 's' : '') + '?')) return;

  var btn = document.getElementById('applyBulkPeriodBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  var failed = 0;
  for (var i = 0; i < list.length; i++) {
    try {
      await YB.saveTenant({ id: list[i].id, startDate: start, endDate: end });
    } catch (e) {
      failed++;
    }
  }

  try {
    APP_DATA.tenants = await YB.loadTenants();
  } catch (e) {}
  updateTabCounts();
  renderTenantsTable();

  document.getElementById('bulkPeriodModal').classList.remove('open');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Apply';

  var msg = 'Updated ' + (list.length - failed) + ' of ' + list.length + ' tenants.';
  showToast(msg, failed ? 'warning' : 'success');
}
