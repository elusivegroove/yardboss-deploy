const express = require('express');
const router = express.Router();
const poynt = require('../lib/poynt');

// GET /api/poynt/status — verify connection and return terminal list
router.get('/status', async (req, res) => {
  if (!poynt.isConfigured()) {
    return res.json({ configured: false, message: 'Poynt credentials not set in environment' });
  }
  try {
    const storesData = await poynt.getStores();
    const stores = storesData.stores || storesData.list || [];
    const terminals = [];
    for (const store of stores) {
      try {
        const termData = await poynt.getTerminals(store.id);
        const list = termData.terminals || termData.list || [];
        list.forEach(t => terminals.push({
          storeId:      store.id,
          storeName:    store.name || store.address?.line1 || store.id,
          terminalId:   t.id,
          terminalName: t.name || t.serialNumber || t.id,
          serialNumber: t.serialNumber || null,
          status:       t.status || 'UNKNOWN',
        }));
      } catch (_) {}
    }
    res.json({ configured: true, terminals });
  } catch (err) {
    console.error('[poynt/status]', err.message);
    res.status(502).json({ configured: true, error: err.message });
  }
});

// POST /api/poynt/charge — push a SALE to a terminal
router.post('/charge', async (req, res) => {
  if (!poynt.isConfigured()) {
    return res.status(400).json({ error: 'Poynt not configured' });
  }
  const { storeId, terminalId, amount, tenantId, tenantName, description } = req.body;
  if (!storeId || !terminalId || !amount) {
    return res.status(400).json({ error: 'storeId, terminalId, and amount are required' });
  }
  try {
    const amountCents = Math.round(parseFloat(amount) * 100);
    const referenceId = `YB-${(tenantId || 'manual').slice(0, 12)}-${Date.now()}`;
    await poynt.sendTerminalPayment({
      storeId,
      terminalId,
      amountCents,
      referenceId,
      notes: description || (tenantName ? `YardBoss — ${tenantName}` : 'YardBoss payment'),
    });
    res.json({ success: true, referenceId, amountCents });
  } catch (err) {
    console.error('[poynt/charge]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/poynt/poll/:referenceId — poll transaction status by reference ID
router.get('/poll/:referenceId', async (req, res) => {
  if (!poynt.isConfigured()) {
    return res.status(400).json({ error: 'Poynt not configured' });
  }
  try {
    const data = await poynt.getTransactionsByRef(req.params.referenceId);
    const txns = data.transactions || data.list || [];
    if (!txns.length) return res.json({ status: 'pending' });
    const t = txns[0];
    res.json({
      status: t.status || 'pending',
      transaction: {
        id:           t.id,
        status:       t.status,
        amount:       t.amounts?.transactionAmount,
        currency:     t.amounts?.currency || 'USD',
        cardType:     t.fundingSource?.card?.type || null,
        last4:        t.fundingSource?.card?.numberLast4 || null,
        approvalCode: t.processorResponse?.approvalCode || null,
        createdAt:    t.createdAt,
      },
    });
  } catch (err) {
    console.error('[poynt/poll]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
