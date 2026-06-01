const express = require('express');
const router = express.Router();
const { lots, reservations } = require('./store');

// GET /api/lots — all lots with occupancy stats
router.get('/', (req, res) => {
  const result = lots.map(lot => {
    const occupied = reservations.filter(r => r.lotId === lot.id && r.status === 'active').length;
    const reserved = reservations.filter(r => r.lotId === lot.id && r.status === 'pending').length;
    const vacant = lot.totalSpaces - occupied - reserved;
    return {
      ...lot,
      occupiedSpaces: occupied,
      reservedSpaces: reserved,
      vacantSpaces: Math.max(0, vacant),
      occupancyRate: Math.round((occupied / lot.totalSpaces) * 100),
    };
  });
  res.json(result);
});

// GET /api/lots/:id
router.get('/:id', (req, res) => {
  const lot = lots.find(l => l.id === req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  const occupied = reservations.filter(r => r.lotId === lot.id && r.status === 'active').length;
  const reserved = reservations.filter(r => r.lotId === lot.id && r.status === 'pending').length;

  res.json({
    ...lot,
    occupiedSpaces: occupied,
    reservedSpaces: reserved,
    vacantSpaces: Math.max(0, lot.totalSpaces - occupied - reserved),
    occupancyRate: Math.round((occupied / lot.totalSpaces) * 100),
  });
});

// GET /api/lots/:id/availability — available spaces for portal booking
router.get('/:id/availability', (req, res) => {
  const lot = lots.find(l => l.id === req.params.id);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  const takenSpaces = reservations
    .filter(r => r.lotId === req.params.id && (r.status === 'active' || r.status === 'pending'))
    .map(r => r.spaceNumber);

  // Generate all space numbers for this lot
  const spaces = [];
  const letters = 'ABCDEFGHIJ'.split('');
  let count = 0;
  for (const letter of letters) {
    for (let n = 1; n <= Math.ceil(lot.totalSpaces / 5); n++) {
      if (count >= lot.totalSpaces) break;
      const spaceNum = `${letter}-${String(n).padStart(2, '0')}`;
      spaces.push({
        number: spaceNum,
        status: takenSpaces.includes(spaceNum) ? 'taken' : 'available',
      });
      count++;
    }
    if (count >= lot.totalSpaces) break;
  }

  res.json({
    lotId: lot.id,
    lotName: lot.name,
    totalSpaces: lot.totalSpaces,
    availableCount: spaces.filter(s => s.status === 'available').length,
    spaces,
    spaceTypes: lot.spaceTypes,
    monthlyRates: lot.monthlyRates,
  });
});

module.exports = router;
