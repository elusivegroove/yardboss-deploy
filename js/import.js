// import.js — Excel/CSV tenant importer using SheetJS (loaded on demand)
// Supports the TransVega "RT 27 Lot" format and generic layouts with auto column detection.

(function () {
  'use strict';

  var importWorkbook = null;
  var importRows = [];
  var importColMap = {};

  // Synonyms used to auto-detect which column maps to which field
  var FIELD_SYNONYMS = {
    spot:      ['spot', 'space', 'spot#', 'space#', 'unit', 'spot number', 'space number', 'stall'],
    name:      ['name', 'customer name', 'tenant name', 'full name', 'customer'],
    phone:     ['phone', 'number', 'cell', 'mobile', 'telephone', 'contact', 'ph'],
    email:     ['email', 'email address', 'emailcontact', 'e-mail'],
    company:   ['company', 'business', 'description', 'company name', 'mc#', 'notes', 'unit description'],
    plate:     ['plate', 'license plate', 'license', 'plate#', 'tag', 'tag#'],
    vehicle:   ['vehicle', 'vehicle description', 'rv type', 'truck type', 'unit type'],
    startDate: ['date in', 'start date', 'check in', 'move in', 'start', 'arrival', 'begin'],
    endDate:   ['date out', 'end date', 'check out', 'move out', 'end', 'departure', 'expiry'],
    term:      ['term', 'billing cycle', 'period', 'frequency', 'type']
  };

  // Convert Excel serial date OR string date to YYYY-MM-DD
  function excelDateToISO(val) {
    if (val === '' || val === null || val === undefined) return '';
    if (typeof val === 'string') {
      var cleaned = val.replace(/\\/g, '/').trim();
      // 2-digit year: M/D/YY or MM/DD/YY → expand to 4-digit year
      if (cleaned.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$/)) {
        var parts = cleaned.split(/[\/\-]/);
        var yr = parseInt(parts[2], 10);
        yr = yr < 50 ? 2000 + yr : 1900 + yr;
        var d2 = new Date(parseInt(parts[0], 10) + '/' + parseInt(parts[1], 10) + '/' + yr);
        if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
      }
      // 4-digit year: M/D/YYYY
      if (cleaned.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        var d3 = new Date(cleaned);
        if (!isNaN(d3.getTime())) return d3.toISOString().split('T')[0];
      }
      if (cleaned.match(/^\d{4}-\d{2}-\d{2}/)) return cleaned.slice(0, 10);
      return '';
    }
    var n = parseFloat(val);
    if (!isNaN(n) && n > 1000) {
      // Excel date serial → JS timestamp (adjust for Excel's 1900 leap year bug)
      var d = new Date(Math.round((n - 25569) * 86400000));
      return d.toISOString().split('T')[0];
    }
    return '';
  }

  // Normalize a string for loose comparison
  function norm(s) {
    return String(s || '').toLowerCase().trim().replace(/[\s\/\-_#.]/g, '');
  }

  // Auto-detect field → column index mapping from a header row
  function autoDetectColumns(headers) {
    var map = {};
    headers.forEach(function (h, i) {
      var hn = norm(h);
      if (!hn) return; // skip blank/empty header columns — they'd match every synonym
      Object.keys(FIELD_SYNONYMS).forEach(function (field) {
        if (map[field] !== undefined) return;
        FIELD_SYNONYMS[field].forEach(function (syn) {
          if (map[field] !== undefined) return;
          var sn = norm(syn);
          if (hn === sn || hn.includes(sn) || sn.includes(hn)) {
            map[field] = i;
          }
        });
      });
    });

    // TransVega-specific fallback: col A (0) is spot number if not detected yet
    if (map.spot === undefined) map.spot = 0;

    return map;
  }

  // Format a phone number that Excel may have stored in scientific notation
  function formatPhone(raw) {
    var s = String(raw || '').trim();
    // Handle scientific notation: 3.524594633E9
    if (/^\d+\.?\d*[Ee][+\-]?\d+$/.test(s)) {
      s = String(Math.round(parseFloat(s)));
    }
    // Strip non-digits
    var digits = s.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
    if (digits.length === 10) {
      return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }
    return s; // Return as-is if we can't format
  }

  // Load SheetJS dynamically (only when first needed)
  function loadSheetJS(callback) {
    if (window.XLSX) { callback(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = callback;
    s.onerror = function () {
      showToast('Failed to load Excel parser library. Check your connection.', 'error');
    };
    document.head.appendChild(s);
  }

  // Parse the uploaded file and trigger preview
  function parseFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var data = new Uint8Array(e.target.result);
      try {
        importWorkbook = XLSX.read(data, { type: 'array', cellDates: false });
      } catch (err) {
        showToast('Could not parse file: ' + err.message, 'error');
        return;
      }

      // Populate sheet selector
      var sel = document.getElementById('importSheetSel');
      sel.innerHTML = importWorkbook.SheetNames.map(function (n, i) {
        return '<option value="' + i + '">' + n + '</option>';
      }).join('');

      // Auto-select the sheet most likely to contain tenant/lot data
      var preferred = -1;
      var keywords = ['lot', 'spot', 'customer', 'tenant', 'rv', 'truck', 'assign', 'rt 27'];
      importWorkbook.SheetNames.forEach(function (n, i) {
        if (preferred !== -1) return;
        var ln = n.toLowerCase();
        keywords.forEach(function (k) {
          if (preferred === -1 && ln.includes(k)) preferred = i;
        });
      });
      if (preferred > -1) sel.value = preferred;

      renderSheetPreview(parseInt(sel.value));
      document.getElementById('importStep1').style.display = 'none';
      document.getElementById('importStep2').style.display = '';
    };
    reader.readAsArrayBuffer(file);
  }

  // Render the column mapping and preview table for a given sheet
  function renderSheetPreview(sheetIndex) {
    var sheetName = importWorkbook.SheetNames[sheetIndex];
    var sheet = importWorkbook.Sheets[sheetName];
    var rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      document.getElementById('importCountSummary').textContent = 'This sheet appears to be empty.';
      document.getElementById('importPreviewTable').innerHTML = '';
      importRows = [];
      return;
    }

    // Find header row: first row (within first 5) that contains "name" and at least one of email/date/spot
    var headerRowIndex = 0;
    for (var i = 0; i < Math.min(5, rawRows.length); i++) {
      var rowStr = rawRows[i].join(' ').toLowerCase();
      if (rowStr.includes('name') && (rowStr.includes('email') || rowStr.includes('date') || rowStr.includes('spot') || rowStr.includes('phone') || rowStr.includes('number'))) {
        headerRowIndex = i;
        break;
      }
    }

    var headers = rawRows[headerRowIndex] ? rawRows[headerRowIndex].slice() : [];
    // TransVega sheet: col A header is often blank or ".."; col A holds the spot number
    if (!String(headers[0] || '').trim() || String(headers[0]).trim() === '..') {
      headers[0] = 'SPOT';
    }

    importColMap = autoDetectColumns(headers);

    // Collect data rows (skip header rows, skip rows with no name and marked EMPTY)
    importRows = [];
    for (var r = headerRowIndex + 1; r < rawRows.length; r++) {
      var row = rawRows[r];
      if (!row || row.every(function (c) { return c === '' || c === null || c === undefined; })) continue;

      var nameVal = importColMap.name !== undefined ? String(row[importColMap.name] || '').trim() : '';
      var spotVal = importColMap.spot !== undefined ? String(row[importColMap.spot] || '').trim() : '';
      var colBNote = String(row[1] || '').trim().toUpperCase();

      // Skip completely empty rows
      if (!nameVal && !spotVal) continue;
      // Skip rows where col B is "EMPTY" and there is no name (vacant spots)
      if (colBNote === 'EMPTY' && !nameVal) continue;
      // Skip secondary header rows
      if (nameVal.toLowerCase() === 'name') continue;
      // Skip rows that look like section titles (no spot number, name is all caps label)
      if (!spotVal && nameVal && nameVal === nameVal.toUpperCase() && nameVal.length > 20 && !nameVal.includes('@')) continue;

      importRows.push(row);
    }

    // ── Column mapping legend ──
    var fieldLabels = {
      spot: 'Spot #', name: 'Name', email: 'Email', phone: 'Phone',
      company: 'Company/Desc', plate: 'Plate', startDate: 'Date In', endDate: 'Date Out', term: 'Term'
    };
    var mapHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    Object.keys(fieldLabels).forEach(function (f) {
      var col = importColMap[f];
      var colLabel = col !== undefined ? (String(headers[col] || '').trim() || 'Col ' + (col + 1)) : null;
      var found = col !== undefined && colLabel;
      mapHtml += '<span style="background:' + (found ? '#d1fae5' : '#f1f5f9') + ';padding:2px 8px;border-radius:4px;font-size:0.72rem;color:' + (found ? '#065f46' : '#94a3b8') + ';white-space:nowrap;">'
        + fieldLabels[f] + (found ? ' <strong>→ ' + colLabel + '</strong>' : ' → <em>not found</em>') + '</span>';
    });
    mapHtml += '</div>';
    document.getElementById('importColMapping').innerHTML = mapHtml;

    // ── Preview table ──
    var previewRows = importRows.slice(0, 8);
    var tHead = '<tr><th style="white-space:nowrap;">Spot #</th><th>Name</th><th>Email / Phone</th><th>Description / Vehicle</th><th style="white-space:nowrap;">Date In</th><th style="white-space:nowrap;">Date Out</th><th>Term</th></tr>';
    var tBody = previewRows.map(function (row) {
      var spot    = importColMap.spot      !== undefined ? row[importColMap.spot]      : '';
      var name    = importColMap.name      !== undefined ? row[importColMap.name]      : '';
      var email   = importColMap.email     !== undefined ? row[importColMap.email]     : '';
      var phone   = importColMap.phone     !== undefined ? row[importColMap.phone]     : '';
      var company = importColMap.company   !== undefined ? row[importColMap.company]   : '';
      var plate   = importColMap.plate     !== undefined ? row[importColMap.plate]     : '';
      var vehicle = importColMap.vehicle   !== undefined ? row[importColMap.vehicle]   : '';
      var dateIn  = excelDateToISO(importColMap.startDate !== undefined ? row[importColMap.startDate] : '');
      var dateOut = excelDateToISO(importColMap.endDate   !== undefined ? row[importColMap.endDate]   : '');
      var term    = importColMap.term      !== undefined ? row[importColMap.term]      : '';

      // Format spot number
      var spotNum = parseFloat(spot);
      var spotDisplay = (!isNaN(spotNum) && spotNum > 0) ? Math.round(spotNum) : (spot || '—');

      var desc = String(company || vehicle || plate || '').trim();
      if (desc.length > 30) desc = desc.slice(0, 28) + '…';

      var contact = String(email || '').trim();
      if (!contact) contact = formatPhone(phone);
      if (!contact) contact = '—';

      return '<tr>'
        + '<td style="font-weight:600;">' + spotDisplay + '</td>'
        + '<td><strong>' + (String(name).trim() || '<em style="color:var(--gray-400)">—</em>') + '</strong></td>'
        + '<td style="font-size:0.75rem;color:var(--gray-500);">' + contact + '</td>'
        + '<td style="font-size:0.75rem;color:var(--gray-500);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (desc || '—') + '</td>'
        + '<td style="font-size:0.75rem;">' + (dateIn || '—') + '</td>'
        + '<td style="font-size:0.75rem;">' + (dateOut || '—') + '</td>'
        + '<td style="font-size:0.75rem;">' + (String(term).trim() || '—') + '</td>'
        + '</tr>';
    }).join('');

    document.getElementById('importPreviewTable').innerHTML = '<thead>' + tHead + '</thead><tbody>' + tBody + '</tbody>';

    var withName = importRows.filter(function (r) {
      return importColMap.name !== undefined && String(r[importColMap.name] || '').trim().length > 0;
    }).length;
    var total = importRows.length;

    document.getElementById('importCountSummary').innerHTML =
      '<span style="color:var(--navy);font-weight:700;">' + total + '</span> rows found &nbsp;·&nbsp; '
      + '<span style="color:var(--teal);font-weight:700;">' + withName + '</span> with names'
      + (total > 8 ? ' &nbsp;·&nbsp; <span style="color:var(--gray-400)">showing first 8</span>' : '');

    var btn = document.getElementById('importConfirmBtn');
    btn.textContent = '';
    btn.innerHTML = '<i class="fas fa-file-import"></i> Import ' + withName + ' Tenant' + (withName !== 1 ? 's' : '');
    btn.disabled = withName === 0;
  }

  // Build a tenant payload from a spreadsheet row (no id = POST/create)
  function buildTenantPayload(row, lotId) {
    var name    = importColMap.name    !== undefined ? String(row[importColMap.name]    || '').trim() : '';
    var email   = importColMap.email   !== undefined ? String(row[importColMap.email]   || '').trim() : '';
    var phone   = formatPhone(importColMap.phone !== undefined ? row[importColMap.phone] : '');
    var company = importColMap.company !== undefined ? String(row[importColMap.company] || '').trim() : '';
    var plate   = importColMap.plate   !== undefined ? String(row[importColMap.plate]   || '').trim() : '';
    var vehicle = importColMap.vehicle !== undefined ? String(row[importColMap.vehicle] || '').trim() : '';
    var term    = importColMap.term    !== undefined ? String(row[importColMap.term]    || '').trim() : '';
    var startDate = excelDateToISO(importColMap.startDate !== undefined ? row[importColMap.startDate] : '');
    var endDate   = excelDateToISO(importColMap.endDate   !== undefined ? row[importColMap.endDate]   : '');

    // If no dedicated email column, scan all cells for an email-shaped value
    if (!email) {
      for (var ci = 0; ci < row.length; ci++) {
        var cellStr = String(row[ci] || '').trim();
        var emailMatch = cellStr.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) { email = emailMatch[0]; break; }
      }
    }

    var spotRaw = importColMap.spot !== undefined ? row[importColMap.spot] : '';
    var spotNum = parseFloat(spotRaw);
    var spot = (!isNaN(spotNum) && spotNum > 0) ? String(Math.round(spotNum)) : String(spotRaw || '').trim();

    var status = 'active';
    var colBNote = String(row[1] || '').trim().toUpperCase();
    if (colBNote === 'EMPTY') status = 'pending';
    if (endDate && new Date(endDate) < new Date()) status = 'past';

    var vehicleDesc = vehicle || company || '';
    var vehiclePlate = plate;
    if (!vehiclePlate && vehicleDesc) {
      var plateMatch = vehicleDesc.match(/\b([A-Z0-9]{2,3}[A-Z0-9]{3,5})\s+([A-Z]{2})\b/);
      if (plateMatch) vehiclePlate = plateMatch[1] + ' ' + plateMatch[2];
    }

    return {
      name: name,
      email: email,
      phone: phone,
      company: company,
      lotId: lotId,
      spaceNumber: spot,
      monthlyRate: 0,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status,
      registrationStatus: 'pending',
      vehicle: {
        make: '',
        model: vehicleDesc,
        year: null,
        plate: vehiclePlate,
        type: (term.toLowerCase().includes('rv') || vehicleDesc.toLowerCase().includes('rv')) ? 'RV' : 'Semi Truck'
      }
    };
  }

  // Execute the import — saves each tenant to the database via POST /api/tenants
  function doImport() {
    var lotId = APP_DATA.lots[0] ? APP_DATA.lots[0].id : 'lot-1';
    var skipped = 0;
    var duplicates = 0;
    var toCreate = [];

    importRows.forEach(function (row) {
      var name = importColMap.name !== undefined ? String(row[importColMap.name] || '').trim() : '';
      if (!name) { skipped++; return; }

      var spotRaw = importColMap.spot !== undefined ? row[importColMap.spot] : '';
      var spotNum = parseFloat(spotRaw);
      var spot = (!isNaN(spotNum) && spotNum > 0) ? String(Math.round(spotNum)) : String(spotRaw || '').trim();

      var isDupe = APP_DATA.tenants.some(function (t) {
        return t.name.toLowerCase() === name.toLowerCase() && t.spaceNumber === spot;
      });
      if (isDupe) { duplicates++; return; }

      toCreate.push(buildTenantPayload(row, lotId));
    });

    if (toCreate.length === 0) {
      var msg = 'Nothing to import';
      if (duplicates > 0) msg += ' — ' + duplicates + ' duplicate' + (duplicates !== 1 ? 's' : '') + ' already exist';
      if (skipped > 0) msg += ', ' + skipped + ' blank row' + (skipped !== 1 ? 's' : '') + ' skipped';
      showToast(msg, 'warning');
      return;
    }

    // Show saving state on button
    var btn = document.getElementById('importConfirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving ' + toCreate.length + ' tenant' + (toCreate.length !== 1 ? 's' : '') + '...';

    // POST each tenant to the API sequentially to avoid overwhelming the server
    var saved = 0;
    var failed = 0;

    function saveNext(index) {
      if (index >= toCreate.length) {
        // All done — reload tenants from DB and re-render
        YB.loadTenants().then(function (tenants) {
          APP_DATA.tenants = tenants;
          closeImportModal();
          if (typeof updateTabCounts === 'function') updateTabCounts();
          if (typeof renderTenantsTable === 'function') renderTenantsTable();

          var msg = 'Import complete: ' + saved + ' tenant' + (saved !== 1 ? 's' : '') + ' saved to database';
          if (duplicates > 0) msg += ', ' + duplicates + ' duplicate' + (duplicates !== 1 ? 's' : '') + ' skipped';
          if (skipped > 0) msg += ', ' + skipped + ' blank row' + (skipped !== 1 ? 's' : '') + ' skipped';
          if (failed > 0) msg += ', ' + failed + ' failed';
          showToast(msg, failed > 0 ? 'warning' : 'success');
        }).catch(function () {
          closeImportModal();
          showToast(saved + ' tenant' + (saved !== 1 ? 's' : '') + ' saved. Refresh to see them.', 'success');
        });
        return;
      }

      // Update button progress
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving ' + (index + 1) + ' / ' + toCreate.length + '...';

      YB.saveTenant(toCreate[index]).then(function () {
        saved++;
        saveNext(index + 1);
      }).catch(function () {
        failed++;
        saveNext(index + 1);
      });
    }

    saveNext(0);
  }

  // ── Modal open/close ──────────────────────────────────────────────────────

  function openImportModal() {
    loadSheetJS(function () {
      document.getElementById('importStep1').style.display = '';
      document.getElementById('importStep2').style.display = 'none';
      document.getElementById('importFileInput').value = '';
      document.getElementById('importModal').classList.add('open');
    });
  }

  function closeImportModal() {
    document.getElementById('importModal').classList.remove('open');
    importWorkbook = null;
    importRows = [];
    importColMap = {};
  }

  // ── Wire events ───────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var importBtn = document.getElementById('importTenantsBtn');
    if (importBtn) importBtn.addEventListener('click', openImportModal);

    var closeBtn = document.getElementById('closeImportModal');
    if (closeBtn) closeBtn.addEventListener('click', closeImportModal);

    var cancelBtn = document.getElementById('cancelImportModal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeImportModal);

    var backBtn = document.getElementById('importBackBtn');
    if (backBtn) backBtn.addEventListener('click', function () {
      document.getElementById('importStep1').style.display = '';
      document.getElementById('importStep2').style.display = 'none';
    });

    var modal = document.getElementById('importModal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === this) closeImportModal();
    });

    // File input
    var fileInput = document.getElementById('importFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) parseFile(this.files[0]);
      });
    }

    // Drop zone drag-and-drop
    var dropZone = document.getElementById('importDropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.style.borderColor = 'var(--teal)';
        this.style.background = 'rgba(0,180,160,0.04)';
      });
      dropZone.addEventListener('dragleave', function () {
        this.style.borderColor = 'var(--gray-200)';
        this.style.background = '';
      });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        this.style.borderColor = 'var(--gray-200)';
        this.style.background = '';
        var file = e.dataTransfer.files[0];
        if (file) parseFile(file);
      });
    }

    // Sheet selector
    var sheetSel = document.getElementById('importSheetSel');
    if (sheetSel) {
      sheetSel.addEventListener('change', function () {
        renderSheetPreview(parseInt(this.value));
      });
    }

    // Confirm import
    var confirmBtn = document.getElementById('importConfirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', doImport);
  });

  // Expose for external use
  window.openImportModal = openImportModal;

}());
