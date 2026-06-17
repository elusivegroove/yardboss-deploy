// YardBoss — Billing Center

var _billingSearch = '';

function getBillingTenants() {
  var list = getReceivables();
  if (_billingSearch) {
    var q = _billingSearch.toLowerCase();
    list = list.filter(function(r) {
      return r.tenant.name.toLowerCase().includes(q)
        || r.tenant.company.toLowerCase().includes(q);
    });
  }
  return list;
}

function renderBillingKPIs() {
  var strip = document.getElementById('billingKpiStrip');
  if (!strip) return;

  var receivables = getReceivables();
  var totalDue = receivables.reduce(function(s, r) { return s + r.balance; }, 0);

  var today = new Date();
  var collectedThisMonth = 0;
  APP_DATA.tenants.forEach(function(t) {
    (t.payments || []).forEach(function(p) {
      if (p.type === 'charge') return;
      var d = new Date(p.date + 'T00:00:00');
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) {
        collectedThisMonth += Number(p.amount);
      }
    });
  });

  var autoPayActive = APP_DATA.tenants.filter(function(t) { return t.paymentMethod === 'autopay'; }).length;

  var tiles = [
    {
      label: 'Total Receivables', value: formatCurrency(totalDue),
      icon: 'fa-file-invoice-dollar', tileClass: 'red',
      sub: 'Outstanding balances'
    },
    {
      label: 'Tenants Past Due', value: receivables.length,
      icon: 'fa-user-clock', tileClass: 'yellow',
      sub: 'With a balance owed'
    },
    {
      label: 'Collected This Month', value: formatCurrency(collectedThisMonth),
      icon: 'fa-sack-dollar', tileClass: 'teal',
      sub: today.toLocaleDateString('en-US', { month: 'long' })
    },
    {
      label: 'Auto-Pay Active', value: autoPayActive,
      icon: 'fa-credit-card', tileClass: 'navy',
      sub: 'Tenants on auto-pay'
    }
  ];

  strip.innerHTML = tiles.map(function(t) {
    return '<div class="kpi-tile ' + t.tileClass + '">' +
      '<div class="kpi-bg-icon"><i class="fas ' + t.icon + '"></i></div>' +
      '<div class="kpi-label">' + t.label + '</div>' +
      '<div class="kpi-value">' + t.value + '</div>' +
      '<div class="kpi-sub">' + t.sub + '</div>' +
      '</div>';
  }).join('');
}

function renderBillingTable() {
  var tbody = document.getElementById('billingTbody');
  if (!tbody) return;

  var list = getBillingTenants();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-circle-check"></i><p>No outstanding balances. Everyone is paid up!</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function(r) {
    var t = r.tenant;
    var lot = getLot(t.lotId);
    var methodBadge = t.paymentMethod === 'autopay'
      ? '<span class="badge badge-teal"><i class="fas fa-credit-card" style="margin-right:4px;"></i>Auto-Pay</span>'
      : '<span class="badge badge-gray"><i class="fas fa-money-bill-wave" style="margin-right:4px;"></i>Manual</span>';

    var allSpaces = [t.spaceNumber].filter(Boolean).concat(t.additionalSpaces || []);
    var spacesStr = allSpaces.length ? allSpaces.join(', ') : '—';
    return '<tr>'
      +'<td><div style="font-weight:600;color:var(--navy);">'+t.name+'</div><div style="font-size:0.75rem;color:var(--gray-400);">'+t.company+'</div></td>'
      +'<td style="font-size:0.82rem;">'+(lot?lot.name:'—')+' &nbsp;·&nbsp; '+(allSpaces.length>1?'Spaces ':'Space ')+spacesStr+'</td>'
      +'<td><span class="badge badge-red">'+formatCurrency(r.balance)+'</span></td>'
      +'<td>'+methodBadge+'</td>'
      +'<td>'
      +'<div style="display:flex;gap:5px;">'
      +'<button class="btn btn-secondary btn-sm btn-icon" title="Copy Payment Link" onclick="copyPaymentLink(\''+t.id+'\')"><i class="fas fa-link"></i></button>'
      +'<button class="btn btn-primary btn-sm" onclick="window.location.href=\'reservations.html?tenant='+t.id+'\'"><i class="fas fa-book"></i> View Ledger</button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
}

function exportBilling() {
  var list = getBillingTenants();
  exportToCSV(
    ['Name','Company','Lot','Space','BalanceDue','PaymentMethod'],
    list.map(function(r) {
      var t = r.tenant;
      var spaces = [t.spaceNumber].filter(Boolean).concat(t.additionalSpaces || []).join(', ');
      return [t.name, t.company, getLotName(t.lotId), spaces, r.balance, t.paymentMethod || 'manual'];
    }),
    'billing-receivables.csv'
  );
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    var tenants = await YB.loadTenants();
    APP_DATA.tenants = tenants;
    var lots = await YB.loadLots();
    if (lots && lots.length) APP_DATA.lots = lots;
  } catch (err) {
    console.warn('[YardBoss] API unavailable, using static data:', err.message);
  }

  renderBillingKPIs();
  renderBillingTable();

  var search = document.getElementById('billingSearch');
  if (search) search.addEventListener('input', function() {
    _billingSearch = this.value;
    renderBillingTable();
  });

  var exportBtn = document.getElementById('exportBillingBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportBilling);
});
