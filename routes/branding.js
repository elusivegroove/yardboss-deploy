/**
 * YardBoss — Branding API
 * Stores the white-label logo + primary color used across the admin
 * dashboard and client portal (Settings → Branding).
 * Reads/writes PostgreSQL when DATABASE_URL is set, falls back to an
 * in-memory store otherwise.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { branding: storeBranding } = require('./store');

function rowToBranding(row) {
  return {
    logoUrl: row.logo_url || null,
    primaryColor: row.primary_color || null,
  };
}

// GET /api/branding
router.get('/', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      const r = await db.query('SELECT * FROM branding WHERE id = 1');
      return res.json(r.rows.length ? rowToBranding(r.rows[0]) : { logoUrl: null, primaryColor: null });
    }
    res.json(storeBranding);
  } catch (err) {
    console.error('[branding] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/branding
router.patch('/', async (req, res) => {
  try {
    const { logoUrl, primaryColor } = req.body || {};

    if (process.env.DATABASE_URL) {
      const r = await db.query(
        `INSERT INTO branding (id, logo_url, primary_color)
         VALUES (1, $1, $2)
         ON CONFLICT (id) DO UPDATE SET
           logo_url = COALESCE($1, branding.logo_url),
           primary_color = COALESCE($2, branding.primary_color)
         RETURNING *`,
        [logoUrl || null, primaryColor || null]
      );
      return res.json(rowToBranding(r.rows[0]));
    }

    if (logoUrl !== undefined) storeBranding.logoUrl = logoUrl || null;
    if (primaryColor !== undefined) storeBranding.primaryColor = primaryColor || null;
    res.json(storeBranding);
  } catch (err) {
    console.error('[branding] PATCH / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
