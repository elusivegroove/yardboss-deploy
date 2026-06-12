const express = require('express');
const router = express.Router();
const db = require('../db');
const { lots, reservations } = require('./store');

// Maps a tenants-table row (+ its lot) to the reservation-shaped object the
// client portal (lookup/detail pages) expects.
function tenantRowToReservation(row, lot) {
  const vehicle = row.vehicle || {};
  const spaceNumbers = [row.space_number].concat(row.additional_spaces || []).filter(Boolean);
  return {
    id: row.id,
    lotId: row.lot_id,
    lotName: lot ? lot.name : '',
    lotCity: lot ? lot.city : '',
    lotAddress: lot ? `${lot.address}, ${lot.city}, ${lot.state}` : '',
    spaceNumber: row.space_number,
    spaceNumbers: spaceNumbers,
    spaceType: vehicle.type || '',
    tenantName: row.name,
    email: row.email,
    monthlyRate: row.monthly_rate != null ? parseFloat(row.monthly_rate) : 0,
    startDate: row.start_date ? row.start_date.toISOString().split('T')[0] : null,
    endDate: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
    status: row.status,
    registrationStatus: row.registration_status,
    vehicleMake: vehicle.make || '',
    vehicleModel: vehicle.model || '',
    vehicleYear: vehicle.year || null,
    vehiclePlate: vehicle.plate || '',
  };
}

// Lowest advertised rate for a lot, normalized to a monthly-equivalent price.
// Considers both the legacy per-space-type monthlyRates and the centralized
// Pricing Plans (Settings → Pricing Plans), since plans can undercut the
// monthlyRates (e.g. a $30/day or $100/1-month plan vs a $350/mo flat rate).
function lowestMonthlyRate(lot) {
  const rates = Object.values(lot.monthlyRates || {}).slice();
  Object.values(lot.pricingPlans || {}).forEach(plans => {
    (plans || []).forEach(p => {
      const qty = p.qty || 1;
      let monthly;
      if (p.unit === 'day') monthly = (p.price * 30) / qty;
      else if (p.unit === 'week') monthly = (p.price * 30) / (7 * qty);
      else monthly = p.price / qty;
      rates.push(monthly);
    });
  });
  return rates.length ? Math.round(Math.min(...rates)) : 0;
}

// GET /api/portal/lots — public lot listing for client portal
router.get('/lots', (req, res) => {
  const publicLots = lots
    .filter(l => l.status === 'active')
    .map(l => {
      const occupied = reservations.filter(r => r.lotId === l.id && r.status === 'active').length;
      const reserved = reservations.filter(r => r.lotId === l.id && r.status === 'pending').length;
      const vacant = Math.max(0, l.totalSpaces - occupied - reserved);
      return {
        id: l.id,
        name: l.name,
        address: `${l.address}, ${l.city}, ${l.state} ${l.zip}`,
        city: l.city,
        state: l.state,
        totalSpaces: l.totalSpaces,
        vacantSpaces: vacant,
        available: vacant > 0,
        amenities: l.amenities,
        spaceTypes: l.spaceTypes,
        monthlyRates: l.monthlyRates,
        pricingPlans: l.pricingPlans || {},
        image: l.image,
        lowestRate: lowestMonthlyRate(l),
      };
    });
  res.json(publicLots);
});

// GET /api/portal/lots/:id — single lot for booking page
router.get('/lots/:id', (req, res) => {
  const lot = lots.find(l => l.id === req.params.id);
  if (!lot || lot.status !== 'active') return res.status(404).json({ error: 'Lot not found' });

  const occupied = reservations.filter(r => r.lotId === lot.id && r.status === 'active').length;
  const reserved = reservations.filter(r => r.lotId === lot.id && r.status === 'pending').length;
  const vacant = Math.max(0, lot.totalSpaces - occupied - reserved);

  res.json({
    id: lot.id,
    name: lot.name,
    address: `${lot.address}, ${lot.city}, ${lot.state} ${lot.zip}`,
    totalSpaces: lot.totalSpaces,
    vacantSpaces: vacant,
    available: vacant > 0,
    amenities: lot.amenities,
    spaceTypes: lot.spaceTypes,
    monthlyRates: lot.monthlyRates,
    pricingPlans: lot.pricingPlans || {},
    image: lot.image,
  });
});

// GET /api/portal/reservation/:id — tenant looks up their reservation
router.get('/reservation/:id', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      const tr = await db.query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
      if (tr.rows.length) {
        const lr = await db.query('SELECT * FROM lots WHERE id = $1', [tr.rows[0].lot_id]);
        return res.json(tenantRowToReservation(tr.rows[0], lr.rows[0]));
      }
    }
    const r = reservations.find(res => res.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Reservation not found' });
    const lot = lots.find(l => l.id === r.lotId);
    res.json({ ...r, lotName: lot?.name || '', lotAddress: lot ? `${lot.address}, ${lot.city}, ${lot.state}` : '' });
  } catch (err) {
    console.error('[portal] GET /reservation/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portal/lookup?email=x — tenant looks up reservations by email
router.get('/lookup', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email required' });

    if (process.env.DATABASE_URL) {
      const tr = await db.query('SELECT * FROM tenants WHERE LOWER(email) = LOWER($1)', [email]);
      const lr = await db.query('SELECT * FROM lots');
      const lotMap = {};
      lr.rows.forEach(l => { lotMap[l.id] = l; });
      return res.json(tr.rows.map(row => tenantRowToReservation(row, lotMap[row.lot_id])));
    }

    const results = reservations
      .filter(r => r.email.toLowerCase() === email.toLowerCase())
      .map(r => {
        const lot = lots.find(l => l.id === r.lotId);
        return { ...r, lotName: lot?.name || '', lotCity: lot?.city || '' };
      });
    res.json(results);
  } catch (err) {
    console.error('[portal] GET /lookup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
