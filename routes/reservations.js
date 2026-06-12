const express = require('express');
const router = express.Router();
const { lots, reservations, genResId } = require('./store');

// GET /api/reservations
router.get('/', (req, res) => {
  const { status, lotId } = req.query;
  let result = [...reservations];
  if (status) result = result.filter(r => r.status === status);
  if (lotId) result = result.filter(r => r.lotId === lotId);
  res.json(result);
});

// GET /api/reservations/:id
router.get('/:id', (req, res) => {
  const res_ = reservations.find(r => r.id === req.params.id);
  if (!res_) return res.status(404).json({ error: 'Reservation not found' });
  res.json(res_);
});

// POST /api/reservations — create new reservation (from portal or admin)
router.post('/', (req, res) => {
  const {
    lotId, spaceType, tenantName, email, phone, company,
    vehicleMake, vehicleModel, vehicleYear, vehiclePlate,
    startDate, endDate, monthlyRate, pricingPlan,
  } = req.body;

  if (!lotId || !tenantName || !email) {
    return res.status(400).json({ error: 'lotId, tenantName, and email are required' });
  }

  const lot = lots.find(l => l.id === lotId);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  // Auto-assign an available space number
  const takenSpaces = reservations
    .filter(r => r.lotId === lotId && (r.status === 'active' || r.status === 'pending'))
    .map(r => r.spaceNumber);

  const letters = 'ABCDEFGHIJ'.split('');
  let assignedSpace = null;
  let count = 0;
  outer: for (const letter of letters) {
    for (let n = 1; n <= Math.ceil(lot.totalSpaces / 5); n++) {
      if (count >= lot.totalSpaces) break outer;
      const spaceNum = `${letter}-${String(n).padStart(2, '0')}`;
      if (!takenSpaces.includes(spaceNum)) {
        assignedSpace = spaceNum;
        break outer;
      }
      count++;
    }
  }

  if (!assignedSpace) {
    return res.status(409).json({ error: 'No available spaces in this lot' });
  }

  const start = new Date(startDate || Date.now());
  let end;
  if (endDate) {
    end = new Date(endDate);
  } else {
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
  }

  const rate = monthlyRate || (lot.monthlyRates[spaceType] || 250);

  const newRes = {
    id: genResId(),
    lotId,
    spaceNumber: assignedSpace,
    spaceType: spaceType || 'Standard',
    tenantName,
    email,
    phone: phone || '',
    company: company || '',
    vehicleMake: vehicleMake || '',
    vehicleModel: vehicleModel || '',
    vehicleYear: vehicleYear || null,
    vehiclePlate: vehiclePlate || '',
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    monthlyRate: rate,
    pricingPlan: pricingPlan || null,
    status: 'pending',
    paymentStatus: 'unpaid',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date().toISOString(),
  };

  reservations.push(newRes);
  res.status(201).json(newRes);
});

// PATCH /api/reservations/:id — update status, payment status etc.
router.patch('/:id', (req, res) => {
  const idx = reservations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Reservation not found' });
  Object.assign(reservations[idx], req.body, { updatedAt: new Date().toISOString() });
  res.json(reservations[idx]);
});

// DELETE /api/reservations/:id
router.delete('/:id', (req, res) => {
  const idx = reservations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Reservation not found' });
  reservations.splice(idx, 1);
  res.json({ success: true });
});

module.exports = router;
