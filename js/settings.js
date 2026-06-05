const ACTUAL_API_KEY = 'yb_live_k9x2m4p8q1r3s7t5u6v0w2y';
const MASKED_API_KEY = 'yb_live_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
let keyVisible = false;

function prefillProfile() {
  const owner = APP_DATA.owner;
  const businessNameEl = document.getElementById('businessName');
  const ownerNameEl = document.getElementById('ownerName');
  const ownerEmailEl = document.getElementById('ownerEmail');
  const ownerPhoneEl = document.getElementById('ownerPhone');
  const ownerAddressEl = document.getElementById('ownerAddress');

  if (businessNameEl) businessNameEl.value = owner.businessName || '';
  if (ownerNameEl) ownerNameEl.value = owner.name || '';
  if (ownerEmailEl) ownerEmailEl.value = owner.email || '';
  if (ownerPhoneEl) ownerPhoneEl.value = owner.phone || '';
  if (ownerAddressEl) ownerAddressEl.value = owner.address || '';
}

function showSavedMessage(elementId, message, duration) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = '<i class="fas fa-check-circle" style="margin-right:4px"></i>' + (message || 'Saved!');
  el.className = 'feedback-msg';
  el.style.display = 'inline-flex';
  setTimeout(function () {
    el.style.display = 'none';
  }, duration || 2000);
}

document.addEventListener('DOMContentLoaded', function () {
  prefillProfile();

  // ── Theme cards ────────────────────────────────────────────
  var currentTheme = window.YBTheme ? window.YBTheme.get() : (localStorage.getItem('yb-theme') || 'light');
  document.querySelectorAll('.theme-card-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    btn.addEventListener('click', function() {
      if (window.YBTheme) window.YBTheme.set(btn.dataset.theme);
      document.querySelectorAll('.theme-card-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.theme === btn.dataset.theme);
      });
    });
  });

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      APP_DATA.owner.businessName = document.getElementById('businessName').value;
      APP_DATA.owner.name = document.getElementById('ownerName').value;
      APP_DATA.owner.email = document.getElementById('ownerEmail').value;
      APP_DATA.owner.phone = document.getElementById('ownerPhone').value;
      APP_DATA.owner.address = document.getElementById('ownerAddress').value;
      showSavedMessage('profileSavedMsg', 'Changes saved!', 2500);
    });
  }

  const toggleKeyBtn = document.getElementById('toggleKeyBtn');
  if (toggleKeyBtn) {
    toggleKeyBtn.addEventListener('click', function () {
      keyVisible = !keyVisible;
      const display = document.getElementById('apiKeyDisplay');
      const icon = document.getElementById('toggleKeyIcon');
      if (display) display.textContent = keyVisible ? ACTUAL_API_KEY : MASKED_API_KEY;
      if (icon) {
        icon.className = keyVisible ? 'fas fa-eye-slash' : 'fas fa-eye';
      }
    });
  }

  const copyKeyBtn = document.getElementById('copyKeyBtn');
  if (copyKeyBtn) {
    copyKeyBtn.addEventListener('click', function () {
      const keyToCopy = ACTUAL_API_KEY;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyToCopy).then(function () {
          showCopied();
        }).catch(function () {
          fallbackCopy(keyToCopy);
        });
      } else {
        fallbackCopy(keyToCopy);
      }
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopied();
    } catch (e) {
      alert('Could not copy automatically. Key: ' + text);
    }
    document.body.removeChild(ta);
  }

  function showCopied() {
    const msg = document.getElementById('copiedMsg');
    if (msg) {
      msg.style.display = 'inline-flex';
      setTimeout(function () { msg.style.display = 'none'; }, 2000);
    }
  }

  const regenKeyBtn = document.getElementById('regenKeyBtn');
  if (regenKeyBtn) {
    regenKeyBtn.addEventListener('click', function () {
      if (confirm('Regenerate your API key? Your existing key will be invalidated immediately and any integrations using it will stop working.')) {
        const display = document.getElementById('apiKeyDisplay');
        if (display) {
          keyVisible = false;
          display.textContent = MASKED_API_KEY;
          const icon = document.getElementById('toggleKeyIcon');
          if (icon) icon.className = 'fas fa-eye';
        }
        alert('API key regenerated successfully.\nRemember to update all your integrations with the new key.');
      }
    });
  }
});
