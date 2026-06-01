// YardBoss — lots.js  |  Full Manage Lots functionality

function getOccupiedSpaces(lotId) {
  return APP_DATA.tenants.filter(function(t){ return t.lotId===lotId && t.status==='active'; }).map(function(t){ return t.spaceNumber; });
}
function getReservedSpaces(lotId) {
  return APP_DATA.tenants.filter(function(t){ return t.lotId===lotId && t.status==='pending'; }).map(function(t){ return t.spaceNumber; });
}

function generateSpaceNumbers(lot) {
  // Generate spaces using section prefixes from spaceNumber patterns in tenant data
  var spaces = [];
  for (var i=1; i<=lot.totalSpaces; i++) {
    // Alternate R (RV) and T (Truck) sections based on index
    var section = i <= Math.floor(lot.totalSpaces * 0.6) ? 'R' : 'T';
    var num = i <= Math.floor(lot.totalSpaces * 0.6) ? i : i - Math.floor(lot.totalSpaces * 0.6);
    spaces.push(section+'-'+String(num).padStart(2,'0'));
  }
  return spaces;
}

function renderLotsTable(filter) {
  var tbody = document.getElementById('lotsTbody');
  if (!tbody) return;
  var lots = APP_DATA.lots.slice();
  if (filter) {
    var q = filter.toLowerCase();
    lots = lots.filter(function(l){ return l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.city.toLowerCase().includes(q); });
  }
  if (!lots.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-warehouse"></i><p>No lots found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = lots.map(function(lot) {
    var occupied = getOccupiedSpaces(lot.id).length;
    var reserved = getReservedSpaces(lot.id).length;
    var vacant = lot.totalSpaces - occupied - reserved;
    var pct = Math.round((occupied/lot.totalSpaces)*100);
    var statusClass = lot.status==='active'?'badge-green':lot.status==='pending'?'badge-yellow':'badge-red';
    var statusText = lot.status.charAt(0).toUpperCase()+lot.status.slice(1);
    var bar = '<div style="display:flex;align-items:center;gap:6px;">'
      +'<div style="flex:1;height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden;">'
      +'<div style="width:'+pct+'%;height:100%;background:var(--teal);border-radius:99px;"></div></div>'
      +'<span style="font-size:0.72rem;color:var(--gray-500);white-space:nowrap;">'+pct+'%</span></div>';
    return '<tr>'
      +'<td><div style="font-weight:700;color:var(--navy);">'+lot.name+'</div>'
      +'<div style="font-size:0.75rem;color:var(--gray-400);margin-top:2px;">'+lot.city+', '+lot.state+' '+lot.zip+'</div></td>'
      +'<td style="font-size:0.82rem;color:var(--gray-600);">'+lot.address+'</td>'
      +'<td><strong style="font-size:1.05rem;">'+lot.totalSpaces+'</strong></td>'
      +'<td><div style="font-size:0.82rem;margin-bottom:4px;">'
      +'<span style="color:var(--green);">'+occupied+' occ</span> · '
      +'<span style="color:var(--yellow);">'+reserved+' res</span> · '
      +'<span style="color:var(--gray-400);">'+vacant+' vacant</span></div>'+bar+'</td>'
      +'<td><span style="font-size:0.8rem;color:var(--gray-600);">'+lot.amenities.length+' amenities</span></td>'
      +'<td><span class="badge '+statusClass+'">'+statusText+'</span></td>'
      +'<td><div style="display:flex;gap:5px;flex-wrap:wrap;">'
      +'<button class="btn btn-secondary btn-sm" onclick="openSpacesModal(\''+lot.id+'\')"><i class="fas fa-th-large"></i> Spaces</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="openRentRollModal(\''+lot.id+'\')"><i class="fas fa-file-invoice-dollar"></i> Rent Roll</button>'
      +'</div></td>'
      +'<td><div style="display:flex;gap:5px;">'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="openEditModal(\''+lot.id+'\')"><i class="fas fa-pen"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="QR Code" onclick="openQRModal(\''+lot.id+'\')"><i class="fas fa-qrcode"></i></button>'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Preview" onclick="openPreviewModal(\''+lot.id+'\')"><i class="fas fa-eye"></i></button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
}

// ── Spaces Modal ──────────────────────────────────────────────────────────
function openSpacesModal(lotId) {
  var lot = getLot(lotId);
  if (!lot) return;
  var occupied = getOccupiedSpaces(lotId);
  var reserved = getReservedSpaces(lotId);
  // Build full space list from tenant data patterns
  var allSpaces = [];
  for (var i=1; i<=80; i++) allSpaces.push('R-'+String(i).padStart(2,'0'));
  for (var j=1; j<=60; j++) allSpaces.push('T-'+String(j).padStart(2,'0'));
  allSpaces = allSpaces.slice(0, lot.totalSpaces);

  document.getElementById('spacesModalTitle').textContent = lot.name+' — Space Map';
  var vacantCount = allSpaces.length - occupied.length - reserved.length;
  document.getElementById('legendOccupied').textContent = 'Occupied ('+occupied.length+')';
  document.getElementById('legendReserved').textContent = 'Reserved ('+reserved.length+')';
  document.getElementById('legendVacant').textContent = 'Vacant ('+vacantCount+')';

  var grid = document.getElementById('spaceGrid');
  grid.innerHTML = allSpaces.map(function(sp) {
    var cls = occupied.includes(sp)?'occupied':reserved.includes(sp)?'reserved':'vacant';
    var tenant = APP_DATA.tenants.find(function(t){ return t.spaceNumber===sp && t.lotId===lotId; });
    var tip = tenant ? sp+'\n'+tenant.name : sp;
    return '<div class="space-tile '+cls+'" title="'+tip+'">'+sp+'</div>';
  }).join('');
  openModal('spacesModal');
}

// ── Rent Roll Modal ────────────────────────────────────────────────────────
function openRentRollModal(lotId) {
  var lot = getLot(lotId);
  var tenants = APP_DATA.tenants.filter(function(t){ return t.lotId===lotId; });
  var active = tenants.filter(function(t){ return t.status==='active'; });
  var totalRev = active.reduce(function(s,t){ return s+t.monthlyRate; },0);

  document.getElementById('rentRollTitle').textContent = 'Rent Roll — '+lot.name;
  document.getElementById('rentRollSummary').innerHTML =
    '<div style="display:flex;gap:24px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--gray-200);margin-bottom:14px;">'
    +'<div><div style="font-size:0.72rem;text-transform:uppercase;color:var(--gray-400);letter-spacing:0.5px;">Active Tenants</div><div style="font-size:1.4rem;font-weight:800;color:var(--navy);">'+active.length+'</div></div>'
    +'<div><div style="font-size:0.72rem;text-transform:uppercase;color:var(--gray-400);letter-spacing:0.5px;">Monthly Revenue</div><div style="font-size:1.4rem;font-weight:800;color:var(--teal);">'+formatCurrency(totalRev)+'</div></div>'
    +'<div><div style="font-size:0.72rem;text-transform:uppercase;color:var(--gray-400);letter-spacing:0.5px;">Avg Rate</div><div style="font-size:1.4rem;font-weight:800;color:var(--navy);">'+(active.length?formatCurrency(Math.round(totalRev/active.length)):'—')+'</div></div>'
    +'</div>';

  var rows = tenants.map(function(t) {
    var last = t.payments[0];
    var payBadge = last ? ('<span class="badge '+(last.status==='paid'?'badge-green':last.status==='late'?'badge-yellow':'badge-red')+'">'+last.status.charAt(0).toUpperCase()+last.status.slice(1)+'</span>') : '—';
    var stBadge = '<span class="badge '+(t.status==='active'?'badge-green':t.status==='pending'?'badge-yellow':'badge-gray')+'">'+t.status.charAt(0).toUpperCase()+t.status.slice(1)+'</span>';
    return '<tr><td>'+t.name+'</td><td>'+t.spaceNumber+'</td><td>'+t.vehicle.type+'</td><td>'+formatCurrency(t.monthlyRate)+'</td><td>'+formatDate(t.startDate)+'</td><td>'+formatDate(t.endDate)+'</td><td>'+payBadge+'</td><td>'+stBadge+'</td></tr>';
  }).join('');

  document.getElementById('rentRollTable').innerHTML = rows || '<tr><td colspan="8" class="empty-state">No tenants</td></tr>';
  document.getElementById('rentRollExportBtn').onclick = function() {
    exportToCSV(
      ['Name','Space','Vehicle Type','Rate/Mo','Start','End','Last Payment','Status'],
      tenants.map(function(t){ var last=t.payments[0]; return [t.name,t.spaceNumber,t.vehicle.type,t.monthlyRate,t.startDate,t.endDate,last?last.status:'',t.status]; }),
      'rent-roll-'+lot.name.replace(/\s+/g,'-').toLowerCase()+'.csv'
    );
  };
  openModal('rentRollModal');
}

// ── QR Modal ──────────────────────────────────────────────────────────────
function openQRModal(lotId) {
  var lot = getLot(lotId);
  var portalUrl = window.location.origin+'/portal/book.html?lot='+lotId;
  document.getElementById('qrModalTitle').textContent = 'QR Code — '+lot.name;
  document.getElementById('qrLotName').textContent = lot.name;
  document.getElementById('qrAddress').textContent = lot.address+', '+lot.city+', '+lot.state;
  document.getElementById('qrUrl').textContent = portalUrl;
  document.getElementById('qrUrl').href = portalUrl;
  // Render a visual QR placeholder (actual QR lib can be dropped in later)
  var qrDiv = document.getElementById('qrCodeDisplay');
  qrDiv.innerHTML = '<div style="width:180px;height:180px;background:#f1f5f9;border:2px dashed var(--gray-300);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;margin:0 auto;">'
    +'<i class="fas fa-qrcode" style="font-size:3rem;color:var(--navy);"></i>'
    +'<div style="font-size:0.72rem;color:var(--gray-400);text-align:center;padding:0 12px;">QR generated on print<br>Points to booking portal</div>'
    +'</div>';
  openModal('qrModal');
}

// ── Preview Modal ─────────────────────────────────────────────────────────
function openPreviewModal(lotId) {
  var lot = getLot(lotId);
  var occupied = getOccupiedSpaces(lotId).length;
  var vacant = lot.totalSpaces - occupied;
  var minRate = lot.monthlyRates ? Math.min.apply(null, Object.values(lot.monthlyRates)) : 0;

  document.getElementById('previewModalTitle').textContent = 'Public Preview — '+lot.name;
  document.getElementById('previewContent').innerHTML =
    '<div style="background:var(--navy);border-radius:10px;padding:28px;color:white;margin-bottom:16px;">'
    +'<div style="font-size:1.4rem;font-weight:800;margin-bottom:4px;">'+lot.name+'</div>'
    +'<div style="color:rgba(255,255,255,0.65);font-size:0.875rem;margin-bottom:16px;"><i class="fas fa-map-marker-alt" style="color:var(--teal);margin-right:6px;"></i>'+lot.address+', '+lot.city+', '+lot.state+' '+lot.zip+'</div>'
    +'<div style="display:flex;gap:24px;flex-wrap:wrap;">'
    +'<div><div style="font-size:1.6rem;font-weight:800;color:var(--teal);">'+vacant+'</div><div style="font-size:0.72rem;color:rgba(255,255,255,0.55);text-transform:uppercase;">Available</div></div>'
    +'<div><div style="font-size:1.6rem;font-weight:800;">'+lot.totalSpaces+'</div><div style="font-size:0.72rem;color:rgba(255,255,255,0.55);text-transform:uppercase;">Total Spaces</div></div>'
    +'<div><div style="font-size:1.6rem;font-weight:800;color:var(--teal);">$'+minRate+'</div><div style="font-size:0.72rem;color:rgba(255,255,255,0.55);text-transform:uppercase;">From / Month</div></div>'
    +'</div></div>'
    +'<div style="margin-bottom:14px;"><div style="font-size:0.78rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Amenities</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px;">'+lot.amenities.map(function(a){ return '<span class="badge badge-teal"><i class="fas fa-check" style="margin-right:4px;font-size:0.65rem;"></i>'+a+'</span>'; }).join('')+'</div></div>'
    +'<div style="display:flex;gap:8px;margin-top:16px;">'
    +'<a href="/portal/book.html?lot='+lotId+'" target="_blank" class="btn btn-primary" style="flex:1;justify-content:center;"><i class="fas fa-external-link-alt"></i> Open Public Listing</a>'
    +'</div>';
  openModal('previewModal');
}

// ── Generic modal helpers ─────────────────────────────────────────────────
function openModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ── Edit / Add Lot Modal ──────────────────────────────────────────────────
function openEditModal(lotId) {
  var lot = getLot(lotId);
  document.getElementById('editLotTitle').textContent = lot ? 'Edit — '+lot.name : 'Add New Lot';
  document.getElementById('editLotName').value   = lot ? lot.name : '';
  document.getElementById('editLotAddress').value= lot ? lot.address : '';
  document.getElementById('editLotCity').value   = lot ? lot.city : '';
  document.getElementById('editLotState').value  = lot ? lot.state : 'FL';
  document.getElementById('editLotZip').value    = lot ? (lot.zip||'') : '';
  document.getElementById('editLotSpaces').value = lot ? lot.totalSpaces : '';
  document.getElementById('editLotStatus').value = lot ? lot.status : 'active';

  // Amenities checkboxes
  var amenityBoxes = document.querySelectorAll('#amenityCheckboxes input[type=checkbox]');
  amenityBoxes.forEach(function(cb) {
    cb.checked = lot ? lot.amenities.includes(cb.value) : false;
  });

  document.getElementById('editLotForm').dataset.lotId = lotId || '';
  openModal('editLotModal');
}

function handleEditLotSubmit(e) {
  e.preventDefault();
  var form = document.getElementById('editLotForm');
  var lotId = form.dataset.lotId;

  var name    = document.getElementById('editLotName').value.trim();
  var address = document.getElementById('editLotAddress').value.trim();
  var city    = document.getElementById('editLotCity').value.trim();
  var state   = document.getElementById('editLotState').value.trim();
  var zip     = document.getElementById('editLotZip').value.trim();
  var spaces  = parseInt(document.getElementById('editLotSpaces').value);
  var status  = document.getElementById('editLotStatus').value;

  if (!name || !address || !spaces) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  var amenities = [];
  document.querySelectorAll('#amenityCheckboxes input[type=checkbox]:checked').forEach(function(cb) {
    amenities.push(cb.value);
  });

  if (lotId) {
    // UPDATE existing lot
    var lot = getLot(lotId);
    if (lot) {
      lot.name = name; lot.address = address; lot.city = city;
      lot.state = state; lot.zip = zip; lot.totalSpaces = spaces;
      lot.status = status; lot.amenities = amenities;
      showToast('Lot updated: '+name, 'success');
    }
  } else {
    // CREATE new lot
    var newId = 'lot-'+generateId('l');
    APP_DATA.lots.push({
      id: newId, name: name, address: address, city: city, state: state, zip: zip,
      totalSpaces: spaces, status: status, amenities: amenities,
      spaceTypes: ['Standard', 'RV', 'Truck'],
      monthlyRates: { 'Standard': 200, 'RV': 175, 'Truck': 275 },
      image: null
    });
    // Sync backend store
    fetch('/api/lots', { method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: newId, name, address, city, state, zip, totalSpaces: spaces, status, amenities })
    }).catch(function(){});
    showToast('New lot added: '+name, 'success');
  }

  renderLotsTable(document.getElementById('lotSearch').value);
  closeModal('editLotModal');
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  renderLotsTable('');

  // Search
  var search = document.getElementById('lotSearch');
  if (search) search.addEventListener('input', function(){ renderLotsTable(this.value); });

  // Add Lot button (cmd-strip)
  var addBtn = document.getElementById('addLotBtn');
  if (addBtn) addBtn.addEventListener('click', function(){ openEditModal(null); });

  // Form submit
  var form = document.getElementById('editLotForm');
  if (form) form.addEventListener('submit', handleEditLotSubmit);

  // Close buttons
  ['closeSpacesModal','closeEditModal','cancelEditModal',
   'closeRentRollModal','closeQRModal','closePreviewModal'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() {
      var modal = this.closest('.modal-backdrop');
      if (modal) closeModal(modal.id);
    });
  });

  // Backdrop click to close
  document.querySelectorAll('.modal-backdrop').forEach(function(bd) {
    bd.addEventListener('click', function(e) {
      if (e.target === this) closeModal(this.id);
    });
  });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key==='Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(function(m){ closeModal(m.id); });
    }
  });
});
