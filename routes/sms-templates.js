/**
 * YardBoss — SMS Templates API
 * GET  /api/sms-templates        — fetch all templates
 * PUT  /api/sms-templates        — save customized template bodies
 * POST /api/sms-templates/send   — send a filled template to a specific number
 */

const express = require('express');
const router = express.Router();
const { getTemplates, setTemplates, fillTemplate } = require('../lib/sms-templates');
const { sendSMS } = require('../lib/sms');

router.get('/', async (req, res) => {
  try {
    res.json(await getTemplates());
  } catch (err) {
    console.error('[sms-templates] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object of templates' });
    }
    await setTemplates(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sms-templates] PUT / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sms-templates/send
// Body: { key, to, vars: { name, space, amount, ... } }
router.post('/send', async (req, res) => {
  try {
    const { key, to, vars } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key is required' });
    if (!to)  return res.status(400).json({ error: 'to (phone number) is required' });

    const templates = await getTemplates();
    const tpl = templates[key];
    if (!tpl) return res.status(404).json({ error: `Unknown template: ${key}` });

    const body = fillTemplate(tpl.body, vars || {});
    const result = await sendSMS(to, body);
    res.json({ ...result, body });
  } catch (err) {
    console.error('[sms-templates] POST /send error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
