function renderGatesTable(lotFilter, statusFilter) {
  const tbody = document.getElementById('gatesTbody');
  if (!tbody) return;

  let gates = APP_DATA.gates.slice();

  if (lotFilter && lotFilter !== 'all') {
    gates = gates.filter(function (g) { return g.lotId === lotFilter; });
  }
  if (statusFilter && statusFilter !== 'all') {
    gates = gates.filter(function (g) { return g.status === statusFilter; });
  }

  if (gates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-shield-alt"></i><p>No gates found</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = gates.map(function (gate, index) {
    const lot = getLot(gate.lotId);
    const statusClass = gate.status === 'online' ? 'badge-green' : 'badge-red';
    const statusIcon = gate.status === 'online' ? 'fa-circle' : 'fa-circle-xmark';
    const statusText = gate.status === 'online' ? 'Online' : 'Offline';

    return '<tr id="gate-row-' + gate.gateId + '">' +
      '<td><code style="background:var(--gray-100);padding:2px 8px;border-radius:4px;font-size:0.8rem">' + gate.gateId + '</code></td>' +
      '<td>' + (lot ? lot.name : gate.lotId) + '</td>' +
      '<td><strong>' + gate.gateName + '</strong></td>' +
      '<td><code style="font-size:0.8rem;color:var(--gray-600)">' + gate.deviceId + '</code></td>' +
      '<td><span class="badge ' + statusClass + '" id="status-badge-' + gate.gateId + '">' +
        '<i class="fas ' + statusIcon + '" style="font-size:0.6rem;margin-right:3px"></i>' + statusText +
        '</span></td>' +
      '<td style="font-size:0.82rem;color:var(--gray-500)">' + timeAgo(gate.lastPing) + '</td>' +
      '<td>' +
        '<div style="display:flex;gap:6px;">' +
        '<button class="btn-icon" title="Edit Gate" onclick="editGate(\'' + gate.gateId + '\')"><i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon danger" title="Delete Gate" onclick="deleteGate(\'' + gate.gateId + '\')"><i class="fas fa-trash"></i></button>' +
        '<button class="btn-secondary" style="padding:4px 10px;font-size:0.75rem" id="ping-btn-' + gate.gateId + '" onclick="testPing(\'' + gate.gateId + '\')"><i class="fas fa-wifi"></i> Ping</button>' +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function testPing(gateId) {
  const badge = document.getElementById('status-badge-' + gateId);
  const btn = document.getElementById('ping-btn-' + gateId);
  if (!badge || !btn) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
  badge.className = 'badge badge-yellow';
  badge.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:0.6rem;margin-right:3px"></i>Testing...';

  setTimeout(function () {
    const gate = APP_DATA.gates.find(function (g) { return g.gateId === gateId; });
    if (gate) {
      const wasOffline = gate.status === 'offline';
      gate.status = wasOffline ? 'online' : gate.status;
      gate.lastPing = new Date().toISOString();

      badge.className = 'badge badge-green';
      badge.innerHTML = '<i class="fas fa-circle" style="font-size:0.6rem;margin-right:3px"></i>Online';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Responded';
      btn.style.borderColor = 'var(--green)';
      btn.style.color = '#16a34a';

      setTimeout(function () {
        btn.innerHTML = '<i class="fas fa-wifi"></i> Ping';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }
  }, 1500);
}

function editGate(gateId) {
  const gate = APP_DATA.gates.find(function (g) { return g.gateId === gateId; });
  if (!gate) return;

  document.getElementById('gateModalTitle').textContent = 'Edit Gate';
  document.getElementById('gateIdInput').value = gate.gateId;
  document.getElementById('gateIdInput').readOnly = true;
  document.getElementById('gateNameInput').value = gate.gateName;
  document.getElementById('gateLotInput').value = gate.lotId;
  document.getElementById('gateDeviceInput').value = gate.deviceId;
  document.getElementById('gateStatusInput').value = gate.status;
  document.getElementById('gateForm').dataset.editId = gateId;
  document.getElementById('gateModal').classList.add('open');
}

function deleteGate(gateId) {
  if (!confirm('Are you sure you want to delete gate ' + gateId + '? This action cannot be undone.')) return;
  const idx = APP_DATA.gates.findIndex(function (g) { return g.gateId === gateId; });
  if (idx > -1) {
    APP_DATA.gates.splice(idx, 1);
    applyFilters();
  }
}

function applyFilters() {
  const lotFilter = document.getElementById('lotFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  renderGatesTable(lotFilter, statusFilter);
}

document.addEventListener('DOMContentLoaded', function () {
  renderGatesTable('all', 'all');

  document.getElementById('lotFilter').addEventListener('change', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);

  document.getElementById('addGateBtn').addEventListener('click', function () {
    document.getElementById('gateModalTitle').textContent = 'Add Gate';
    document.getElementById('gateIdInput').value = '';
    document.getElementById('gateIdInput').readOnly = false;
    document.getElementById('gateNameInput').value = '';
    document.getElementById('gateLotInput').value = 'lot-1';
    document.getElementById('gateDeviceInput').value = '';
    document.getElementById('gateStatusInput').value = 'online';
    delete document.getElementById('gateForm').dataset.editId;
    document.getElementById('gateModal').classList.add('open');
  });

  document.getElementById('closeGateModal').addEventListener('click', function () {
    document.getElementById('gateModal').classList.remove('open');
  });

  document.getElementById('cancelGateModal').addEventListener('click', function () {
    document.getElementById('gateModal').classList.remove('open');
  });

  document.getElementById('gateModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });

  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const editId = this.dataset.editId;
    const newGate = {
      gateId: document.getElementById('gateIdInput').value.trim(),
      gateName: document.getElementById('gateNameInput').value.trim(),
      lotId: document.getElementById('gateLotInput').value,
      deviceId: document.getElementById('gateDeviceInput').value.trim(),
      status: document.getElementById('gateStatusInput').value,
      lastPing: new Date().toISOString()
    };

    if (editId) {
      const idx = APP_DATA.gates.findIndex(function (g) { return g.gateId === editId; });
      if (idx > -1) {
        APP_DATA.gates[idx] = newGate;
      }
    } else {
      APP_DATA.gates.push(newGate);
    }

    document.getElementById('gateModal').classList.remove('open');
    applyFilters();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.getElementById('gateModal').classList.remove('open');
    }
  });
});
