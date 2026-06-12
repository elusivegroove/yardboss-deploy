/**
 * YardBoss — Dev Tracker API
 * Shared backlog for bugs/features/improvements — fed by both the admin
 * dashboard and beta-user submissions on the Dev tab.
 * Reads/writes PostgreSQL when DATABASE_URL is set, falls back to an
 * in-memory store otherwise.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { devItems: storeDevItems, genDevItemId } = require('./store');

function rowToItem(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    priority: row.priority,
    status: row.status,
    description: row.description,
    tags: row.tags || [],
    notes: row.notes,
    source: row.source || 'admin',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/dev-items
router.get('/', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      const r = await db.query('SELECT * FROM dev_items ORDER BY created_at DESC');
      return res.json(r.rows.map(rowToItem));
    }
    res.json(storeDevItems);
  } catch (err) {
    console.error('[dev-items] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dev-items
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'title is required' });

    const now = new Date().toISOString();
    const item = {
      id: b.id || genDevItemId(),
      title: b.title,
      type: b.type || 'feature',
      priority: b.priority || 'medium',
      status: b.status || 'pending',
      description: b.description || null,
      tags: b.tags || [],
      notes: b.notes || null,
      source: b.source || 'admin',
      createdAt: b.createdAt || now,
      updatedAt: b.updatedAt || now,
    };

    if (process.env.DATABASE_URL) {
      await db.query(
        `INSERT INTO dev_items (id, title, type, priority, status, description, tags, notes, source, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, type = $3, priority = $4, status = $5, description = $6,
           tags = $7, notes = $8, source = $9, updated_at = $11`,
        [item.id, item.title, item.type, item.priority, item.status, item.description,
         JSON.stringify(item.tags), item.notes, item.source, item.createdAt, item.updatedAt]
      );
    } else {
      storeDevItems.push(item);
    }

    res.status(201).json(item);
  } catch (err) {
    console.error('[dev-items] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/dev-items/:id
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body || {};
    updates.updatedAt = new Date().toISOString();

    if (process.env.DATABASE_URL) {
      const existing = await db.query('SELECT * FROM dev_items WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Item not found' });

      const merged = Object.assign(rowToItem(existing.rows[0]), updates);
      await db.query(
        `UPDATE dev_items SET title = $1, type = $2, priority = $3, status = $4,
           description = $5, tags = $6, notes = $7, updated_at = $8 WHERE id = $9`,
        [merged.title, merged.type, merged.priority, merged.status, merged.description,
         JSON.stringify(merged.tags || []), merged.notes, merged.updatedAt, req.params.id]
      );
      return res.json(merged);
    }

    const item = storeDevItems.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    Object.assign(item, updates);
    res.json(item);
  } catch (err) {
    console.error('[dev-items] PATCH /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dev-items/:id
router.delete('/:id', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      await db.query('DELETE FROM dev_items WHERE id = $1', [req.params.id]);
      return res.status(204).end();
    }

    const idx = storeDevItems.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });
    storeDevItems.splice(idx, 1);
    res.status(204).end();
  } catch (err) {
    console.error('[dev-items] DELETE /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
