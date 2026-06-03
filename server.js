/**
 * YardBoss — Main Express Server
 * Serves admin dashboard (static), client portal (static), and REST API
 *
 * Environments:
 *   sandbox:    YARDBOSS_ENV=sandbox    → .env.sandbox    → port 4001
 *   production: YARDBOSS_ENV=production → .env.production → port 4000
 */

const envName = process.env.YARDBOSS_ENV || 'sandbox';
require('dotenv').config({ path: `.env.${envName}` });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || (envName === 'production' ? 4000 : 4001);
const ENV = process.env.YARDBOSS_ENV || 'sandbox';
const IS_SANDBOX = ENV === 'sandbox';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());

// Stripe webhooks need raw body — MUST be before bodyParser.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inject environment into every response header (useful for debugging)
app.use((req, res, next) => {
  res.setHeader('X-YardBoss-Env', ENV);
  next();
});

// ─── Static Files ─────────────────────────────────────────────────────────────
// Admin dashboard — served from root
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  // Don't serve server.js, node_modules, .env files
  dotfiles: 'deny',
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
const paymentsRouter = require('./routes/payments');
const reservationsRouter = require('./routes/reservations');
const portalRouter = require('./routes/portal');
const lotsRouter = require('./routes/lots');
const tenantsRouter = require('./routes/tenants');
const scanInsuranceRouter = require('./routes/scan-insurance');
const sendReceiptRouter = require('./routes/send-receipt');

app.use('/api/payments', paymentsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/portal', portalRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/scan-insurance', scanInsuranceRouter);
app.use('/api/send-receipt', sendReceiptRouter);
// Required env vars: ANTHROPIC_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE

// ─── Environment info endpoint ────────────────────────────────────────────────
app.get('/api/env', (req, res) => {
  res.json({
    environment: ENV,
    isSandbox: IS_SANDBOX,
    mockPayments: process.env.MOCK_PAYMENTS === 'true',
    stripeConnected: !!(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('YOUR_')),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: ENV, uptime: process.uptime() });
});

// ─── SPA fallback for portal ──────────────────────────────────────────────────
app.get('/portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'portal', 'index.html'));
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${ENV.toUpperCase()}] Error:`, err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    env: ENV,
  });
});

// ─── DB Migrations (runs on every startup, idempotent) ────────────────────────
if (process.env.DATABASE_URL) {
  require('./scripts/migrate').runMigrations().catch(console.error);
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const banner = IS_SANDBOX
    ? '\x1b[33m  ⚠  SANDBOX ENVIRONMENT\x1b[0m'
    : '\x1b[32m  ✓  PRODUCTION ENVIRONMENT\x1b[0m';

  console.log('\n\x1b[1m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m║        🚛  YardBoss  v1.0.0          ║\x1b[0m');
  console.log('\x1b[1m╚══════════════════════════════════════╝\x1b[0m');
  console.log(banner);
  console.log(`\n  Admin Dashboard → \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`  Client Portal   → \x1b[36mhttp://localhost:${PORT}/portal\x1b[0m`);
  console.log(`  API Health      → \x1b[36mhttp://localhost:${PORT}/api/health\x1b[0m`);
  console.log(`  Payments        → ${process.env.MOCK_PAYMENTS === 'true' ? '\x1b[33mMocked (no Stripe keys)\x1b[0m' : '\x1b[32mLive Stripe\x1b[0m'}`);
  console.log('\n  Press Ctrl+C to stop\n');
});

module.exports = app;
