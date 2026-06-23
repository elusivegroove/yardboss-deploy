var _rmSort = { col: -1, dir: 1 };
var _rmFilter = '';

function naturalSortSpace(s) {
  if (!s) return 9999;
  var m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

function renderReportCell(cellStr) {
  if (cellStr === 'paid')         return '<span class="badge badge-green">Paid</span>';
  if (cellStr === 'late')         return '<span class="badge badge-yellow">Late</span>';
  if (cellStr === 'overdue')      return '<span class="badge badge-red">Overdue</span>';
  if (cellStr === 'active')       return '<span class="badge badge-green">Active</span>';
  if (cellStr === 'past')         return '<span class="badge badge-gray">Past</span>';
  if (cellStr === 'confirmed')    return '<span class="badge badge-teal">Confirmed</span>';
  if (cellStr === 'pending')      return '<span class="badge badge-yellow">Pending</span>';
  if (cellStr === 'On Premises')  return '<span class="badge badge-green">On Premises</span>';
  if (cellStr === 'Off Premises') return '<span class="badge badge-gray">Off Premises</span>';
  if (cellStr === 'Completed')    return '<span class="badge badge-teal">Completed</span>';
  if (cellStr === 'Scheduled')    return '<span class="badge badge-blue">Scheduled</span>';
  if (cellStr === 'Ready')        return '<span class="badge badge-green">Ready</span>';
  if (cellStr === 'Generated')    return '<span class="badge badge-teal">Generated</span>';
  return cellStr;
}

function renderReportTbody(headers, allRows) {
  var filter = _rmFilter.trim().toLowerCase();
  var rows = filter ? allRows.filter(function (row) {
    return row.some(function (c) {
      return String(c == null ? '' : c).toLowerCase().indexOf(filter) !== -1;
    });
  }) : allRows.slice();

  if (_rmSort.col >= 0) {
    var col = _rmSort.col, dir = _rmSort.dir;
    rows.sort(function (a, b) {
      var av = String(a[col] == null ? '' : a[col]);
      var bv = String(b[col] == null ? '' : b[col]);
      var an = parseFloat(av.replace(/[^0-9.]/g, ''));
      var bn = parseFloat(bv.replace(/[^0-9.]/g, ''));
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
      return av.localeCompare(bv) * dir;
    });
  }

  var tbody = document.getElementById('rptTbody');
  if (!tbody) return;
  var html = '';
  if (rows.length === 0) {
    html = '<tr><td colspan="' + headers.length + '"><div class="empty-state"><i class="fas fa-inbox"></i><p>No results</p></div></td></tr>';
  } else {
    rows.forEach(function (row) {
      html += '<tr>' + row.map(function (cell) {
        return '<td>' + renderReportCell(String(cell == null ? '' : cell)) + '</td>';
      }).join('') + '</tr>';
    });
  }
  tbody.innerHTML = html;
}

function updateSortIcons() {
  document.querySelectorAll('#reportModalContent .rpt-th').forEach(function (th, i) {
    var icon = th.querySelector('.rpt-sort-icon');
    if (!icon) return;
    th.classList.remove('sort-asc', 'sort-desc');
    icon.className = 'fas fa-sort rpt-sort-icon';
    if (_rmSort.col === i) {
      th.classList.add(_rmSort.dir === 1 ? 'sort-asc' : 'sort-desc');
      icon.className = 'fas ' + (_rmSort.dir === 1 ? 'fa-sort-up' : 'fa-sort-down') + ' rpt-sort-icon';
    }
  });
}

function renderReportModalContent(headers, allRows) {
  var content = document.getElementById('reportModalContent');
  var theadHtml = '<tr>' + headers.map(function (h, i) {
    return '<th class="rpt-th" data-col="' + i + '">' + h + ' <i class="fas fa-sort rpt-sort-icon"></i></th>';
  }).join('') + '</tr>';

  content.innerHTML =
    '<div class="rpt-filter-bar">' +
      '<i class="fas fa-search rpt-filter-icon"></i>' +
      '<input id="rptFilterInput" type="text" class="rpt-filter-input" placeholder="Search all columns...">' +
    '</div>' +
    '<div class="table-wrapper"><table>' +
      '<thead>' + theadHtml + '</thead>' +
      '<tbody id="rptTbody"></tbody>' +
    '</table></div>';

  renderReportTbody(headers, allRows);

  document.getElementById('rptFilterInput').addEventListener('input', function () {
    _rmFilter = this.value;
    renderReportTbody(headers, allRows);
  });

  content.querySelectorAll('.rpt-th').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = parseInt(this.getAttribute('data-col'), 10);
      if (_rmSort.col === col) {
        _rmSort.dir = _rmSort.dir === 1 ? -1 : 1;
      } else {
        _rmSort.col = col;
        _rmSort.dir = 1;
      }
      updateSortIcons();
      renderReportTbody(headers, allRows);
    });
  });
}

function formatCohortMonth(yearMonth) {
  const parts = yearMonth.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const FINANCIAL_REPORTS = [
  {
    id: 'ar-summary',
    icon: 'fa-file-invoice-dollar',
    title: 'Accounts Receivable Summary',
    desc: 'Outstanding balances and aging report',
    getData: function () {
      const rows = APP_DATA.tenants.filter(function (t) {
        return t.payments.some(function (p) { return p.status !== 'paid'; });
      }).map(function (t) {
        const overdue = t.payments.filter(function (p) { return p.status === 'overdue'; })
          .reduce(function (s, p) { return s + p.amount; }, 0);
        const late = t.payments.filter(function (p) { return p.status === 'late'; })
          .reduce(function (s, p) { return s + p.amount; }, 0);
        return [t.name, getLotName(t.lotId), formatCurrency(overdue), formatCurrency(late), formatCurrency(overdue + late)];
      });
      return {
        headers: ['Tenant', 'Lot', 'Overdue', 'Late', 'Total Balance'],
        rows: rows
      };
    }
  },
  {
    id: 'gross-receipts',
    icon: 'fa-dollar-sign',
    title: 'Gross Receipts',
    desc: 'Total revenue collected by period',
    getData: function () {
      const months = APP_DATA.revenue.months;
      const rows = months.slice(-6).map(function (m, i) {
        const actualIndex = months.length - 6 + i;
        const total = APP_DATA.lots.reduce(function (s, lot) {
          return s + (APP_DATA.revenue[lot.id] ? APP_DATA.revenue[lot.id][actualIndex] : 0);
        }, 0);
        return [m + ' 2024', formatCurrency(APP_DATA.revenue['lot-1'] ? APP_DATA.revenue['lot-1'][actualIndex] : 0), formatCurrency(total)];
      });
      return {
        headers: ['Month', 'TransVega RV & Truck Center', 'Total'],
        rows: rows
      };
    }
  },
  {
    id: 'scheduled-charges',
    icon: 'fa-calendar-check',
    title: 'Scheduled Charges',
    desc: 'Upcoming rent charges schedule',
    getData: function () {
      const active = APP_DATA.tenants.filter(function (t) { return t.status === 'active'; }).slice(0, 6);
      const rows = active.map(function (t) {
        return [t.name, t.spaceNumber, getLotName(t.lotId), formatCurrency(t.monthlyRate), 'Dec 1, 2024', 'Scheduled'];
      });
      return {
        headers: ['Tenant', 'Space', 'Lot', 'Amount', 'Due Date', 'Status'],
        rows: rows
      };
    }
  },
  {
    id: 'vehicle-logs',
    icon: 'fa-truck',
    title: 'Equipment/Vehicle Logs',
    desc: 'Vehicle and equipment activity logs',
    getData: function () {
      const rows = APP_DATA.tenants.slice(0, 6).map(function (t) {
        return [t.vehicle.year + ' ' + t.vehicle.make + ' ' + t.vehicle.model,
          t.vehicle.type, t.vehicle.plate, t.name, getLotName(t.lotId), t.status === 'active' ? 'On Premises' : 'Off Premises'];
      });
      return {
        headers: ['Vehicle', 'Type', 'Plate', 'Owner', 'Lot', 'Status'],
        rows: rows
      };
    }
  },
  {
    id: 'rent-roll',
    icon: 'fa-list-alt',
    title: 'Consolidated Rent Roll',
    desc: 'All tenants, rates, and payment status',
    getData: function () {
      const rows = APP_DATA.tenants.slice(0, 8).map(function (t) {
        const lastPayment = t.payments[0];
        return [t.name, getLotName(t.lotId), t.spaceNumber,
          formatCurrency(t.monthlyRate), formatDate(t.startDate), formatDate(t.endDate),
          lastPayment ? lastPayment.status : '-'];
      });
      return {
        headers: ['Tenant', 'Lot', 'Space', 'Rate/Mo', 'Start', 'End', 'Last Payment'],
        rows: rows
      };
    }
  },
  {
    id: 'move-out',
    icon: 'fa-sign-out-alt',
    title: 'Move-Out Report',
    desc: 'Completed and scheduled move-outs',
    getData: function () {
      const past = APP_DATA.tenants.filter(function (t) { return t.status === 'past'; });
      const rows = past.map(function (t) {
        return [t.name, getLotName(t.lotId), t.spaceNumber, formatDate(t.endDate), formatCurrency(t.monthlyRate), 'Completed'];
      });
      return {
        headers: ['Tenant', 'Lot', 'Space', 'Move-Out Date', 'Last Rate', 'Status'],
        rows: rows
      };
    }
  },
  {
    id: 'batch-statement',
    icon: 'fa-copy',
    title: 'Batch Statement',
    desc: 'Bulk statement generation for tenants',
    getData: function () {
      const active = APP_DATA.tenants.filter(function (t) { return t.status === 'active'; });
      const rows = active.slice(0, 6).map(function (t) {
        return [t.name, t.email, getLotName(t.lotId), formatCurrency(t.monthlyRate), 'Nov 2024', 'Ready'];
      });
      return {
        headers: ['Tenant', 'Email', 'Lot', 'Amount', 'Period', 'Statement Status'],
        rows: rows
      };
    }
  },
  {
    id: 'contact-export',
    icon: 'fa-address-book',
    title: 'Tenant Contact Export',
    desc: 'Export tenant contact information',
    getData: function () {
      var sorted = APP_DATA.tenants.slice().sort(function (a, b) {
        return naturalSortSpace(a.spaceNumber) - naturalSortSpace(b.spaceNumber);
      });
      var rows = sorted.map(function (t) {
        return [t.spaceNumber || '—', t.name, t.email, t.phone, t.company, getLotName(t.lotId), t.status];
      });
      return {
        headers: ['Space', 'Name', 'Email', 'Phone', 'Company', 'Lot', 'Status'],
        rows: rows
      };
    }
  },
  {
    id: 'monthly-statement',
    icon: 'fa-file-alt',
    title: 'Monthly Statement',
    desc: 'Individual monthly billing statements',
    getData: function () {
      const rows = APP_DATA.tenants.filter(function (t) { return t.status === 'active'; }).slice(0, 6).map(function (t) {
        return [t.name, getLotName(t.lotId), 'Nov 2024', formatCurrency(t.monthlyRate), t.payments[0] ? t.payments[0].status : '-', 'Generated'];
      });
      return {
        headers: ['Tenant', 'Lot', 'Period', 'Amount', 'Payment Status', 'Statement'],
        rows: rows
      };
    }
  },
  {
    id: 'lifetime-value',
    icon: 'fa-chart-line',
    title: 'Tenant Lifetime Value',
    desc: 'Revenue per tenant over lease duration',
    getData: function () {
      const rows = APP_DATA.tenants.slice(0, 8).map(function (t) {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const months = Math.max(1, Math.round((end - start) / (30 * 24 * 60 * 60 * 1000)));
        const ltv = t.monthlyRate * months;
        return [t.name, getLotName(t.lotId), months + ' months', formatCurrency(t.monthlyRate), formatCurrency(ltv), t.status];
      });
      return {
        headers: ['Tenant', 'Lot', 'Duration', 'Rate/Mo', 'Est. LTV', 'Status'],
        rows: rows
      };
    }
  }
];

const OPERATIONAL_REPORTS = [
  {
    id: 'daily-reservations',
    icon: 'fa-calendar-day',
    title: 'Daily Reservation Summary',
    desc: 'Today\'s reservation activity',
    getData: function () {
      const rows = APP_DATA.upcomingReservations.slice(0, 5).map(function (r) {
        const t = getTenant(r.tenantId);
        return [t ? t.name : '-', getLotName(t ? t.lotId : ''), t ? t.spaceNumber : '-',
          formatDate(r.startDate), formatCurrency(r.amount), r.status];
      });
      return {
        headers: ['Tenant', 'Lot', 'Space', 'Start Date', 'Amount', 'Status'],
        rows: rows
      };
    }
  },
  {
    id: 'occupancy-snapshot',
    icon: 'fa-chart-pie',
    title: 'Occupancy Snapshot',
    desc: 'Current occupancy across all lots',
    getData: function () {
      const rows = APP_DATA.lots.map(function (lot) {
        const occupied = APP_DATA.tenants.filter(function (t) { return t.lotId === lot.id && t.status === 'active'; }).length;
        const pending = APP_DATA.tenants.filter(function (t) { return t.lotId === lot.id && t.status === 'pending'; }).length;
        const vacant = lot.totalSpaces - occupied - pending;
        const pct = Math.round((occupied / lot.totalSpaces) * 100);
        return [lot.name, lot.totalSpaces, occupied, pending, vacant, pct + '%'];
      });
      return {
        headers: ['Lot', 'Total Spaces', 'Occupied', 'Reserved', 'Vacant', 'Occupancy %'],
        rows: rows
      };
    }
  },
  {
    id: 'vehicle-audit',
    icon: 'fa-clipboard-check',
    title: 'Vehicle Audit Report',
    desc: 'Active vehicles on premises',
    getData: function () {
      const active = APP_DATA.tenants.filter(function (t) { return t.status === 'active'; });
      const rows = active.slice(0, 6).map(function (t) {
        return [t.vehicle.plate, t.vehicle.year + ' ' + t.vehicle.make + ' ' + t.vehicle.model,
          t.vehicle.type, t.name, getLotName(t.lotId), t.spaceNumber];
      });
      return {
        headers: ['Plate', 'Vehicle', 'Type', 'Registered To', 'Lot', 'Space'],
        rows: rows
      };
    }
  },
  {
    id: 'late-payments',
    icon: 'fa-exclamation-triangle',
    title: 'Late Payment Report',
    desc: 'Tenants with overdue balances',
    getData: function () {
      const rows = [];
      APP_DATA.tenants.forEach(function (t) {
        t.payments.forEach(function (p) {
          if (p.status === 'overdue' || p.status === 'late') {
            rows.push([t.name, getLotName(t.lotId), formatDate(p.date), formatCurrency(p.amount), p.status]);
          }
        });
      });
      return {
        headers: ['Tenant', 'Lot', 'Due Date', 'Amount', 'Status'],
        rows: rows.slice(0, 8)
      };
    }
  },
  {
    id: 'churn-analysis',
    icon: 'fa-chart-bar',
    title: 'Churn Analysis',
    desc: 'Move-out trends and retention metrics',
    getData: function () {
      const rows = APP_DATA.occupancy.months.slice(-6).map(function (m, i) {
        const actualIndex = APP_DATA.occupancy.months.length - 6 + i;
        const moveOuts = APP_DATA.lots.reduce(function (s, l) {
          return s + APP_DATA.occupancy[l.id].moveOuts[actualIndex];
        }, 0);
        const moveIns = APP_DATA.lots.reduce(function (s, l) {
          return s + APP_DATA.occupancy[l.id].moveIns[actualIndex];
        }, 0);
        const net = moveIns - moveOuts;
        return [m + ' 2024', moveIns, moveOuts, net > 0 ? '+' + net : net];
      });
      return {
        headers: ['Month', 'Move-Ins', 'Move-Outs', 'Net Change'],
        rows: rows
      };
    }
  },
  {
    id: 'cohort-retention',
    icon: 'fa-layer-group',
    title: 'Cohorted Retention',
    desc: 'Tenant retention grouped by move-in month',
    getData: function () {
      const cohorts = {};
      APP_DATA.tenants.forEach(function (t) {
        if (!t.startDate) return;
        const cohort = t.startDate.slice(0, 7);
        if (!cohorts[cohort]) cohorts[cohort] = { total: 0, active: 0 };
        cohorts[cohort].total++;
        if (t.status === 'active') cohorts[cohort].active++;
      });
      const rows = Object.keys(cohorts).sort().map(function (cohort) {
        const c = cohorts[cohort];
        const movedOut = c.total - c.active;
        const retention = c.total ? Math.round((c.active / c.total) * 100) : 0;
        return [formatCohortMonth(cohort), c.total, c.active, movedOut, retention + '%'];
      });
      return {
        headers: ['Move-In Cohort', 'Tenants', 'Still Active', 'Moved Out', 'Retention %'],
        rows: rows
      };
    }
  },
  {
    id: 'equipment-report',
    icon: 'fa-trailer',
    title: 'Equipment Report',
    desc: 'Vehicle inventory and insurance status by type',
    getData: function () {
      const types = {};
      const today = new Date();
      const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      APP_DATA.tenants.forEach(function (t) {
        const type = (t.vehicle && t.vehicle.type) || 'Unspecified';
        if (!types[type]) types[type] = { total: 0, active: 0, insured: 0, expiringSoon: 0 };
        types[type].total++;
        if (t.status === 'active') types[type].active++;
        if (t.insuranceExpDate) {
          const exp = new Date(t.insuranceExpDate);
          if (exp >= today) types[type].insured++;
          if (exp >= today && exp <= in30) types[type].expiringSoon++;
        }
      });
      const rows = Object.keys(types).sort().map(function (type) {
        const s = types[type];
        return [type, s.total, s.active, s.insured, s.expiringSoon];
      });
      return {
        headers: ['Equipment Type', 'Total', 'Active', 'Insured', 'Insurance Expiring (30d)'],
        rows: rows
      };
    }
  }
];

function renderReportCard(report) {
  return '<div class="report-card" onclick="openReportModal(\'' + report.id + '\')">' +
    '<div class="report-card-icon"><i class="fas ' + report.icon + '"></i></div>' +
    '<h4>' + report.title + '</h4>' +
    '<p>' + report.desc + '</p>' +
    '</div>';
}

function openReportModal(reportId) {
  const allReports = FINANCIAL_REPORTS.concat(OPERATIONAL_REPORTS);
  const report = allReports.find(function (r) { return r.id === reportId; });
  if (!report) return;

  _rmSort = { col: -1, dir: 1 };
  _rmFilter = '';

  document.getElementById('reportModalTitle').textContent = report.title;
  const data = report.getData();
  renderReportModalContent(data.headers, data.rows);
  document.getElementById('reportModal').classList.add('open');
}

function renderQuickGlance() {
  const activeTenants = APP_DATA.tenants.filter(function (t) { return t.status === 'active'; }).length;
  const totalRes = APP_DATA.upcomingReservations.length;
  const monthlyRev = APP_DATA.lots.reduce(function (s, lot) {
    return s + (APP_DATA.revenue[lot.id] ? APP_DATA.revenue[lot.id][10] : 0);
  }, 0);
  const totalSpaces = APP_DATA.lots.reduce(function (s, l) { return s + l.totalSpaces; }, 0);

  const items = [
    { icon: 'fa-warehouse', label: 'Total Lots', value: APP_DATA.lots.length, color: '#00b4a0', bg: 'rgba(0,180,160,0.1)' },
    { icon: 'fa-users', label: 'Active Tenants', value: activeTenants, color: '#3b82f6', bg: '#dbeafe' },
    { icon: 'fa-calendar-alt', label: 'Reservations', value: totalRes, color: '#8b5cf6', bg: '#ede9fe' },
    { icon: 'fa-parking', label: 'Total Spaces', value: totalSpaces, color: '#f59e0b', bg: '#fef3c7' },
    { icon: 'fa-dollar-sign', label: 'Nov Revenue', value: formatCurrency(monthlyRev), color: '#22c55e', bg: '#dcfce7' }
  ];

  const container = document.getElementById('quickGlanceRows');
  if (!container) return;

  container.innerHTML = items.map(function (item) {
    return '<div class="quick-glance-row">' +
      '<div class="quick-glance-icon" style="background:' + item.bg + ';color:' + item.color + '">' +
      '<i class="fas ' + item.icon + '"></i></div>' +
      '<div class="quick-glance-text">' +
      '<span class="label">' + item.label + '</span>' +
      '<span class="value">' + item.value + '</span>' +
      '</div></div>';
  }).join('');
}

document.addEventListener('DOMContentLoaded', function () {
  const finCard = document.getElementById('financialCards');
  if (finCard) {
    finCard.innerHTML = FINANCIAL_REPORTS.map(renderReportCard).join('');
  }

  const opCard = document.getElementById('operationalCards');
  if (opCard) {
    opCard.innerHTML = OPERATIONAL_REPORTS.map(renderReportCard).join('');
  }

  if (typeof YB !== 'undefined' && YB.loadTenants) {
    YB.loadTenants().then(function (tenants) {
      APP_DATA.tenants = tenants;
      renderQuickGlance();
    }).catch(function () { renderQuickGlance(); });
  } else {
    renderQuickGlance();
  }

  document.getElementById('closeReportModal').addEventListener('click', function () {
    document.getElementById('reportModal').classList.remove('open');
  });

  document.getElementById('cancelReportModal').addEventListener('click', function () {
    document.getElementById('reportModal').classList.remove('open');
  });

  document.getElementById('reportModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });

  document.getElementById('exportCsvBtn').addEventListener('click', function () {
    const content = document.getElementById('reportModalContent');
    const title = document.getElementById('reportModalTitle').textContent;
    const headers = [];
    const rows = [];
    const ths = content.querySelectorAll('thead th');
    ths.forEach(function (th) { headers.push(th.textContent.trim()); });
    content.querySelectorAll('tbody tr').forEach(function (tr) {
      const row = [];
      tr.querySelectorAll('td').forEach(function (td) { row.push(td.textContent.trim()); });
      if (row.length) rows.push(row);
    });
    if (headers.length && rows.length) {
      exportToCSV(headers, rows, title.toLowerCase().replace(/\s+/g, '-') + '.csv');
    } else {
      showToast('No data to export.', 'error');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.getElementById('reportModal').classList.remove('open');
    }
  });
});
