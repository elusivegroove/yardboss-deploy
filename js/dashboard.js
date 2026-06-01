Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#334155';

let revenueChartInst = null;
let lotPieChartInst = null;
let avgRateChartInst = null;
let occupancyChartInst = null;

const CHART_COLORS = {
  teal: '#00b4a0',
  tealAlpha: 'rgba(0,180,160,0.15)',
  navy: '#0f1e3c',
  navyAlpha: 'rgba(15,30,60,0.15)',
  blue: '#3b82f6',
  blueAlpha: 'rgba(59,130,246,0.15)',
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444'
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initGreeting() {
  const greetingEl = document.getElementById('greetingText');
  const dateEl = document.getElementById('greetingDate');
  if (greetingEl) {
    greetingEl.textContent = getGreeting() + ', ' + APP_DATA.owner.name.split(' ')[0] + '!';
  }
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }
}

function getFilteredLots(filter) {
  if (!filter || filter === 'all') return APP_DATA.lots;
  return APP_DATA.lots.filter(function (l) { return l.id === filter; });
}

function getFilteredTenants(filter) {
  if (!filter || filter === 'all') return APP_DATA.tenants;
  return APP_DATA.tenants.filter(function (t) { return t.lotId === filter; });
}

function computeKPIs(filter) {
  const lots = getFilteredLots(filter);
  const tenants = getFilteredTenants(filter);

  const totalSpaces = lots.reduce(function (s, l) { return s + l.totalSpaces; }, 0);
  const activeTenants = tenants.filter(function (t) { return t.status === 'active'; });
  const occupied = activeTenants.length;
  const vacant = totalSpaces - occupied;
  const occupancyRate = totalSpaces > 0 ? Math.round((occupied / totalSpaces) * 100) : 0;

  const today = new Date();
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const moveOuts = tenants.filter(function (t) {
    if (!t.endDate) return false;
    const d = new Date(t.endDate);
    return d >= today && d <= in7;
  }).length;

  let outstanding = 0;
  tenants.forEach(function (t) {
    t.payments.forEach(function (p) {
      if (p.status === 'overdue') outstanding += p.amount;
    });
  });

  const lastMonth = 10;
  let monthlyRevenue = 0;
  lots.forEach(function (lot) {
    const arr = APP_DATA.revenue[lot.id];
    if (arr) monthlyRevenue += arr[lastMonth];
  });

  const renewalsDue = (typeof checkAutoRenewals === 'function') ? checkAutoRenewals().length : 0;
  const autoPayActive = tenants.filter(function(t){ return t.paymentMethod === 'autopay'; }).length;

  return { totalSpaces, vacant, occupied, moveOuts, outstanding, monthlyRevenue, occupancyRate, renewalsDue, autoPayActive };
}

function renderKPIs(filter) {
  const kpis = computeKPIs(filter);
  const strip = document.getElementById('kpiStrip');
  if (!strip) return;

  const tiles = [
    {
      label: 'Total Spaces', value: kpis.totalSpaces,
      icon: 'fa-parking', tileClass: 'navy',
      sub: APP_DATA.lots.length + ' active lots'
    },
    {
      label: 'Vacant Spaces', value: kpis.vacant,
      icon: 'fa-square-parking', tileClass: 'green',
      sub: kpis.totalSpaces > 0 ? Math.round((kpis.vacant / kpis.totalSpaces) * 100) + '% available' : '0% available'
    },
    {
      label: 'Move-Outs (7d)', value: kpis.moveOuts,
      icon: 'fa-sign-out-alt', tileClass: 'yellow',
      sub: 'Upcoming departures'
    },
    {
      label: 'Outstanding', value: formatCurrency(kpis.outstanding),
      icon: 'fa-dollar-sign', tileClass: 'red',
      sub: 'Overdue balances'
    },
    {
      label: 'Monthly Revenue', value: formatCurrency(kpis.monthlyRevenue),
      icon: 'fa-chart-line', tileClass: 'teal',
      sub: 'Nov 2024'
    },
    {
      label: 'Occupancy Rate', value: kpis.occupancyRate + '%',
      icon: 'fa-percent', tileClass: 'indigo',
      sub: kpis.occupied + ' of ' + kpis.totalSpaces + ' spaces'
    },
    {
      label: 'Renewals Due', value: kpis.renewalsDue,
      icon: 'fa-sync-alt', tileClass: 'yellow',
      sub: 'Auto-renew this week',
      clickable: true
    },
    {
      label: 'Auto-Pay Active', value: kpis.autoPayActive,
      icon: 'fa-credit-card', tileClass: 'teal',
      sub: 'Tenants on auto-pay'
    }
  ];

  strip.innerHTML = tiles.map(function(t) {
    var click = t.clickable ? ' style="cursor:pointer;" onclick="openRenewalsDueModal()"' : '';
    return '<div class="kpi-tile ' + t.tileClass + '"' + click + '>' +
      '<div class="kpi-bg-icon"><i class="fas ' + t.icon + '"></i></div>' +
      '<div class="kpi-label">' + t.label + '</div>' +
      '<div class="kpi-value">' + t.value + '</div>' +
      '<div class="kpi-sub">' + t.sub + (t.clickable ? ' <i class="fas fa-arrow-right" style="font-size:0.65rem;opacity:0.7;"></i>' : '') + '</div>' +
      '</div>';
  }).join('');
}

// ── Renewals Due Modal ────────────────────────────────────────────────────
function openRenewalsDueModal() {
  var modal = document.getElementById('renewalsDueModal');
  if (!modal) return;
  renderRenewalsDueList();
  modal.classList.add('open');
}

function renderRenewalsDueList() {
  var list = document.getElementById('renewalsDueList');
  if (!list) return;
  var due = (typeof checkAutoRenewals === 'function') ? checkAutoRenewals() : [];
  if (!due.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:0.875rem;"><i class="fas fa-check-circle" style="font-size:2rem;color:#22c55e;display:block;margin-bottom:8px;"></i>No renewals due in the next 7 days.</div>';
    return;
  }
  list.innerHTML = due.map(function(t) {
    var period = t.renewalPeriod ? t.renewalPeriod.charAt(0).toUpperCase()+t.renewalPeriod.slice(1) : 'Monthly';
    var rate = t.renewalRate || t.monthlyRate || 0;
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--gray-100);">'
      +'<div>'
      +'<div style="font-weight:700;color:var(--navy);font-size:0.875rem;">'+t.name+'</div>'
      +'<div style="font-size:0.78rem;color:var(--gray-400);">'+t.company+' &nbsp;·&nbsp; Space '+t.spaceNumber+'</div>'
      +'<div style="font-size:0.78rem;color:var(--gray-500);margin-top:2px;">Ends: <strong>'+formatDate(t.endDate)+'</strong> &nbsp;|&nbsp; '+period+' @ '+formatCurrency(rate)+'</div>'
      +'</div>'
      +'<button class="btn btn-primary btn-sm" onclick="renewNow(\''+t.id+'\')"><i class="fas fa-sync-alt"></i> Renew Now</button>'
      +'</div>';
  }).join('');
}

function renewNow(tenantId) {
  if (typeof renewTenantLease !== 'function') { showToast('renewTenantLease not available', 'error'); return; }
  var updated = renewTenantLease(tenantId);
  if (!updated) { showToast('Could not renew lease.', 'error'); return; }
  showToast('Lease renewed for '+updated.name+' — new end date: '+formatDate(updated.endDate), 'success');
  renderRenewalsDueList();
  var filter = document.getElementById('yardSelector') ? document.getElementById('yardSelector').value : 'all';
  renderKPIs(filter);
}

function getRevenueDatasets(filter) {
  const lots = getFilteredLots(filter);
  const colors = [CHART_COLORS.teal, CHART_COLORS.navy, CHART_COLORS.blue];
  return lots.map(function (lot, i) {
    return {
      label: lot.name,
      data: APP_DATA.revenue[lot.id] || [],
      backgroundColor: colors[i % colors.length],
      borderRadius: 4,
      barPercentage: 0.7
    };
  });
}

function renderRevenueChart(filter) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (revenueChartInst) { revenueChartInst.destroy(); }
  revenueChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: APP_DATA.revenue.months,
      datasets: getRevenueDatasets(filter)
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#334155', font: { family: 'Inter', size: 12 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.raw); }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Inter', size: 11 },
            callback: function (v) { return '$' + (v / 1000).toFixed(0) + 'k'; }
          }
        }
      }
    }
  });
}

function renderLotPieChart(filter) {
  const ctx = document.getElementById('lotPieChart');
  if (!ctx) return;
  if (lotPieChartInst) { lotPieChartInst.destroy(); }

  const lots = getFilteredLots(filter);
  const totals = lots.map(function (lot) {
    return (APP_DATA.revenue[lot.id] || []).reduce(function (s, v) { return s + v; }, 0);
  });

  lotPieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: lots.map(function (l) { return l.name; }),
      datasets: [{
        data: totals,
        backgroundColor: [CHART_COLORS.teal, CHART_COLORS.navy, CHART_COLORS.blue],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#334155', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.label + ': ' + formatCurrency(ctx.raw); }
          }
        }
      }
    }
  });
}

function renderAvgRateChart(filter) {
  const ctx = document.getElementById('avgRateChart');
  if (!ctx) return;
  if (avgRateChartInst) { avgRateChartInst.destroy(); }

  const lots = getFilteredLots(filter);
  const colors = [CHART_COLORS.teal, CHART_COLORS.navy, CHART_COLORS.blue];

  avgRateChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: APP_DATA.avgRates.months,
      datasets: lots.map(function (lot, i) {
        return {
          label: lot.name,
          data: APP_DATA.avgRates[lot.id] || [],
          backgroundColor: colors[i % colors.length],
          borderRadius: 4,
          barPercentage: 0.7
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#334155', font: { family: 'Inter', size: 11 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.dataset.label + ': ' + formatCurrency(ctx.raw); }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Inter', size: 11 },
            callback: function (v) { return '$' + v; }
          }
        }
      }
    }
  });
}

function getOccupancyData(lotFilter) {
  const months = APP_DATA.occupancy.months;
  let moveIns, moveOuts;

  if (lotFilter && lotFilter !== 'all') {
    moveIns = APP_DATA.occupancy[lotFilter].moveIns;
    moveOuts = APP_DATA.occupancy[lotFilter].moveOuts;
  } else {
    moveIns = months.map(function (_, i) {
      return APP_DATA.lots.reduce(function (s, l) {
        return s + (APP_DATA.occupancy[l.id] ? APP_DATA.occupancy[l.id].moveIns[i] : 0);
      }, 0);
    });
    moveOuts = months.map(function (_, i) {
      return APP_DATA.lots.reduce(function (s, l) {
        return s + (APP_DATA.occupancy[l.id] ? APP_DATA.occupancy[l.id].moveOuts[i] : 0);
      }, 0);
    });
  }

  const net = moveIns.map(function (v, i) { return v - moveOuts[i]; });
  return { moveIns, moveOuts, net };
}

function renderOccupancyChart(lotFilter) {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  if (occupancyChartInst) { occupancyChartInst.destroy(); }

  const occ = getOccupancyData(lotFilter);

  occupancyChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: APP_DATA.occupancy.months,
      datasets: [
        {
          label: 'Move-Ins',
          data: occ.moveIns,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealAlpha,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.teal
        },
        {
          label: 'Move-Outs',
          data: occ.moveOuts,
          borderColor: CHART_COLORS.red,
          backgroundColor: 'rgba(239,68,68,0.1)',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.red
        },
        {
          label: 'Net Change',
          data: occ.net,
          borderColor: CHART_COLORS.blue,
          backgroundColor: CHART_COLORS.blueAlpha,
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.blue,
          borderDash: [5, 3]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#334155', font: { family: 'Inter', size: 11 }, boxWidth: 10 } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Inter', size: 11 }, stepSize: 2 }
        }
      }
    }
  });
}

function renderUpcomingReservations(filter) {
  const tbody = document.getElementById('upcomingTbody');
  if (!tbody) return;

  let reservations = APP_DATA.upcomingReservations;
  if (filter && filter !== 'all') {
    reservations = reservations.filter(function (r) {
      const tenant = getTenant(r.tenantId);
      return tenant && tenant.lotId === filter;
    });
  }

  if (reservations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-calendar-times"></i><p>No upcoming reservations found</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = reservations.map(function (r) {
    const tenant = getTenant(r.tenantId);
    if (!tenant) return '';
    const lot = getLot(tenant.lotId);
    const statusClass = r.status === 'confirmed' ? 'badge-green' : 'badge-yellow';
    const statusText = r.status === 'confirmed' ? 'Confirmed' : 'Pending';

    return '<tr>' +
      '<td><strong>' + tenant.name + '</strong></td>' +
      '<td>' + (lot ? lot.name : '-') + '</td>' +
      '<td>' + tenant.spaceNumber + '</td>' +
      '<td>' + formatDate(r.startDate) + '</td>' +
      '<td>' + formatDate(r.endDate) + '</td>' +
      '<td>' + formatCurrency(r.amount) + '/mo</td>' +
      '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
      '</tr>';
  }).join('');
}

function renderAll(filter) {
  renderKPIs(filter);
  renderRevenueChart(filter);
  renderLotPieChart(filter);
  renderAvgRateChart(filter);
  renderOccupancyChart('all');
  renderUpcomingReservations(filter);
}

document.addEventListener('DOMContentLoaded', function () {
  initGreeting();
  renderAll('all');

  const yardSelector = document.getElementById('yardSelector');
  if (yardSelector) {
    yardSelector.addEventListener('change', function () {
      renderAll(this.value);
    });
  }

  const occupancyFilter = document.getElementById('occupancyLotFilter');
  if (occupancyFilter) {
    occupancyFilter.addEventListener('change', function () {
      renderOccupancyChart(this.value);
    });
  }
});
