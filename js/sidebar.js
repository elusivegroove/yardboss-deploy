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
    <button class="nav-bell" title="Notifications">
      <i class="fas fa-bell"></i>
      <span class="nav-bell-badge">3</span>
    </button>
    <a href="/lots.html" class="btn-add-lot btn">
      <i class="fas fa-plus"></i><span>Add Lot</span>
    </a>
    <div class="nav-avatar" title="Toby Herndon">TH</div>
  </div>
</nav>
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

    function appendMsg(role, text) {
      var isAi = role === 'ai';
      var div = document.createElement('div');
      div.className = 'yb-chat-msg ' + (isAi ? 'yb-chat-msg-ai' : 'yb-chat-msg-user');
      if (isAi) {
        div.innerHTML = '<div class="yb-chat-msg-avatar">YB</div>' +
          '<div class="yb-chat-msg-bubble">' + mdToHtml(text) + '</div>';
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

      appendMsg('user', msg);
      chatHistory.push({ role: 'user', content: msg });
      showTyping();

      var page = window.location.pathname.replace('.html', '').split('/').pop() || 'dashboard';

      fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, page: page, history: chatHistory.slice(0, -1) })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        hideTyping();
        var reply = data.reply || data.error || 'Sorry, something went wrong.';
        appendMsg('ai', reply);
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
      })
      .catch(function() {
        hideTyping();
        appendMsg('ai', 'Sorry, I couldn\'t connect. Please try again.');
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
