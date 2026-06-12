// YardBoss Portal — Booking flow (book.html)

let allLots = [];
let selectedLot = null;
let selectedSpaceType = null;
let selectedRate = 0;

const state = {
  lotId: null, lotName: '', spaceType: null, rate: 0,
  planId: null, planLabel: '', unit: 'month', qty: 1,
  startDate: null, endDate: null,
  tenantName: '', company: '', email: '', phone: '',
  vehicleMake: '', vehicleModel: '', vehicleYear: '', vehiclePlate: '',
};

// ── Pricing plan helpers ─────────────────────────────────────────────────
// Maps a space type to a centralized pricing category ('Semi Truck' or 'RV').
// Mirrors the categorization used on the staff side (js/data.js).
function getPricingCategory(typeName) {
  if (!typeName) return null;
  const t = typeName.toLowerCase();
  if (t.indexOf('semi') !== -1 || t.indexOf('box truck') !== -1) return 'Semi Truck';
  if (t.indexOf('rv') !== -1 || t.indexOf('trailer') !== -1 || t.indexOf('wheel') !== -1 ||
      t.indexOf('class a') !== -1 || t.indexOf('class b') !== -1 || t.indexOf('class c') !== -1) return 'RV';
  return null;
}

function termLabel(unit, qty) {
  if (unit === 'day') return qty + (qty === 1 ? ' day' : ' days');
  if (unit === 'week') return qty + (qty === 1 ? ' week' : ' weeks');
  return qty + (qty === 1 ? ' month' : ' months');
}

function rateUnitSuffix(unit) {
  if (unit === 'day') return '/day';
  if (unit === 'week') return '/week';
  return '/month';
}

// Shows the actual lowest selectable price for a space type's pricing
// category (matching what the Pricing Plan dropdown will offer), falling
// back to the flat monthlyRate only when no plans exist for that category.
function displayRateLabel(type, monthlyRate) {
  const category = getPricingCategory(type);
  const plans = (category && selectedLot.pricingPlans && selectedLot.pricingPlans[category]) || [];
  if (plans.length) {
    const lowest = plans.reduce((min, p) => p.price < min.price ? p : min, plans[0]);
    return `From $${lowest.price.toFixed(2)}${rateUnitSuffix(lowest.unit)}`;
  }
  return `$${monthlyRate}/mo`;
}

// Populates the Pricing Plan dropdown from the lot's centralized pricing
// plans (set in Settings → Pricing Plans), plus a "Custom Amount" fallback
// so there is always a way to enter a price manually.
function populatePricingPlans(spaceType) {
  const category = getPricingCategory(spaceType);
  const plans = (category && selectedLot.pricingPlans && selectedLot.pricingPlans[category]) || [];
  const sel = document.getElementById('pricingPlanSelect');
  let html = '';
  plans.forEach(plan => {
    html += `<option value="${plan.id}">${plan.label} — $${plan.price.toFixed(2)}${rateUnitSuffix(plan.unit)}</option>`;
  });
  html += '<option value="custom">Custom Amount...</option>';
  sel.innerHTML = html;
  document.getElementById('pricingPlanSection').style.display = 'block';

  if (plans.length) {
    sel.value = plans[0].id;
  } else {
    sel.value = 'custom';
    document.getElementById('customAmount').value = (selectedLot.monthlyRates && selectedLot.monthlyRates[spaceType]) || '';
  }
  sel.dispatchEvent(new Event('change'));
}

// ── Init ─────────────────────────────────────────────────────────────────
(async function init() {
  // Load lots into select
  const lotSelect = document.getElementById('lotSelect');
  try {
    const res = await fetch('/api/portal/lots');
    allLots = await res.json();
    allLots.forEach(lot => {
      const opt = document.createElement('option');
      opt.value = lot.id;
      opt.textContent = `${lot.name} — ${lot.city}, ${lot.state}`;
      if (lot.vacantSpaces === 0) opt.textContent += ' (Full)';
      lotSelect.appendChild(opt);
    });
  } catch(e) {
    console.error('Could not load lots:', e);
  }

  // Pre-select lot from URL param
  const params = new URLSearchParams(window.location.search);
  const lotId = params.get('lot');
  if (lotId) {
    lotSelect.value = lotId;
    lotSelect.dispatchEvent(new Event('change'));
  }

  // Set min date for start date
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  document.getElementById('startDate').min = minDate;
  document.getElementById('startDate').value = minDate;
  updateEndDate(minDate);
})();

// ── Lot select change ─────────────────────────────────────────────────────
document.getElementById('lotSelect').addEventListener('change', function() {
  const lotId = this.value;
  selectedLot = allLots.find(l => l.id === lotId) || null;

  if (!selectedLot) {
    document.getElementById('lotInfo').classList.add('hidden');
    document.getElementById('spaceTypeSection').style.display = 'none';
    document.getElementById('dateSection').style.display = 'none';
    document.getElementById('nextStep1').style.display = 'none';
    return;
  }

  // Show lot info
  const info = document.getElementById('lotInfo');
  info.classList.remove('hidden');
  document.getElementById('lotInfoContent').innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
      <i class="fas fa-map-marker-alt" style="color:var(--teal);"></i>
      <strong>${selectedLot.name}</strong>
    </div>
    <div style="margin-bottom:4px;">${selectedLot.address}</div>
    <div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:8px;">
      <span><i class="fas fa-parking" style="color:var(--teal); margin-right:4px;"></i><strong>${selectedLot.vacantSpaces}</strong> spaces available</span>
      ${selectedLot.amenities.slice(0,3).map(a=>`<span><i class="fas fa-check" style="color:var(--teal); margin-right:4px;"></i>${a}</span>`).join('')}
    </div>
  `;

  // Render space types
  const typeGrid = document.getElementById('spaceTypeGrid');
  const icons = { 'Standard Semi': '🚛', 'Oversized': '🚚', 'Tandem': '🚛🚛', 'Class A / Super C': '🚌', 'Class B / C': '🚐', 'Travel Trailer': '🏕️', 'Fifth Wheel': '⛺', 'Container Slot': '📦', 'Reefer': '❄️' };
  typeGrid.innerHTML = Object.entries(selectedLot.monthlyRates).map(([type, rate]) => `
    <div class="space-type-option" onclick="selectSpaceType('${type}', ${rate})" id="type_${type.replace(/[^a-z]/gi,'_')}">
      <div class="type-icon">${icons[type] || '🅿️'}</div>
      <div class="type-name">${type}</div>
      <div class="type-rate">${displayRateLabel(type, rate)}</div>
    </div>
  `).join('');

  document.getElementById('spaceTypeSection').style.display = 'block';
  document.getElementById('dateSection').style.display = 'block';

  // Update summary
  state.lotId = selectedLot.id;
  state.lotName = selectedLot.name;
  document.getElementById('sumLot').textContent = selectedLot.name;

  const imgEl = document.getElementById('summaryImg');
  imgEl.innerHTML = `<img src="${selectedLot.image}" alt="${selectedLot.name}" onerror="this.style.display='none'">`;

  updateSummary();
});

function selectSpaceType(type, rate) {
  selectedSpaceType = type;
  selectedRate = rate;
  state.spaceType = type;
  state.rate = rate;

  // Update selected state
  document.querySelectorAll('.space-type-option').forEach(el => el.classList.remove('selected'));
  const key = type.replace(/[^a-z]/gi, '_');
  const el = document.getElementById(`type_${key}`);
  if (el) el.classList.add('selected');

  populatePricingPlans(type);

  document.getElementById('nextStep1').style.display = 'block';
  updateSummary();
}

// ── Pricing plan select change ───────────────────────────────────────────
document.getElementById('pricingPlanSelect').addEventListener('change', function() {
  const planId = this.value;
  const customRow = document.getElementById('customAmountRow');

  if (planId === 'custom') {
    customRow.classList.remove('hidden');
    state.planId = 'custom';
    state.planLabel = 'Custom';
    state.unit = 'month';
    state.qty = 1;
    state.rate = parseFloat(document.getElementById('customAmount').value) || 0;
  } else {
    customRow.classList.add('hidden');
    const category = getPricingCategory(state.spaceType);
    const plans = (category && selectedLot.pricingPlans && selectedLot.pricingPlans[category]) || [];
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      state.planId = plan.id;
      state.planLabel = plan.label;
      state.unit = plan.unit;
      state.qty = plan.qty;
      state.rate = plan.price;
    }
  }

  updateEndDate(document.getElementById('startDate').value);
  updateSummary();
});

document.getElementById('customAmount').addEventListener('input', function() {
  state.rate = parseFloat(this.value) || 0;
  updateSummary();
});

// ── Date handling ─────────────────────────────────────────────────────────
document.getElementById('startDate').addEventListener('change', function() {
  updateEndDate(this.value);
  state.startDate = this.value;
  updateSummary();
});

function updateEndDate(startStr) {
  if (!startStr) return;
  const end = new Date(startStr);
  const unit = state.unit || 'month';
  const qty = state.qty || 1;
  if (unit === 'day') end.setDate(end.getDate() + qty);
  else if (unit === 'week') end.setDate(end.getDate() + (qty * 7));
  else end.setMonth(end.getMonth() + qty);
  end.setDate(end.getDate() - 1);
  document.getElementById('endDate').value = end.toISOString().split('T')[0];
  state.endDate = end.toISOString().split('T')[0];

  const hint = document.getElementById('termHint');
  if (hint) {
    hint.textContent = state.planId
      ? `Lease term: ${termLabel(unit, qty)}`
      : 'Select a pricing plan above to set the term';
  }
}

// ── Summary update ────────────────────────────────────────────────────────
function updateSummary() {
  document.getElementById('sumType').textContent = state.spaceType || '—';
  document.getElementById('sumRate').textContent = state.rate ? `$${state.rate.toFixed(2)}${rateUnitSuffix(state.unit)}` : '—';
  document.getElementById('sumDue').textContent = state.rate ? `$${state.rate.toFixed(2)}` : '—';
  document.getElementById('sumTerm').textContent = state.planId ? termLabel(state.unit || 'month', state.qty || 1) : '—';
  if (state.startDate) {
    document.getElementById('sumStart').textContent = new Date(state.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// ── Step navigation ───────────────────────────────────────────────────────
function goToStep(stepNum) {
  // Validate current step before moving forward
  const currentStep = getCurrentStep();
  if (stepNum > currentStep && !validateStep(currentStep)) return;

  // Hide all step contents
  document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`step${stepNum}`).classList.remove('hidden');

  // Update step circles
  document.querySelectorAll('.step').forEach(el => {
    const n = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (n < stepNum) el.classList.add('done');
    else if (n === stepNum) el.classList.add('active');
    if (n < stepNum) el.querySelector('.step-circle').innerHTML = '<i class="fas fa-check" style="font-size:0.7rem;"></i>';
    else el.querySelector('.step-circle').textContent = n;
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getCurrentStep() {
  for (let i = 1; i <= 4; i++) {
    if (!document.getElementById(`step${i}`).classList.contains('hidden')) return i;
  }
  return 1;
}

function validateStep(step) {
  if (step === 1) {
    if (!state.lotId) { showToast('Please select a yard location.', 'error'); return false; }
    if (!state.spaceType) { showToast('Please select a space type.', 'error'); return false; }
    if (!state.planId) { showToast('Please select a pricing plan.', 'error'); return false; }
    if (state.planId === 'custom' && !(state.rate > 0)) { showToast('Please enter a custom amount.', 'error'); return false; }
    if (!document.getElementById('startDate').value) { showToast('Please select a start date.', 'error'); return false; }
    return true;
  }
  if (step === 2) {
    const name = document.getElementById('tenantName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    if (!name) { showToast('Please enter your full name.', 'error'); return false; }
    if (!email || !email.includes('@')) { showToast('Please enter a valid email address.', 'error'); return false; }
    if (!phone) { showToast('Please enter your phone number.', 'error'); return false; }
    state.tenantName = name;
    state.email = email;
    state.phone = phone;
    state.company = document.getElementById('company').value.trim();
    return true;
  }
  if (step === 3) {
    const make = document.getElementById('vehicleMake').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const plate = document.getElementById('vehiclePlate').value.trim();
    if (!make) { showToast('Please enter vehicle make.', 'error'); return false; }
    if (!model) { showToast('Please enter vehicle model.', 'error'); return false; }
    if (!plate) { showToast('Please enter license plate.', 'error'); return false; }
    state.vehicleMake = make;
    state.vehicleModel = model;
    state.vehicleYear = document.getElementById('vehicleYear').value;
    state.vehiclePlate = plate;
    return true;
  }
  return true;
}

// ── Proceed to payment ────────────────────────────────────────────────────
async function proceedToPayment() {
  if (!validateStep(3)) return;

  // Gather final state
  state.vehicleMake = document.getElementById('vehicleMake').value.trim();
  state.vehicleModel = document.getElementById('vehicleModel').value.trim();
  state.vehicleYear = document.getElementById('vehicleYear').value;
  state.vehiclePlate = document.getElementById('vehiclePlate').value.trim();
  state.startDate = document.getElementById('startDate').value;

  // Show review summary
  document.getElementById('reviewSummary').innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; font-size:0.85rem;">
      <div><span style="color:var(--gray-500);">Location:</span> <strong>${state.lotName}</strong></div>
      <div><span style="color:var(--gray-500);">Space Type:</span> <strong>${state.spaceType}</strong></div>
      <div><span style="color:var(--gray-500);">Tenant:</span> <strong>${state.tenantName}</strong></div>
      <div><span style="color:var(--gray-500);">Email:</span> <strong>${state.email}</strong></div>
      <div><span style="color:var(--gray-500);">Vehicle:</span> <strong>${state.vehicleYear} ${state.vehicleMake} ${state.vehicleModel}</strong></div>
      <div><span style="color:var(--gray-500);">Plate:</span> <strong>${state.vehiclePlate}</strong></div>
      <div><span style="color:var(--gray-500);">Start Date:</span> <strong>${formatDate(state.startDate)}</strong></div>
      <div><span style="color:var(--gray-500);">Plan:</span> <strong>${state.planLabel} (${termLabel(state.unit, state.qty)})</strong></div>
      <div><span style="color:var(--gray-500);">Rate:</span> <strong style="color:var(--teal);">$${state.rate.toFixed(2)}${rateUnitSuffix(state.unit)}</strong></div>
    </div>
  `;

  // Check if sandbox/mock mode
  try {
    const envRes = await fetch('/api/env');
    const env = await envRes.json();
    if (!env.stripeConnected || env.mockPayments) {
      document.getElementById('mockNotice').style.display = 'flex';
      document.getElementById('payBtnText').textContent = `Pay $${state.rate.toFixed(2)} (Mock)`;
    } else {
      document.getElementById('mockNotice').style.display = 'none';
      document.getElementById('payBtnText').textContent = `Pay $${state.rate.toFixed(2)} Securely`;
      // Initialize Stripe Elements here if real keys present
      // initStripeElements(env.stripePublishableKey);
    }
  } catch(e) {
    document.getElementById('payBtnText').textContent = `Pay $${state.rate.toFixed(2)}`;
  }

  goToStep(4);
}

// ── Submit payment ────────────────────────────────────────────────────────
async function submitPayment() {
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing...';

  try {
    // 1. Create reservation
    const resBody = {
      lotId: state.lotId,
      spaceType: state.spaceType,
      tenantName: state.tenantName,
      email: state.email,
      phone: state.phone,
      company: state.company,
      vehicleMake: state.vehicleMake,
      vehicleModel: state.vehicleModel,
      vehicleYear: state.vehicleYear,
      vehiclePlate: state.vehiclePlate,
      startDate: state.startDate,
      endDate: state.endDate,
      monthlyRate: state.rate,
      pricingPlan: state.planLabel,
    };
    const resRes = await fetch('/api/reservations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resBody)
    });
    const reservation = await resRes.json();
    if (!resRes.ok) throw new Error(reservation.error || 'Could not create reservation');

    // 2. Create payment intent
    const piRes = await fetch('/api/payments/create-intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: reservation.id, amount: state.rate })
    });
    const pi = await piRes.json();
    if (!piRes.ok) throw new Error(pi.error || 'Payment setup failed');

    // 3. Confirm payment (mock or real)
    const confirmRes = await fetch('/api/payments/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: reservation.id, paymentIntentId: pi.paymentIntentId })
    });
    const confirmed = await confirmRes.json();
    if (!confirmRes.ok) throw new Error(confirmed.error || 'Payment confirmation failed');

    // 4. Save to sessionStorage and redirect to confirm page
    sessionStorage.setItem('yb_confirm', JSON.stringify({
      ...confirmed.reservation,
      lotName: state.lotName,
    }));
    window.location.href = 'confirm.html';

  } catch(e) {
    showToast(`Error: ${e.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> <span id="payBtnText">Pay $${state.rate.toFixed(2)}</span>`;
  }
}

// ── Card formatting helpers ───────────────────────────────────────────────
function formatCard(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = v.slice(0,2) + ' / ' + v.slice(2);
  input.value = v;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
