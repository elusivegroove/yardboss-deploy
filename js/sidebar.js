// YardBoss — Top Navigation Injector + Theme Manager

const NAV_HTML = `
<nav class="top-nav" id="topNav">
  <button class="nav-hamburger" id="navHamburger"><i class="fas fa-bars"></i></button>
  <a href="/index.html" class="nav-logo">
    <div class="nav-logo-mark"><i class="fas fa-truck"></i></div>
    <span class="nav-logo-name">YardBoss</span>
    <span class="nav-logo-env" id="envBadge">sandbox</span>
  </a>
  <div class="nav-links" id="navLinks">
    <a href="/index.html" class="nav-link" data-page="index"><i class="fas fa-th-large"></i> Dashboard</a>
    <a href="/lots.html" class="nav-link" data-page="lots"><i class="fas fa-warehouse"></i> Manage Lots</a>
    <a href="/access.html" class="nav-link" data-page="access"><i class="fas fa-shield-alt"></i> Access</a>
    <a href="/reservations.html" class="nav-link" data-page="reservations"><i class="fas fa-users"></i> Tenants</a>
    <a href="/reports.html" class="nav-link" data-page="reports"><i class="fas fa-chart-bar"></i> Reports</a>
    <a href="/settings.html" class="nav-link" data-page="settings"><i class="fas fa-cog"></i> Settings</a>
    <a href="/portal/index.html" class="nav-link nav-external" target="_blank"><i class="fas fa-external-link-alt"></i> Portal</a>
    <a href="/dev.html" class="nav-link nav-dev" data-page="dev"><i class="fas fa-code"></i> Dev</a>
  </div>
  <div class="nav-actions">
    <div class="nav-search">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="Search tenants, lots...">
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
