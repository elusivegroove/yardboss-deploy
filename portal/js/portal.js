// YardBoss Portal — Shared utilities

const API = ''; // relative to current origin (served by Express)

// ── Toast notification ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = '';
  const icon = document.createElement('i');
  icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  const text = document.createElement('span');
  text.textContent = msg;
  el.appendChild(icon);
  el.appendChild(text);
  el.className = `toast ${type} show`;
  setTimeout(() => { el.className = 'toast'; }, 3500);
}

// ── Fetch lots and render on homepage ─────────────────────────────────────
async function loadLots() {
  const grid = document.getElementById('lotsGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/portal/lots');
    const lots = await res.json();
    renderLots(lots, grid);
  } catch (e) {
    // Fallback: show static mock data when server isn't running
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400);">Could not connect to server. <a href="#" onclick="location.reload()" style="color:var(--teal);">Retry</a></div>';
  }
}

function renderLots(lots, grid) {
  if (!lots.length) {
    grid.innerHTML = '<p style="color:var(--gray-400);grid-column:1/-1;text-align:center;padding:40px;">No lots currently available.</p>';
    return;
  }
  grid.innerHTML = lots.map(lot => {
    const avail = lot.vacantSpaces > 20 ? 'available' : lot.vacantSpaces > 5 ? 'limited' : 'full';
    const availText = avail === 'available' ? 'Spaces Available' : avail === 'limited' ? 'Limited Spaces' : 'Full';
    const rateStr = `From <strong>$${lot.lowestRate}</strong>/month`;
    return `
    <div class="lot-card" onclick="window.location.href='book.html?lot=${lot.id}'">
      <div class="lot-card-img">
        <img src="${lot.image}" alt="${lot.name}" onerror="this.style.display='none'">
      </div>
      <div class="lot-card-body">
        <div class="lot-card-header">
          <div class="lot-card-name">${lot.name}</div>
          <span class="availability-badge ${avail}">${availText}</span>
        </div>
        <div class="lot-card-address"><i class="fas fa-map-marker-alt" style="color:var(--teal);margin-right:4px;"></i>${lot.address}</div>
        <div class="lot-card-stats">
          <div class="lot-stat"><div class="lot-stat-value">${lot.totalSpaces}</div><div class="lot-stat-label">Total</div></div>
          <div class="lot-stat"><div class="lot-stat-value" style="color:${avail==='full'?'var(--red)':'var(--green)'}">${lot.vacantSpaces}</div><div class="lot-stat-label">Vacant</div></div>
          <div class="lot-stat"><div class="lot-stat-value">${lot.amenities.length}</div><div class="lot-stat-label">Amenities</div></div>
        </div>
        <div class="lot-amenities">
          ${lot.amenities.slice(0, 3).map(a => `<span class="amenity-tag"><i class="fas fa-check" style="color:var(--teal);margin-right:3px;font-size:0.65rem;"></i>${a}</span>`).join('')}
          ${lot.amenities.length > 3 ? `<span class="amenity-tag">+${lot.amenities.length - 3} more</span>` : ''}
        </div>
        <div class="lot-rate">${rateStr}</div>
        <button class="btn-book" ${avail === 'full' ? 'disabled' : ''}>
          ${avail === 'full' ? '<i class="fas fa-times-circle"></i> Currently Full' : '<i class="fas fa-calendar-check"></i> Book This Yard'}
        </button>
      </div>
    </div>`;
  }).join('');
}

// Auto-init on homepage
if (document.getElementById('lotsGrid')) loadLots();
