const express = require('express');
const router = express.Router();
const { sendSMS } = require('../lib/sms');

// POST /api/sms/send — send a raw one-off SMS with no auto-prefix
// Body: { to, body }
router.post('/send', async (req, res) => {
  try {
    const { to, body } = req.body || {};
    if (!to)   return res.status(400).json({ error: 'to is required' });
    if (!body) return res.status(400).json({ error: 'body is required' });
    const result = await sendSMS(to, body);
    res.json(result);
  } catch (err) {
    console.error('[sms] POST /send error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
