/**
 * YardBoss — Gate Code API
 * Settings → Gate Code (single monthly code used for all tenant entry).
 */

const express = require('express');
const router = express.Router();
const { MOCK_SMTP, transporter, buildEmailHtml } = require('../lib/email');
const { getGateCode, setGateCode, currentPeriodLabel, gateCodeEmailBody } = require('../lib/gate-code');
const { fillTemplate, getTemplates } = require('../lib/sms-templates');
const { sendSMS } = require('../lib/sms');

// GET /api/gate-code
router.get('/', async (req, res) => {
  try {
    const result = await getGateCode();
    res.json(result);
  } catch (err) {
    console.error('[gate-code] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/gate-code
router.patch('/', async (req, res) => {
  try {
    const { gateCode } = req.body || {};
    if (!gateCode || !String(gateCode).trim()) {
      return res.status(400).json({ error: 'gateCode is required' });
    }
    const result = await setGateCode(String(gateCode).trim());
    res.json(result);
  } catch (err) {
    console.error('[gate-code] PATCH / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gate-code/email — email the current gate code to a tenant.
// Body: { to, tenantName, welcome }
router.post('/email', async (req, res) => {
  try {
    const { to, tenantName, welcome } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to is required' });

    const { gateCode } = await getGateCode();
    if (!gateCode) return res.status(400).json({ error: 'No gate code has been set yet (Settings → Gate Code)' });

    const periodLabel = currentPeriodLabel();
    const subject = `Your Gate Code — ${periodLabel}`;
    const html = buildEmailHtml('YardBoss', gateCodeEmailBody(tenantName || 'there', gateCode, periodLabel, { welcome: !!welcome }));

    if (MOCK_SMTP || !transporter) {
      console.log('\n[GATE CODE EMAIL MOCK] ─────────────────────────────');
      console.log(`  To:      ${to} (${tenantName || ''})`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Code:    ${gateCode}`);
      console.log('───────────────────────────────────────────────────\n');
      return res.json({ mock: true, gateCode });
    }

    await transporter.sendMail({
      from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || undefined,
      to,
      subject,
      html,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[gate-code] POST /email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gate-code/sms — send the current gate code to a tenant via SMS.
// Body: { to, tenantName }
router.post('/sms', async (req, res) => {
  try {
    const { to, tenantName } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to (phone number) is required' });

    const { gateCode } = await getGateCode();
    if (!gateCode) return res.status(400).json({ error: 'No gate code has been set yet (Settings → Gate Code)' });

    const templates = await getTemplates();
    const tpl = templates.gate_code;
    const body = fillTemplate(tpl.body, {
      name: tenantName || 'there',
      gate_code: gateCode,
      period: currentPeriodLabel(),
    });

    const result = await sendSMS(to, body);
    res.json({ ...result, gateCode });
  } catch (err) {
    console.error('[gate-code] POST /sms error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
