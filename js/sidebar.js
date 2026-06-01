// YardBoss — Top Navigation Injector
// Replaces old sidebar pattern with horizontal top nav

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
    <button class="nav-bell" title="Notifications">
      <i class="fas fa-bell"></i>
      <span class="nav-bell-badge">3</span>
    </button>
    <a href="/lots.html" class="btn-add-lot btn">
      <i class="fas fa-plus"></i><span>Add Lot</span>
    </a>
    <div class="nav-avatar" title="Marcus Thompson">MT</div>
  </div>
</nav>
`;

(function() {
  const path = window.location.pathname;
  const file = path.split('/').pop().replace('.html', '') || 'index';

  // Inject nav
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) placeholder.innerHTML = NAV_HTML;

  // Set active link
  document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
    if (link.dataset.page === file) link.classList.add('active');
  });

  // Set env badge
  fetch('/api/env').then(function(r) { return r.json(); }).then(function(env) {
    const badge = document.getElementById('envBadge');
    if (badge) {
      badge.textContent = env.environment;
      badge.className = 'nav-logo-env ' + env.environment;
    }
  }).catch(function() {});

  // Mobile hamburger
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
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
})();
