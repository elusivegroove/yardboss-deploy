// YardBoss — Dev Tracker
// Stores feature requests, bugs, and improvements in localStorage so they persist across sessions.

(function () {
  'use strict';

  var STORAGE_KEY = 'yardboss_dev_items';

  // ── Type / Status / Priority style maps ──────────────────────────────────

  var TYPE_STYLE = {
    feature: { border: '#00b4a0', bg: 'rgba(0,180,160,0.12)', color: '#00b4a0',  label: '+ FEATURE'  },
    improve: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', label: '↑ IMPROVE'  },
    bug:     { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', color: '#d97706', label: '⚠ BUG'      },
    remove:  { border: '#ef4444', bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: '✕ REMOVE'   }
  };

  var STATUS_STYLE = {
    pending:     { bg: '#f1f5f9', color: '#64748b', label: 'Pending'     },
    in_progress: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'In Progress' },
    done:        { bg: 'rgba(0,180,160,0.15)',   color: '#00b4a0', label: 'Done'        },
    cancelled:   { bg: '#f1f5f9', color: '#94a3b8', label: 'Cancelled'   }
  };

  var STATUS_CYCLE = ['pending', 'in_progress', 'done', 'cancelled'];

  var PRIORITY_STYLE = {
    low:      { color: '#94a3b8', label: 'Low'      },
    medium:   { color: '#64748b', label: 'Medium'   },
    high:     { color: '#f59e0b', label: 'High'     },
    critical: { color: '#ef4444', label: '🔴 Critical' }
  };

  // ── State ─────────────────────────────────────────────────────────────────

  var activeTypeFilter   = 'all';
  var activeStatusFilter = 'all';
  var searchQuery        = '';
  var editingId          = null;

  // ── Storage ───────────────────────────────────────────────────────────────

  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function generateId() {
    return 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  function getFilteredItems() {
    var items = loadItems();
    if (activeTypeFilter !== 'all') {
      items = items.filter(function (i) { return i.type === activeTypeFilter; });
    }
    if (activeStatusFilter !== 'all') {
      items = items.filter(function (i) { return i.status === activeStatusFilter; });
    }
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      items = items.filter(function (i) {
        return i.title.toLowerCase().includes(q)
          || (i.description || '').toLowerCase().includes(q)
          || (i.notes || '').toLowerCase().includes(q)
          || (i.tags || []).some(function (t) { return t.toLowerCase().includes(q); });
      });
    }
    // Sort: critical first, then by status (in_progress > pending > done > cancelled), then newest
    var statusOrder = { in_progress: 0, pending: 1, done: 2, cancelled: 3 };
    var priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort(function (a, b) {
      var po = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (po !== 0) return po;
      var so = (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
      if (so !== 0) return so;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return items;
  }

  // ── KPI strip ─────────────────────────────────────────────────────────────

  function renderKpiStrip() {
    var all = loadItems();
    var counts = { feature: 0, improve: 0, bug: 0, remove: 0, done: 0, total: all.length };
    all.forEach(function (i) {
      if (counts[i.type] !== undefined) counts[i.type]++;
      if (i.status === 'done') counts.done++;
    });
    var inProgress = all.filter(function (i) { return i.status === 'in_progress'; }).length;

    var kpis = [
      { key: 'total',   label: 'Total',       value: counts.total,   color: '#0f1e3c', sub: 'all items',       type: null   },
      { key: 'feature', label: 'Features',     value: counts.feature, color: '#00b4a0', sub: 'to build',        type: 'feature' },
      { key: 'improve', label: 'Improvements', value: counts.improve, color: '#8b5cf6', sub: 'to enhance',      type: 'improve' },
      { key: 'bug',     label: 'Bugs',         value: counts.bug,     color: '#f59e0b', sub: 'to fix',          type: 'bug'     },
      { key: 'remove',  label: 'Remove',       value: counts.remove,  color: '#ef4444', sub: 'to cut',          type: 'remove'  },
      { key: 'done',    label: 'Done',         value: counts.done,    color: '#22c55e', sub: inProgress + ' in progress', type: null }
    ];

    var strip = document.getElementById('devKpiStrip');
    if (!strip) return;
    strip.innerHTML = kpis.map(function (k) {
      var isActive = (k.type && activeTypeFilter === k.type) || (k.key === 'total' && activeTypeFilter === 'all');
      return '<div class="dev-kpi-card' + (isActive ? ' active' : '') + '" data-kpi-type="' + (k.type || 'all') + '">'
        + '<div class="dev-kpi-card-label">' + k.label + '</div>'
        + '<div class="dev-kpi-card-value" style="color:' + k.color + ';">' + k.value + '</div>'
        + '<div class="dev-kpi-card-sub">' + k.sub + '</div>'
        + '</div>';
    }).join('');

    strip.querySelectorAll('.dev-kpi-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var t = this.dataset.kpiType;
        activeTypeFilter = t;
        syncFilterBtns();
        renderAll();
      });
    });
  }

  // ── Items list ────────────────────────────────────────────────────────────

  function renderItemsList() {
    var items = getFilteredItems();
    var container = document.getElementById('devItemsList');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '<div class="dev-empty"><i class="fas fa-inbox"></i><p>No items match your filters.<br>Hit <strong>New Item</strong> to add one.</p></div>';
      return;
    }

    container.innerHTML = items.map(function (item) {
      var ts = TYPE_STYLE[item.type] || TYPE_STYLE.feature;
      var ss = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
      var ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.medium;
      var isDone = item.status === 'done';
      var isCancelled = item.status === 'cancelled';

      var tagsHtml = (item.tags && item.tags.length)
        ? '<div class="dev-tags">' + item.tags.map(function (t) {
            return '<span class="dev-tag">' + escHtml(t) + '</span>';
          }).join('') + '</div>'
        : '';

      var descHtml = item.description
        ? '<div class="dev-item-desc">' + escHtml(item.description) + '</div>'
        : '';

      var notesHtml = item.notes
        ? '<div class="dev-item-notes"><i class="fas fa-sticky-note" style="margin-right:5px;opacity:0.5;"></i>' + escHtml(item.notes) + '</div>'
        : '';

      var nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(item.status) + 1) % STATUS_CYCLE.length];

      return '<div class="dev-item ' + (isDone ? 'done' : '') + ' ' + (isCancelled ? 'cancelled' : '') + '" '
        + 'style="border-left-color:' + ts.border + ';" id="dev-item-' + item.id + '">'

        + '<div>'
        + '<div class="dev-item-meta">'
        + '<span class="dev-type-badge" style="background:' + ts.bg + ';color:' + ts.color + ';">' + ts.label + '</span>'
        + '<span class="dev-priority-badge" style="color:' + ps.color + ';">' + ps.label + '</span>'
        + '</div>'

        + '<div class="dev-item-title' + (isDone ? ' done-text' : '') + '">' + escHtml(item.title) + '</div>'
        + descHtml
        + notesHtml
        + tagsHtml
        + '</div>'

        + '<div class="dev-item-actions">'
        + '<button class="dev-status-btn" style="background:' + ss.bg + ';color:' + ss.color + ';" '
          + 'data-id="' + item.id + '" data-next="' + nextStatus + '" title="Click to advance status">'
          + ss.label + '</button>'
        + '<div class="dev-action-btns">'
        + '<button class="btn btn-secondary btn-sm btn-icon" data-edit="' + item.id + '" title="Edit"><i class="fas fa-pen"></i></button>'
        + '<button class="btn btn-secondary btn-sm btn-icon" data-delete="' + item.id + '" title="Delete" style="color:var(--red);"><i class="fas fa-trash"></i></button>'
        + '</div>'
        + '<div class="dev-item-date">' + formatRelativeDate(item.createdAt) + '</div>'
        + '</div>'

        + '</div>';
    }).join('');

    // Wire up status buttons
    container.querySelectorAll('.dev-status-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.dataset.id;
        var next = this.dataset.next;
        updateItemStatus(id, next);
      });
    });

    // Wire up edit buttons
    container.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openEditModal(this.dataset.edit);
      });
    });

    // Wire up delete buttons
    container.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.dataset.delete;
        var items = loadItems();
        var item = items.find(function (i) { return i.id === id; });
        if (!item) return;
        if (!confirm('Delete "' + item.title + '"? This cannot be undone.')) return;
        var updated = items.filter(function (i) { return i.id !== id; });
        saveItems(updated);
        renderAll();
        showToast('Item deleted.', 'warning');
      });
    });
  }

  // ── Status quick-advance ──────────────────────────────────────────────────

  function updateItemStatus(id, newStatus) {
    var items = loadItems();
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    saveItems(items);
    renderAll();
    var ss = STATUS_STYLE[newStatus];
    showToast('"' + item.title.slice(0, 40) + '" → ' + ss.label, 'success');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function openNewModal() {
    editingId = null;
    document.getElementById('devModalTitle').textContent = 'New Item';
    document.getElementById('devForm').reset();
    document.getElementById('devPriority').value = 'medium';
    document.getElementById('devStatus').value = 'pending';
    document.getElementById('devModal').classList.add('open');
    document.getElementById('devTitle').focus();
  }

  function openEditModal(id) {
    var items = loadItems();
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    editingId = id;
    document.getElementById('devModalTitle').textContent = 'Edit Item';
    document.getElementById('devTitle').value = item.title;
    document.getElementById('devType').value = item.type;
    document.getElementById('devPriority').value = item.priority;
    document.getElementById('devStatus').value = item.status;
    document.getElementById('devDescription').value = item.description || '';
    document.getElementById('devTags').value = (item.tags || []).join(', ');
    document.getElementById('devNotes').value = item.notes || '';
    document.getElementById('devModal').classList.add('open');
    document.getElementById('devTitle').focus();
  }

  function closeModal() {
    document.getElementById('devModal').classList.remove('open');
    editingId = null;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    var title = document.getElementById('devTitle').value.trim();
    if (!title) return;

    var tagsRaw = document.getElementById('devTags').value.trim();
    var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];

    var items = loadItems();
    var now = new Date().toISOString();

    if (editingId) {
      var idx = items.findIndex(function (i) { return i.id === editingId; });
      if (idx > -1) {
        items[idx] = Object.assign(items[idx], {
          title: title,
          type: document.getElementById('devType').value,
          priority: document.getElementById('devPriority').value,
          status: document.getElementById('devStatus').value,
          description: document.getElementById('devDescription').value.trim() || null,
          tags: tags,
          notes: document.getElementById('devNotes').value.trim() || null,
          updatedAt: now
        });
        showToast('Item updated.', 'success');
      }
    } else {
      items.push({
        id: generateId(),
        title: title,
        type: document.getElementById('devType').value,
        priority: document.getElementById('devPriority').value,
        status: document.getElementById('devStatus').value,
        description: document.getElementById('devDescription').value.trim() || null,
        tags: tags,
        notes: document.getElementById('devNotes').value.trim() || null,
        createdAt: now,
        updatedAt: now
      });
      showToast('Item added.', 'success');
    }

    saveItems(items);
    closeModal();
    renderAll();
  }

  // ── Filter button sync ────────────────────────────────────────────────────

  function syncFilterBtns() {
    document.querySelectorAll('#typeFilters .dev-filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.type === activeTypeFilter);
    });
    document.querySelectorAll('#statusFilters .dev-filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.status === activeStatusFilter);
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function exportItems() {
    var items = getFilteredItems();
    if (!items.length) { showToast('No items to export.', 'error'); return; }
    exportToCSV(
      ['ID', 'Title', 'Type', 'Priority', 'Status', 'Description', 'Tags', 'Notes', 'Created', 'Updated'],
      items.map(function (i) {
        return [i.id, i.title, i.type, i.priority, i.status,
          i.description || '', (i.tags || []).join('; '), i.notes || '',
          i.createdAt, i.updatedAt];
      }),
      'yardboss-dev-tracker.csv'
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatRelativeDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Render all ────────────────────────────────────────────────────────────

  function renderAll() {
    renderKpiStrip();
    renderItemsList();
    syncFilterBtns();
  }

  // ── DOMContentLoaded ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();

    // New item button
    document.getElementById('newItemBtn').addEventListener('click', openNewModal);

    // Close modal
    document.getElementById('closeDevModal').addEventListener('click', closeModal);
    document.getElementById('cancelDevModal').addEventListener('click', closeModal);
    document.getElementById('devModal').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    // Form submit
    document.getElementById('devForm').addEventListener('submit', handleFormSubmit);

    // Type filter buttons
    document.querySelectorAll('#typeFilters .dev-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTypeFilter = this.dataset.type;
        renderAll();
      });
    });

    // Status filter buttons
    document.querySelectorAll('#statusFilters .dev-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeStatusFilter = this.dataset.status;
        renderAll();
      });
    });

    // Search
    document.getElementById('devSearch').addEventListener('input', function () {
      searchQuery = this.value.trim();
      renderAll();
    });

    // Export
    document.getElementById('devExportBtn').addEventListener('click', exportItems);

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  });

}());
