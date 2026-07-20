// YardBoss — Top Navigation Injector + Theme Manager

// ── Branding (Settings → Branding) ──────────────────────────────────────────
// Applies a custom logo and/or primary color across the dashboard, if set.
function shadeColor(hex, percent) {
  hex = (hex || '').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
  var num = parseInt(hex, 16);
  if (isNaN(num)) return hex;
  var r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + percent / 100))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + percent / 100))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + percent / 100))));
  return '#' + [r, g, b].map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
}

function applyBranding() {
  fetch('/api/branding').then(function(r) { return r.json(); }).then(function(b) {
    if (b.primaryColor) {
      var style = document.createElement('style');
      style.textContent = ':root{--teal:' + b.primaryColor + ';--teal-dark:' + shadeColor(b.primaryColor, -12) + ';}';
      document.head.appendChild(style);
    }
    if (b.logoUrl) {
      document.querySelectorAll('img[src*="yardboss-logo"]').forEach(function(img) { img.src = b.logoUrl; });
    }
  }).catch(function() {});
}
applyBranding();

const NAV_HTML = `
<nav class="top-nav" id="topNav">
  <button class="nav-hamburger" id="navHamburger"><i class="fas fa-bars"></i></button>
  <a href="/index.html" class="nav-logo">
    <img src="/images/yardboss-logo.png" class="nav-logo-mark" alt="YardBoss">
    <span class="nav-logo-name">YardBoss</span>
    <span class="nav-logo-env" id="envBadge">sandbox</span>
  </a>
  <div class="nav-links" id="navLinks">
    <a href="/index.html" class="nav-link" data-page="index"><i class="fas fa-th-large"></i> Dashboard</a>
    <a href="/lots.html" class="nav-link" data-page="lots"><i class="fas fa-warehouse"></i> Manage Lots</a>
    <a href="/access.html" class="nav-link" data-page="access"><i class="fas fa-shield-alt"></i> Access</a>
    <a href="/reservations.html" class="nav-link" data-page="reservations"><i class="fas fa-users"></i> Tenants</a>
    <a href="/billing.html" class="nav-link" data-page="billing"><i class="fas fa-file-invoice-dollar"></i> Billing</a>
    <a href="/reports.html" class="nav-link" data-page="reports"><i class="fas fa-chart-bar"></i> Reports</a>
    <a href="/settings.html" class="nav-link" data-page="settings"><i class="fas fa-cog"></i> Settings</a>
    <a href="/portal/index.html" class="nav-link nav-external" target="_blank"><i class="fas fa-external-link-alt"></i> Portal</a>
    <a href="/dev.html" class="nav-link nav-dev" data-page="dev"><i class="fas fa-code"></i> Dev</a>
  </div>
  <div class="nav-actions">
    <div class="nav-search" id="navSearchTrigger">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="Search tenants, lots..." readonly>
      <span class="nav-search-kbd" id="navSearchKbd">Ctrl K</span>
    </div>
    <div class="theme-picker" id="themePicker">
      <button class="nav-theme-btn" id="navThemeBtn" title="Change theme">
        <i class="fas fa-sun" id="navThemeIcon"></i>
      </button>
      <div class="theme-drop" id="themeDrop">
        <button class="theme-opt" data-theme="light"><i class="fas fa-sun"></i> Light</button>
        <button class="theme-opt" data-theme="dark"><i class="fas fa-moon"></i> Dark</button>
        <button class="theme-opt" data-theme="midnight"><i class="fas fa-star"></i> Midnight</button>
      </div>
    </div>
    <div class="nav-bell-wrap">
      <button class="nav-bell" id="navBell" title="Notifications">
        <i class="fas fa-bell"></i>
        <span class="nav-bell-badge" id="navBellBadge" style="display:none;">0</span>
      </button>
      <div class="yb-notif-panel" id="ybNotifPanel">
        <div class="yb-notif-head">
          <span class="yb-notif-title">Notifications</span>
          <button class="yb-notif-mark-all" id="ybNotifMarkAll">Mark all read</button>
        </div>
        <div class="yb-notif-list" id="ybNotifList"></div>
      </div>
    </div>
    <button class="btn-share-portal btn" id="btnSharePortal" onclick="openSharePortal()" title="Send portal booking link to a client">
      <i class="fas fa-share-alt"></i><span>Send Portal Link</span>
    </button>
    <a href="/lots.html" class="btn-add-lot btn">
      <i class="fas fa-plus"></i><span>Add Lot</span>
    </a>
    <div class="nav-avatar" title="Toby Herndon">TH</div>
  </div>
</nav>

<!-- Share Portal Modal -->
<div class="modal-backdrop" id="sharePortalModal" style="display:none; z-index:1100;" onclick="if(event.target===this)closeSharePortal()">
  <div class="modal" style="max-width:420px; padding:28px 28px 24px;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
      <div>
        <div style="font-size:1rem; font-weight:700; color:var(--navy);"><i class="fas fa-share-alt" style="color:var(--teal); margin-right:8px;"></i>Send Portal Link</div>
        <div style="font-size:0.78rem; color:var(--gray-400); margin-top:3px;">Share the booking link with a potential client</div>
      </div>
      <button onclick="closeSharePortal()" style="background:none;border:none;font-size:1.1rem;color:var(--gray-400);cursor:pointer;padding:4px;">&times;</button>
    </div>
    <div style="font-size:0.78rem; background:var(--gray-50); border:1px solid var(--gray-200); border-radius:8px; padding:10px 14px; margin-bottom:18px; display:flex; align-items:center; gap:8px;">
      <i class="fas fa-link" style="color:var(--teal); flex-shrink:0;"></i>
      <span id="portalLinkDisplay" style="color:var(--navy); font-weight:500; word-break:break-all;">https://yardboss-deploy.vercel.app/portal/</span>
      <button onclick="copyPortalLink()" title="Copy link" style="background:none;border:none;cursor:pointer;color:var(--teal);padding:0 0 0 6px;font-size:0.85rem;" id="copyLinkBtn"><i class="fas fa-copy"></i></button>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:0.8rem; font-weight:600; color:var(--gray-600); display:block; margin-bottom:5px;">Client Name</label>
      <input type="text" id="shareClientName" placeholder="e.g. John Rivera" style="width:100%; padding:9px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:0.875rem; color:var(--navy); outline:none; box-sizing:border-box;" onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--gray-200)'">
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:0.8rem; font-weight:600; color:var(--gray-600); display:block; margin-bottom:5px;">Phone Number <span style="font-weight:400; color:var(--gray-400);">(for text message)</span></label>
      <input type="tel" id="sharePhone" placeholder="(863) 555-0100" style="width:100%; padding:9px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:0.875rem; color:var(--navy); outline:none; box-sizing:border-box;" onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--gray-200)'">
    </div>
    <div style="margin-bottom:20px;">
      <label style="font-size:0.8rem; font-weight:600; color:var(--gray-600); display:block; margin-bottom:5px;">Email Address <span style="font-weight:400; color:var(--gray-400);">(optional)</span></label>
      <input type="email" id="shareEmail" placeholder="client@example.com" style="width:100%; padding:9px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:0.875rem; color:var(--navy); outline:none; box-sizing:border-box;" onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--gray-200)'">
    </div>
    <div id="sharePortalStatus" style="font-size:0.8rem; margin-bottom:12px; min-height:18px;"></div>
    <div style="display:flex; gap:10px;">
      <button onclick="closeSharePortal()" style="flex:1; padding:10px; border:1.5px solid var(--gray-200); border-radius:8px; background:#fff; color:var(--gray-600); font-size:0.875rem; font-weight:600; cursor:pointer;">Cancel</button>
      <button onclick="sendPortalLink()" id="sendPortalBtn" style="flex:2; padding:10px; border:none; border-radius:8px; background:var(--teal); color:#fff; font-size:0.875rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;"><i class="fas fa-paper-plane"></i> Send</button>
    </div>
  </div>
</div>
`;

// ── Global Search (Ctrl/Cmd+K) ────────────────────────────────

const GLOBAL_SEARCH_HTML = `
<div class="modal-backdrop" id="globalSearchModal">
  <div class="modal global-search-modal">
    <div class="global-search-input-wrap">
      <i class="fas fa-search"></i>
      <input type="text" id="globalSearchInput" placeholder="Search tenants, lots, pages..." autocomplete="off">
      <span class="global-search-esc">ESC</span>
    </div>
    <div class="global-search-results" id="globalSearchResults"></div>
  </div>
</div>
`;

const SEARCH_PAGES = [
  { title: 'Dashboard', sub: 'Overview & KPIs', icon: 'fa-th-large', href: '/index.html' },
  { title: 'Manage Lots', sub: 'Lots & spaces', icon: 'fa-warehouse', href: '/lots.html' },
  { title: 'Access Control', sub: 'Gate & access logs', icon: 'fa-shield-alt', href: '/access.html' },
  { title: 'Tenants', sub: 'Tenants & reservations', icon: 'fa-users', href: '/reservations.html' },
  { title: 'Billing Center', sub: 'Receivables & invoices', icon: 'fa-file-invoice-dollar', href: '/billing.html' },
  { title: 'Reports', sub: 'Financial & operational reports', icon: 'fa-chart-bar', href: '/reports.html' },
  { title: 'Settings', sub: 'Account & preferences', icon: 'fa-cog', href: '/settings.html' }
];

var _gsResults = [];
var _gsActiveIndex = -1;

function gsBuildResults(query) {
  var q = query.trim().toLowerCase();
  if (!q) return [];
  var results = [];

  if (typeof APP_DATA !== 'undefined' && APP_DATA.tenants) {
    APP_DATA.tenants.forEach(function (t) {
      var hay = [t.name, t.company, t.email, t.spaceNumber, t.vehicle && t.vehicle.plate]
        .filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) {
        results.push({
          type: 'Tenant', icon: 'fa-user',
          title: t.name,
          sub: (t.company ? t.company + ' · ' : '') + 'Space ' + (t.spaceNumber || '—'),
          href: '/reservations.html?tenant=' + encodeURIComponent(t.id)
        });
      }
    });
  }

  if (typeof APP_DATA !== 'undefined' && APP_DATA.lots) {
    APP_DATA.lots.forEach(function (l) {
      var hay = [l.name, l.address, l.city, l.state].filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) {
        results.push({
          type: 'Lot', icon: 'fa-warehouse',
          title: l.name,
          sub: [l.address, l.city].filter(Boolean).join(', ') || (l.totalSpaces + ' spaces'),
          href: '/lots.html'
        });
      }
    });
  }

  SEARCH_PAGES.forEach(function (p) {
    if (p.title.toLowerCase().indexOf(q) !== -1 || p.sub.toLowerCase().indexOf(q) !== -1) {
      results.push({ type: 'Page', icon: p.icon, title: p.title, sub: p.sub, href: p.href });
    }
  });

  return results.slice(0, 30);
}

function gsUpdateActive() {
  document.querySelectorAll('.gs-result').forEach(function (el) {
    el.classList.toggle('active', parseInt(el.dataset.index, 10) === _gsActiveIndex);
  });
  var active = document.querySelector('.gs-result.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function gsRender(results) {
  _gsResults = results;
  _gsActiveIndex = results.length ? 0 : -1;
  var container = document.getElementById('globalSearchResults');
  if (!container) return;

  if (!results.length) {
    var q = document.getElementById('globalSearchInput').value.trim();
    container.innerHTML = '<div class="gs-empty">' +
      (q ? 'No results for "' + q + '"' : 'Start typing to search tenants, lots, and pages…') +
      '</div>';
    return;
  }

  var groups = {};
  results.forEach(function (r) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  });

  var order = ['Tenant', 'Lot', 'Page'];
  var labels = { Tenant: 'Tenants', Lot: 'Lots', Page: 'Pages' };
  var html = '';
  var idx = 0;
  order.forEach(function (type) {
    if (!groups[type]) return;
    html += '<div class="gs-section-label">' + labels[type] + '</div>';
    groups[type].forEach(function (r) {
      html += '<div class="gs-result' + (idx === 0 ? ' active' : '') + '" data-index="' + idx + '" data-href="' + r.href + '">'
        + '<div class="gs-result-icon"><i class="fas ' + r.icon + '"></i></div>'
        + '<div class="gs-result-text"><div class="gs-result-title">' + r.title + '</div><div class="gs-result-sub">' + r.sub + '</div></div>'
        + '</div>';
      idx++;
    });
  });
  container.innerHTML = html;

  container.querySelectorAll('.gs-result').forEach(function (el) {
    el.addEventListener('click', function () {
      window.location.href = this.dataset.href;
    });
    el.addEventListener('mouseenter', function () {
      _gsActiveIndex = parseInt(this.dataset.index, 10);
      gsUpdateActive();
    });
  });
}

function openGlobalSearch() {
  var modal = document.getElementById('globalSearchModal');
  var input = document.getElementById('globalSearchInput');
  if (!modal || !input) return;
  modal.classList.add('open');
  input.value = '';
  gsRender([]);
  setTimeout(function () { input.focus(); }, 50);
}

function closeGlobalSearch() {
  var modal = document.getElementById('globalSearchModal');
  if (modal) modal.classList.remove('open');
}

// ── Theme management ────────────────────────────────────────

var THEMES = ['light', 'dark', 'midnight'];
var THEME_ICONS = { light: 'fa-sun', dark: 'fa-moon', midnight: 'fa-star' };

function applyTheme(theme) {
  if (theme && theme !== 'light') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('yb-theme', theme || 'light');
}

function syncThemeUI(theme) {
  var icon = document.getElementById('navThemeIcon');
  if (icon) {
    icon.className = 'fas ' + (THEME_ICONS[theme] || 'fa-sun');
  }
  document.querySelectorAll('.theme-opt').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  // Settings page cards
  document.querySelectorAll('.theme-card-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// Called by settings.js too (exposed on window)
window.YBTheme = {
  get: function() { return localStorage.getItem('yb-theme') || 'light'; },
  set: function(theme) {
    applyTheme(theme);
    syncThemeUI(theme);
  }
};

(function() {
  // ── Inject nav ────────────────────────────────────────────
  var placeholder = document.getElementById('nav-placeholder');
  if (placeholder) placeholder.innerHTML = NAV_HTML;

  // ── Global search (Ctrl/Cmd+K) ─────────────────────────────
  document.body.insertAdjacentHTML('beforeend', GLOBAL_SEARCH_HTML);

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var kbdEl = document.getElementById('navSearchKbd');
  if (kbdEl) kbdEl.textContent = isMac ? '⌘K' : 'Ctrl K';

  var gsModal = document.getElementById('globalSearchModal');
  var gsInput = document.getElementById('globalSearchInput');
  var gsTrigger = document.getElementById('navSearchTrigger');

  if (gsTrigger) {
    gsTrigger.addEventListener('click', function () {
      openGlobalSearch();
    });
  }

  if (gsInput) {
    gsInput.addEventListener('input', function () {
      gsRender(gsBuildResults(this.value));
    });
    gsInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_gsActiveIndex < _gsResults.length - 1) { _gsActiveIndex++; gsUpdateActive(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_gsActiveIndex > 0) { _gsActiveIndex--; gsUpdateActive(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_gsActiveIndex >= 0 && _gsResults[_gsActiveIndex]) {
          window.location.href = _gsResults[_gsActiveIndex].href;
        }
      }
    });
  }

  if (gsModal) {
    gsModal.addEventListener('click', function (e) {
      if (e.target === this) closeGlobalSearch();
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearch();
    } else if (e.key === 'Escape' && gsModal && gsModal.classList.contains('open')) {
      closeGlobalSearch();
    }
  });

  // ── Active link ───────────────────────────────────────────
  var path = window.location.pathname;
  var file = path.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
    if (link.dataset.page === file) link.classList.add('active');
  });

  // ── Env badge ─────────────────────────────────────────────
  fetch('/api/env').then(function(r) { return r.json(); }).then(function(env) {
    var badge = document.getElementById('envBadge');
    if (badge) {
      badge.textContent = env.environment;
      badge.className = 'nav-logo-env ' + env.environment;
    }
  }).catch(function() {});

  // ── Mobile hamburger ──────────────────────────────────────
  var hamburger = document.getElementById('navHamburger');
  var navLinks  = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('mobile-open');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('mobile-open');
      }
    });
  }

  // ── AI Help Chat Widget ───────────────────────────────────────────────────────
  (function() {
    var CHAT_HTML = '<div id="ybChatWidget">' +
      '<div id="ybChatPanel">' +
        '<div class="yb-chat-header">' +
          '<div class="yb-chat-header-info">' +
            '<div class="yb-chat-avatar-sm">YB</div>' +
            '<div><div class="yb-chat-title">YardBoss Assistant</div><div class="yb-chat-subtitle">Ask me anything</div></div>' +
          '</div>' +
          '<button class="yb-chat-close" id="ybChatClose"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="yb-chat-body" id="ybChatBody">' +
          '<div class="yb-chat-msg yb-chat-msg-ai">' +
            '<div class="yb-chat-msg-avatar">YB</div>' +
            '<div class="yb-chat-msg-bubble">Hi! I\'m your YardBoss Assistant. Ask me how to do anything — add a tenant, record a payment, verify a registration, set up SMS templates, and more.</div>' +
          '</div>' +
        '</div>' +
        '<div class="yb-chat-foot">' +
          '<textarea id="ybChatInput" placeholder="Ask me anything..." rows="1"></textarea>' +
          '<button id="ybChatSend"><i class="fas fa-paper-plane"></i></button>' +
        '</div>' +
      '</div>' +
      '<button id="ybChatBtn" title="Ask YardBoss Assistant">' +
        '<i class="fas fa-comments"></i>' +
        '<span class="yb-chat-btn-dot"></span>' +
      '</button>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', CHAT_HTML);

    var panel    = document.getElementById('ybChatPanel');
    var btn      = document.getElementById('ybChatBtn');
    var closeBtn = document.getElementById('ybChatClose');
    var body     = document.getElementById('ybChatBody');
    var input    = document.getElementById('ybChatInput');
    var sendBtn  = document.getElementById('ybChatSend');
    var chatOpen = false;
    var isLoading = false;
    var chatHistory = [];

    function toggleChat() {
      chatOpen = !chatOpen;
      panel.classList.toggle('open', chatOpen);
      if (chatOpen) { setTimeout(function() { input.focus(); }, 220); }
    }

    function mdToHtml(text) {
      var escaped = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      var lines = escaped.split('\n');
      var out = '';
      var inOl = false, inUl = false;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var olMatch = line.match(/^(\d+)\.\s+(.*)/);
        var ulMatch = line.match(/^[-*]\s+(.*)/);
        if (olMatch) {
          if (!inOl) { if (inUl) { out += '</ul>'; inUl = false; } out += '<ol>'; inOl = true; }
          out += '<li>' + olMatch[2] + '</li>';
        } else if (ulMatch) {
          if (!inUl) { if (inOl) { out += '</ol>'; inOl = false; } out += '<ul>'; inUl = true; }
          out += '<li>' + ulMatch[1] + '</li>';
        } else {
          if (inOl) { out += '</ol>'; inOl = false; }
          if (inUl) { out += '</ul>'; inUl = false; }
          if (line === '') { out += '<br>'; } else { out += line + '<br>'; }
        }
      }
      if (inOl) out += '</ol>';
      if (inUl) out += '</ul>';
      return out;
    }

    function getActiveTenantId() {
      return (typeof _panelTenantId !== 'undefined' && _panelTenantId) ? _panelTenantId : null;
    }

    function getActiveTenantName() {
      var id = getActiveTenantId();
      if (!id || typeof APP_DATA === 'undefined' || !APP_DATA.tenants) return null;
      var t = APP_DATA.tenants.filter(function(x) { return x.id === id; })[0];
      return t ? t.name : null;
    }

    function getCurrentPage() {
      return window.location.pathname.replace('.html', '').split('/').pop() || 'index';
    }

    function executeYBAction(action, btnEl) {
      if (action.type === 'navigate') {
        window.location.href = action.href;
        return;
      }
      if (action.type === 'fn') {
        var fn = window[action.fn];
        if (typeof fn !== 'function') {
          appendMsg('ai', 'That action isn\'t available on this page. Navigate there first.', []);
          return;
        }
        var activeTenantId = getActiveTenantId();
        var args = (action.args || []).map(function(a) {
          return a === '{activeTenantId}' ? activeTenantId : a;
        });
        try {
          fn.apply(null, args);
          btnEl.classList.add('yb-action-done');
          btnEl.innerHTML = '<i class="fas fa-check"></i> ' + action.label;
          btnEl.disabled = true;
        } catch (e) {
          appendMsg('ai', 'That action failed. Try doing it manually.', []);
        }
      }
    }

    function appendMsg(role, text, actions) {
      var isAi = role === 'ai';
      var div = document.createElement('div');
      div.className = 'yb-chat-msg ' + (isAi ? 'yb-chat-msg-ai' : 'yb-chat-msg-user');

      if (isAi) {
        var currentPage = getCurrentPage();
        var activeTenantId = getActiveTenantId();

        // Filter to only show contextually valid actions
        var validActions = (actions || []).filter(function(a) {
          if (a.requiresPage && a.requiresPage !== currentPage) return false;
          if (a.requiresContext === 'activeTenant' && !activeTenantId) return false;
          return true;
        });

        var actionsHtml = '';
        if (validActions.length) {
          actionsHtml = '<div class="yb-chat-actions">' +
            validActions.map(function(a, i) {
              return '<button class="yb-chat-action-btn" data-idx="' + i + '">' + a.label + '</button>';
            }).join('') +
          '</div>';
        }

        div.innerHTML =
          '<div class="yb-chat-msg-avatar">YB</div>' +
          '<div class="yb-chat-msg-content">' +
            '<div class="yb-chat-msg-bubble">' + mdToHtml(text) + '</div>' +
            actionsHtml +
          '</div>';

        if (validActions.length) {
          div.querySelectorAll('.yb-chat-action-btn').forEach(function(b) {
            var action = validActions[parseInt(b.dataset.idx, 10)];
            b.addEventListener('click', function() { executeYBAction(action, b); });
          });

          // Auto-execute flagged actions after a short delay so user can read first
          validActions.forEach(function(a, i) {
            if (!a.autoExecute) return;
            var b = div.querySelector('[data-idx="' + i + '"]');
            if (!b) return;
            setTimeout(function() {
              if (b.disabled) return; // already fired manually
              b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' +
                (a.type === 'navigate' ? 'Going...' : 'Doing it...');
              setTimeout(function() { executeYBAction(a, b); }, 500);
            }, 900);
          });
        }
      } else {
        div.innerHTML = '<div class="yb-chat-msg-bubble">' + mdToHtml(text) + '</div>';
      }

      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    function showTyping() {
      var el = document.createElement('div');
      el.className = 'yb-chat-msg yb-chat-msg-ai';
      el.id = 'ybTyping';
      el.innerHTML = '<div class="yb-chat-msg-avatar">YB</div>' +
        '<div class="yb-chat-msg-bubble yb-chat-typing">' +
          '<span></span><span></span><span></span>' +
        '</div>';
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    function hideTyping() {
      var el = document.getElementById('ybTyping');
      if (el) el.parentNode.removeChild(el);
    }

    function send() {
      var msg = input.value.trim();
      if (!msg || isLoading) return;
      input.value = '';
      input.style.height = 'auto';
      isLoading = true;
      sendBtn.disabled = true;

      appendMsg('user', msg, []);
      chatHistory.push({ role: 'user', content: msg });
      showTyping();

      fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          page: getCurrentPage(),
          history: chatHistory.slice(0, -1),
          activeTenantId: getActiveTenantId(),
          activeTenantName: getActiveTenantName()
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        hideTyping();
        var message = data.message || data.error || 'Sorry, something went wrong.';
        var actions = data.actions || [];
        appendMsg('ai', message, actions);
        chatHistory.push({ role: 'assistant', content: message });
        if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
      })
      .catch(function() {
        hideTyping();
        appendMsg('ai', 'Sorry, I couldn\'t connect. Please try again.', []);
      })
      .finally(function() {
        isLoading = false;
        sendBtn.disabled = false;
        input.focus();
      });
    }

    btn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', send);

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
  })();

  // ── Notifications ─────────────────────────────────────────
  var _notifOpen = false;
  var _notifRead = JSON.parse(localStorage.getItem('yb-notif-read') || 'false');

  function buildNotifications() {
    var items = [];
    if (typeof APP_DATA !== 'undefined' && APP_DATA.tenants) {
      var tenants = APP_DATA.tenants;
      var pending = tenants.filter(function(t){ return t.status === 'pending'; });
      if (pending.length) {
        items.push({ type: 'warning', icon: 'fa-hourglass-half', text: pending.length + ' booking' + (pending.length > 1 ? 's' : '') + ' awaiting your approval', href: '/reservations.html' });
      }
      var zeroRate = tenants.filter(function(t){ return t.status === 'active' && (!t.monthlyRate || t.monthlyRate === 0); });
      if (zeroRate.length) {
        items.push({ type: 'error', icon: 'fa-dollar-sign', text: zeroRate.length + ' active tenant' + (zeroRate.length > 1 ? 's have' : ' has') + ' no monthly rate set', href: '/reservations.html' });
      }
      var today = new Date();
      var in30 = new Date(today); in30.setDate(in30.getDate() + 30);
      var expiring = tenants.filter(function(t){
        if (!t.insuranceExpDate) return false;
        var d = new Date(t.insuranceExpDate);
        return d >= today && d <= in30;
      });
      if (expiring.length) {
        items.push({ type: 'warning', icon: 'fa-shield-alt', text: expiring.length + ' insurance doc' + (expiring.length > 1 ? 's' : '') + ' expiring within 30 days', href: '/reservations.html' });
      }
      var moveouts = tenants.filter(function(t){ return t.status === 'moveout'; });
      if (moveouts.length) {
        items.push({ type: 'info', icon: 'fa-dolly', text: moveouts.length + ' tenant' + (moveouts.length > 1 ? 's are' : ' is') + ' in move-out status', href: '/reservations.html' });
      }
    }
    if (!items.length) {
      items.push({ type: 'success', icon: 'fa-check-circle', text: 'All caught up — no pending items' });
    }
    return items;
  }

  function renderNotifications() {
    var list    = document.getElementById('ybNotifList');
    var badge   = document.getElementById('navBellBadge');
    if (!list) return;
    var items   = buildNotifications();
    var urgentCount = _notifRead ? 0 : items.filter(function(i){ return i.type === 'warning' || i.type === 'error'; }).length;
    if (badge) {
      badge.textContent = urgentCount;
      badge.style.display = urgentCount > 0 ? 'flex' : 'none';
    }
    list.innerHTML = items.map(function(n) {
      var colors = { warning: '#f59e0b', error: '#ef4444', info: 'var(--teal)', success: '#16a34a' };
      var col = colors[n.type] || 'var(--teal)';
      return '<div class="yb-notif-item' + (n.href ? ' yb-notif-clickable' : '') + '"' + (n.href ? ' data-href="' + n.href + '"' : '') + '>'
        + '<div class="yb-notif-icon"><i class="fas ' + n.icon + '" style="color:' + col + ';"></i></div>'
        + '<div class="yb-notif-text">' + n.text + '</div>'
        + '</div>';
    }).join('');
    list.querySelectorAll('.yb-notif-clickable').forEach(function(el) {
      el.addEventListener('click', function(){ window.location.href = this.dataset.href; });
    });
  }

  var navBell    = document.getElementById('navBell');
  var notifPanel = document.getElementById('ybNotifPanel');

  if (navBell) {
    navBell.addEventListener('click', function(e) {
      e.stopPropagation();
      _notifOpen = !_notifOpen;
      if (notifPanel) notifPanel.classList.toggle('open', _notifOpen);
      if (_notifOpen) { _notifRead = false; localStorage.removeItem('yb-notif-read'); renderNotifications(); }
    });
  }

  var markAllBtn = document.getElementById('ybNotifMarkAll');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _notifRead = true;
      localStorage.setItem('yb-notif-read', 'true');
      renderNotifications();
    });
  }

  document.addEventListener('click', function(e) {
    if (!_notifOpen) return;
    if (notifPanel && !notifPanel.contains(e.target) && navBell && !navBell.contains(e.target)) {
      _notifOpen = false;
      notifPanel.classList.remove('open');
    }
  });

  // Initialize badge after APP_DATA may have loaded
  setTimeout(renderNotifications, 300);

  // ── Theme picker ──────────────────────────────────────────
  var currentTheme = localStorage.getItem('yb-theme') || 'light';
  syncThemeUI(currentTheme);

  var themeBtn  = document.getElementById('navThemeBtn');
  var themeDrop = document.getElementById('themeDrop');

  if (themeBtn && themeDrop) {
    themeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      themeDrop.classList.toggle('open');
    });

    themeDrop.querySelectorAll('.theme-opt').forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.YBTheme.set(btn.dataset.theme);
        themeDrop.classList.remove('open');
      });
    });

    document.addEventListener('click', function(e) {
      if (!document.getElementById('themePicker').contains(e.target)) {
        themeDrop.classList.remove('open');
      }
    });
  }
})();

// ── Share Portal Link ─────────────────────────────────────────────────────────
var PORTAL_URL = 'https://yardboss-deploy.vercel.app/portal/';

function openSharePortal() {
  document.getElementById('sharePortalModal').style.display = 'flex';
  document.getElementById('shareClientName').value = '';
  document.getElementById('sharePhone').value = '';
  document.getElementById('shareEmail').value = '';
  document.getElementById('sharePortalStatus').innerHTML = '';
  document.getElementById('shareClientName').focus();
}

function closeSharePortal() {
  document.getElementById('sharePortalModal').style.display = 'none';
}

function copyPortalLink() {
  navigator.clipboard.writeText(PORTAL_URL).then(function() {
    var btn = document.getElementById('copyLinkBtn');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(function() { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1800);
  });
}

async function sendPortalLink() {
  var name  = document.getElementById('shareClientName').value.trim();
  var phone = document.getElementById('sharePhone').value.trim();
  var email = document.getElementById('shareEmail').value.trim();
  var status = document.getElementById('sharePortalStatus');
  var btn = document.getElementById('sendPortalBtn');

  if (!phone && !email) {
    status.innerHTML = '<span style="color:#dc2626;">Please enter a phone number or email address.</span>';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:6px;"></span> Sending...';
  status.innerHTML = '';

  var greeting = name ? ('Hi ' + name + '!') : 'Hi!';
  var smsBody = greeting + ' TransVega RV & Truck Center invites you to book your yard space online. Reserve a spot in minutes at: ' + PORTAL_URL;
  var sent = [];
  var errors = [];

  if (phone) {
    try {
      var r = await fetch('/api/sms/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, body: smsBody })
      });
      var d = await r.json();
      if (r.ok && !d.error) { sent.push('text message'); }
      else { errors.push('SMS: ' + (d.error || 'failed')); }
    } catch(e) { errors.push('SMS: ' + e.message); }
  }

  if (email) {
    try {
      var emailHtml = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">' +
        '<img src="https://yardboss-deploy.vercel.app/images/transvega-logo.png" alt="TransVega RV &amp; Truck Center" style="max-width:180px;margin-bottom:24px;">' +
        '<h2 style="color:#0f1e3c;margin-bottom:8px;">Book Your Yard Space Online</h2>' +
        (name ? '<p style="color:#64748b;">Hi ' + name + ',</p>' : '') +
        '<p style="color:#64748b;line-height:1.6;">TransVega RV &amp; Truck Center invites you to reserve commercial parking, RV storage, or truck yard space — online, in minutes.</p>' +
        '<a href="' + PORTAL_URL + '" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#00b4a0;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:1rem;">Reserve a Space →</a>' +
        '<p style="color:#94a3b8;font-size:0.8rem;margin-top:24px;">Questions? Call <a href="tel:+18636003626" style="color:#00b4a0;">(863) 600-3626</a></p>' +
        '</div>';
      var r2 = await fetch('/api/send-receipt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, tenantName: name || '', subject: 'Book Your Yard Space — TransVega RV & Truck Center', html: emailHtml })
      });
      var d2 = await r2.json();
      if (r2.ok && !d2.error) { sent.push('email'); }
      else { errors.push('Email: ' + (d2.error || 'failed')); }
    } catch(e) { errors.push('Email: ' + e.message); }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';

  if (sent.length) {
    status.innerHTML = '<span style="color:#16a34a;"><i class="fas fa-check-circle"></i> Sent via ' + sent.join(' & ') + (name ? ' to ' + name : '') + '.</span>';
    setTimeout(closeSharePortal, 2200);
  }
  if (errors.length) {
    status.innerHTML += '<span style="color:#dc2626;display:block;margin-top:4px;">' + errors.join(' · ') + '</span>';
  }
}
