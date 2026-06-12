/**
 * YardBoss — Lots API Router
 * Reads from PostgreSQL when DATABASE_URL is set, falls back to store.js otherwise.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { lots: storeLots, reservations } = require('./store');

// ── Row mapper ────────────────────────────────────────────────────────────────
function rowToLot(row) {
  return {
    id:           row.id,
    name:         row.name,
    address:      row.address,
    city:         row.city,
    state:        row.state,
    zip:          row.zip,
    totalSpaces:  row.total_spaces,
    status:       row.status,
    amenities:    row.amenities   || [],
    spaceTypes:   row.space_types || [],
    monthlyRates: row.monthly_rates || {},
    pricingPlans: row.pricing_plans || {},
    image:        row.image || null,
  };
}

async function getLotsFromDB() {
  const result = await db.query('SELECT * FROM lots ORDER BY id ASC');
  return result.rows.map(rowToLot);
}

// Number of spaces a tenant occupies: their primary space plus any additional ones.
function spacesPerTenant(spaceNumber, additionalSpaces) {
  return (spaceNumber ? 1 : 0) + (Array.isArray(additionalSpaces) ? additionalSpaces.length : 0);
}

// GET /api/lots — all lots with occupancy stats
router.get('/', async (req, res) => {
  try {
    const lots = process.env.DATABASE_URL ? await getLotsFromDB() : storeLots;

    // Compute occupancy from tenants table if DB available, else use in-memory reservations
    let occupancyMap = {};
    if (process.env.DATABASE_URL) {
      const tenantRes = await db.query(
        "SELECT lot_id, status, space_number, additional_spaces FROM tenants"
      );
      tenantRes.rows.forEach(function(row) {
        if (!occupancyMap[row.lot_id]) occupancyMap[row.lot_id] = { occupied: 0, reserved: 0 };
        const spaceCount = spacesPerTenant(row.space_number, row.additional_spaces);
        if (row.status === 'active')  occupancyMap[row.lot_id].occupied += spaceCount;
        if (row.status === 'pending') occupancyMap[row.lot_id].reserved += spaceCount;
      });
    } else {
      reservations.forEach(function(r) {
        if (!occupancyMap[r.lotId]) occupancyMap[r.lotId] = { occupied: 0, reserved: 0 };
        const spaceCount = spacesPerTenant(r.spaceNumber, r.additionalSpaces);
        if (r.status === 'active')  occupancyMap[r.lotId].occupied += spaceCount;
        if (r.status === 'pending') occupancyMap[r.lotId].reserved += spaceCount;
      });
    }

    const result = lots.map(function(lot) {
      const occ = occupancyMap[lot.id] || { occupied: 0, reserved: 0 };
      const vacant = Math.max(0, lot.totalSpaces - occ.occupied - occ.reserved);
      return Object.assign({}, lot, {
        occupiedSpaces: occ.occupied,
        reservedSpaces: occ.reserved,
        vacantSpaces: vacant,
        occupancyRate: Math.round((occ.occupied / lot.totalSpaces) * 100),
      });
    });
    res.json(result);
  } catch (err) {
    console.error('[lots] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lots/:id
router.get('/:id', async (req, res) => {
  try {
    let lot;
    if (process.env.DATABASE_URL) {
      const r = await db.query('SELECT * FROM lots WHERE id = $1', [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Lot not found' });
      lot = rowToLot(r.rows[0]);
    } else {
      lot = storeLots.find(function(l){ return l.id === req.params.id; });
      if (!lot) return res.status(404).json({ error: 'Lot not found' });
    }

    let occupied = 0, reserved = 0;
    if (process.env.DATABASE_URL) {
      const tr = await db.query(
        "SELECT status, space_number, additional_spaces FROM tenants WHERE lot_id = $1", [req.params.id]
      );
      tr.rows.forEach(function(row) {
        const spaceCount = spacesPerTenant(row.space_number, row.additional_spaces);
        if (row.status === 'active')  occupied += spaceCount;
        if (row.status === 'pending') reserved += spaceCount;
      });
    } else {
      reservations.filter(function(r){ return r.lotId === lot.id; }).forEach(function(r) {
        const spaceCount = spacesPerTenant(r.spaceNumber, r.additionalSpaces);
        if (r.status === 'active')  occupied += spaceCount;
        if (r.status === 'pending') reserved += spaceCount;
      });
    }

    res.json(Object.assign({}, lot, {
      occupiedSpaces: occupied,
      reservedSpaces: reserved,
      vacantSpaces: Math.max(0, lot.totalSpaces - occupied - reserved),
      occupancyRate: Math.round((occupied / lot.totalSpaces) * 100),
    }));
  } catch (err) {
    console.error('[lots] GET /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lots/:id/availability — available spaces for portal booking
router.get('/:id/availability', async (req, res) => {
  try {
    let lot;
    if (process.env.DATABASE_URL) {
      const r = await db.query('SELECT * FROM lots WHERE id = $1', [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Lot not found' });
      lot = rowToLot(r.rows[0]);
    } else {
      lot = storeLots.find(function(l){ return l.id === req.params.id; });
      if (!lot) return res.status(404).json({ error: 'Lot not found' });
    }

    let takenSpaces = [];
    if (process.env.DATABASE_URL) {
      const tr = await db.query(
        "SELECT space_number, additional_spaces FROM tenants WHERE lot_id = $1 AND status IN ('active','pending')",
        [req.params.id]
      );
      tr.rows.forEach(function(r) {
        if (r.space_number) takenSpaces.push(r.space_number);
        (r.additional_spaces || []).forEach(function(sp){ takenSpaces.push(sp); });
      });
    } else {
      reservations
        .filter(function(r){ return r.lotId === req.params.id && (r.status === 'active' || r.status === 'pending'); })
        .forEach(function(r) {
          if (r.spaceNumber) takenSpaces.push(r.spaceNumber);
          (r.additionalSpaces || []).forEach(function(sp){ takenSpaces.push(sp); });
        });
    }

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
      availableCount: spaces.filter(function(s){ return s.status === 'available'; }).length,
      spaces,
      spaceTypes: lot.spaceTypes,
      monthlyRates: lot.monthlyRates,
      pricingPlans: lot.pricingPlans || {},
    });
  } catch (err) {
    console.error('[lots] GET /:id/availability error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/lots/:id/pricing — update centralized pricing plans (Settings → Pricing Plans)
router.patch('/:id/pricing', async (req, res) => {
  try {
    const { pricingPlans } = req.body;
    if (!pricingPlans || typeof pricingPlans !== 'object') {
      return res.status(400).json({ error: 'pricingPlans object is required' });
    }

    if (process.env.DATABASE_URL) {
      const r = await db.query(
        'UPDATE lots SET pricing_plans = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(pricingPlans), req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Lot not found' });
      return res.json(rowToLot(r.rows[0]));
    } else {
      const lot = storeLots.find(function(l){ return l.id === req.params.id; });
      if (!lot) return res.status(404).json({ error: 'Lot not found' });
      lot.pricingPlans = pricingPlans;
      return res.json(lot);
    }
  } catch (err) {
    console.error('[lots] PATCH /:id/pricing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
