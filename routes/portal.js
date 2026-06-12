const express = require('express');
const router = express.Router();
const { lots, reservations } = require('./store');

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
router.get('/reservation/:id', (req, res) => {
  const r = reservations.find(res => res.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Reservation not found' });
  const lot = lots.find(l => l.id === r.lotId);
  res.json({ ...r, lotName: lot?.name || '', lotAddress: lot ? `${lot.address}, ${lot.city}, ${lot.state}` : '' });
});

// GET /api/portal/lookup?email=x — tenant looks up reservations by email
router.get('/lookup', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });
  const results = reservations
    .filter(r => r.email.toLowerCase() === email.toLowerCase())
    .map(r => {
      const lot = lots.find(l => l.id === r.lotId);
      return { ...r, lotName: lot?.name || '', lotCity: lot?.city || '' };
    });
  res.json(results);
});

module.exports = router;
