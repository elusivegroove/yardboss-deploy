// YardBoss Portal — Self-Service Profile Completion
(function () {
  var params = new URLSearchParams(window.location.search);
  var tenantId = params.get('t');
  var tenant = null;
  var _pendingInsuranceDoc = null;

  var loadingEl = document.getElementById('profileLoading');
  var contentEl = document.getElementById('profileContent');
  var errorEl   = document.getElementById('profileError');

  if (!tenantId) {
    showError('Missing profile link reference.');
    return;
  }

  fetch('/api/tenants/' + encodeURIComponent(tenantId))
    .then(function (res) {
      if (!res.ok) throw new Error('not found');
      return res.json();
    })
    .then(render)
    .catch(function () { showError(); });

  function showError(msg) {
    loadingEl.style.display = 'none';
    if (msg) document.getElementById('profileErrorMsg').textContent = msg;
    errorEl.style.display = '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(t) {
    tenant = t;

    document.getElementById('profileTenantName').textContent = t.name;
    var spaceNums = (t.spaceNumbers && t.spaceNumbers.length) ? t.spaceNumbers : [t.spaceNumber || '—'];
    document.getElementById('profileSpace').textContent =
      (t.company ? t.company + ' — ' : '') + 'Space' + (spaceNums.length > 1 ? 's ' : ' ') + spaceNums.join(', ');

    var v = t.vehicle || {};
    document.getElementById('vehicleMake').value = v.make || '';
    document.getElementById('vehicleModel').value = v.model || '';
    document.getElementById('vehicleYear').value = v.year || '';
    document.getElementById('vehicleType').value = v.type || 'Semi Truck';
    document.getElementById('vehiclePlate').value = v.plate || '';
    document.getElementById('plateState').value = t.plateState || '';
    document.getElementById('truckNumber').value = t.truckNumber || '';
    document.getElementById('trailerNumber').value = t.trailerNumber || '';
    document.getElementById('insurancePolicyNumber').value = t.insurancePolicyNumber || '';
    document.getElementById('insuranceCompany').value = t.insuranceCompany || '';
    document.getElementById('insuranceExpDate').value = t.insuranceExpDate || '';

    if (t.insuranceDoc && t.insuranceDoc.data) {
      _pendingInsuranceDoc = t.insuranceDoc;
      document.getElementById('insuranceFileName').textContent = t.insuranceDoc.name || 'Existing document';
      renderInsurancePreview();
    }

    renderDrivers();

    loadingEl.style.display = 'none';
    contentEl.style.display = '';
  }

  function renderInsurancePreview() {
    var preview = document.getElementById('insurancePreview');
    if (!_pendingInsuranceDoc) { preview.innerHTML = ''; return; }
    var doc = _pendingInsuranceDoc;
    var src = 'data:' + doc.type + ';base64,' + doc.data;
    if (doc.type && doc.type.startsWith('image/')) {
      preview.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:140px;border-radius:6px;border:1px solid var(--gray-200);">';
    } else {
      preview.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;background:var(--gray-50);border-radius:6px;font-size:0.82rem;"><i class="fas fa-file-pdf" style="color:#ef4444;font-size:1.1rem;"></i>' + escapeHtml(doc.name || 'Insurance document') + '</div>';
    }
  }

  function renderDrivers() {
    var drivers = tenant.additionalDrivers || [];
    var el = document.getElementById('driversList');
    el.innerHTML = drivers.length
      ? drivers.map(function (d) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">'
            + '<div style="display:flex;flex-direction:column;gap:2px;">'
            + '<span style="font-size:0.85rem;font-weight:600;color:var(--navy);">' + escapeHtml(d.name) + '</span>'
            + '<span style="font-size:0.75rem;color:var(--gray-400);">' + [d.phone, d.license ? 'Lic# ' + d.license : null].filter(Boolean).map(escapeHtml).join(' · ') + '</span>'
            + '</div>'
            + '<button type="button" class="btn-back" style="padding:6px 10px;" onclick="window._profileRemoveDriver(\'' + d.id + '\')"><i class="fas fa-times"></i></button>'
            + '</div>';
        }).join('')
      : '<p style="color:var(--gray-400);font-size:0.82rem;padding:4px 0;">No additional drivers added yet.</p>';
  }

  window._profileRemoveDriver = function (driverId) {
    tenant.additionalDrivers = (tenant.additionalDrivers || []).filter(function (d) { return d.id !== driverId; });
    renderDrivers();
  };

  document.getElementById('addDriverBtn').addEventListener('click', function () {
    var name = document.getElementById('newDriverName').value.trim();
    var phone = document.getElementById('newDriverPhone').value.trim();
    var license = document.getElementById('newDriverLicense').value.trim();
    if (!name) { showToast('Please enter the driver\'s name.', 'error'); return; }

    var driver = { id: 'drv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: name, phone: phone, license: license };
    tenant.additionalDrivers = (tenant.additionalDrivers || []).concat([driver]);
    renderDrivers();

    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    document.getElementById('newDriverLicense').value = '';
  });

  document.getElementById('insuranceFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    document.getElementById('insuranceFileName').textContent = file.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var base64 = ev.target.result.split(',')[1];
      _pendingInsuranceDoc = { name: file.name, type: file.type, data: base64 };
      renderInsurancePreview();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('profileForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('profileSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    var yearVal = document.getElementById('vehicleYear').value;
    var payload = {
      id: tenantId,
      vehicle: {
        make: document.getElementById('vehicleMake').value.trim(),
        model: document.getElementById('vehicleModel').value.trim(),
        year: yearVal ? parseInt(yearVal, 10) : null,
        plate: document.getElementById('vehiclePlate').value.trim(),
        type: document.getElementById('vehicleType').value
      },
      plateState: document.getElementById('plateState').value.trim().toUpperCase(),
      truckNumber: document.getElementById('truckNumber').value.trim(),
      trailerNumber: document.getElementById('trailerNumber').value.trim(),
      insurancePolicyNumber: document.getElementById('insurancePolicyNumber').value.trim(),
      insuranceCompany: document.getElementById('insuranceCompany').value.trim(),
      insuranceExpDate: document.getElementById('insuranceExpDate').value || null,
      additionalDrivers: tenant.additionalDrivers || []
    };
    if (_pendingInsuranceDoc) payload.insuranceDoc = _pendingInsuranceDoc;

    fetch('/api/tenants/' + encodeURIComponent(tenantId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { if (!r.ok) throw new Error('failed'); return r.json(); })
      .then(function (updated) {
        tenant = updated;
        showToast('Profile updated successfully!', 'success');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
      })
      .catch(function () {
        showToast('Could not save your profile. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
      });
  });
})();
