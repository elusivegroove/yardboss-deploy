/**
 * YardBoss — Webhook Notifications API
 * Lets staff register outbound webhook URLs that get pinged on key events
 * (new tenant, payment received, tenant move-out). Config + delivery log are
 * kept in-memory so this works in the DB-less sandbox too.
 */

const express = require('express');
const router = express.Router();

const EVENT_TYPES = [
  { id: 'tenant.created',  label: 'New Tenant',     description: 'Fires when a new tenant or walk-in is added.' },
  { id: 'payment.received', label: 'Payment Received', description: 'Fires when a payment is recorded for a tenant.' },
  { id: 'tenant.moveout',  label: 'Tenant Move-Out', description: 'Fires when a tenant moves out / is offboarded.' },
];
const EVENT_IDS = new Set(EVENT_TYPES.map(e => e.id));

let webhooks = [];
const deliveryLog = [];
const LOG_LIMIT = 20;

function genId() {
  return 'wh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function logDelivery(entry) {
  deliveryLog.unshift(entry);
  if (deliveryLog.length > LOG_LIMIT) deliveryLog.length = LOG_LIMIT;
}

async function deliver(webhook, event, data) {
  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const entry = {
    webhookId: webhook.id,
    webhookName: webhook.name,
    url: webhook.url,
    event,
    timestamp: payload.timestamp,
    status: null,
    ok: false,
    error: null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    entry.status = res.status;
    entry.ok = res.ok;
  } catch (err) {
    entry.error = err.name === 'AbortError' ? 'Request timed out' : err.message;
  } finally {
    clearTimeout(timeout);
  }

  logDelivery(entry);
  return entry;
}

// GET /api/webhooks/event-types
router.get('/event-types', (req, res) => {
  res.json(EVENT_TYPES);
});

// GET /api/webhooks/log
router.get('/log', (req, res) => {
  res.json(deliveryLog);
});

// GET /api/webhooks
router.get('/', (req, res) => {
  res.json(webhooks);
});

// POST /api/webhooks
router.post('/', (req, res) => {
  const { name, url, events, enabled } = req.body || {};

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'A valid http(s) URL is required' });
  }
  const filteredEvents = Array.isArray(events) ? events.filter(e => EVENT_IDS.has(e)) : [];

  const webhook = {
    id: genId(),
    name: name || url,
    url,
    events: filteredEvents,
    enabled: enabled !== false,
    createdAt: new Date().toISOString(),
  };
  webhooks.push(webhook);
  res.status(201).json(webhook);
});

// PATCH /api/webhooks/:id
router.patch('/:id', (req, res) => {
  const webhook = webhooks.find(w => w.id === req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  const { name, url, events, enabled } = req.body || {};
  if (name !== undefined) webhook.name = name;
  if (url !== undefined) {
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'A valid http(s) URL is required' });
    webhook.url = url;
  }
  if (events !== undefined) webhook.events = Array.isArray(events) ? events.filter(e => EVENT_IDS.has(e)) : [];
  if (enabled !== undefined) webhook.enabled = !!enabled;

  res.json(webhook);
});

// DELETE /api/webhooks/:id
router.delete('/:id', (req, res) => {
  webhooks = webhooks.filter(w => w.id !== req.params.id);
  res.json({ success: true });
});

// POST /api/webhooks/:id/test
router.post('/:id/test', async (req, res) => {
  const webhook = webhooks.find(w => w.id === req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  const entry = await deliver(webhook, 'webhook.test', {
    message: 'This is a test event from YardBoss.',
  });
  res.json(entry);
});

// POST /api/webhooks/dispatch
// Body: { event, data } — fires the event to all enabled webhooks subscribed to it
router.post('/dispatch', async (req, res) => {
  const { event, data } = req.body || {};
  if (!event || !EVENT_IDS.has(event)) {
    return res.status(400).json({ error: 'Unknown event type' });
  }

  const targets = webhooks.filter(w => w.enabled && w.events.includes(event));
  const results = await Promise.all(targets.map(w => deliver(w, event, data || {})));
  res.json({ dispatched: results.length, results });
});

module.exports = router;
