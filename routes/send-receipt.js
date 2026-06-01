const express = require('express');
const router = express.Router();

const MOCK_SMTP = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes('YOUR_') || process.env.SMTP_HOST === '';

let transporter = null;
if (!MOCK_SMTP) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    console.log('[Receipts] Nodemailer configured via', process.env.SMTP_HOST);
  } catch (e) {
    console.log('[Receipts] Nodemailer not installed — using mock mode. Run: npm install nodemailer');
  }
}

// POST /api/send-receipt
// Body: { to, tenantName, subject, html }
router.post('/', async (req, res) => {
  const { to, tenantName, subject, html } = req.body;
  if (!to || !html) return res.status(400).json({ error: 'to and html are required' });

  if (MOCK_SMTP || !transporter) {
    console.log('\n[RECEIPT MOCK] ─────────────────────────────────');
    console.log(`  To:      ${to} (${tenantName || ''})`);
    console.log(`  Subject: ${subject || 'YardBoss Receipt'}`);
    console.log('  (SMTP not configured — add SMTP_HOST/USER/PASS to .env.sandbox)');
    console.log('───────────────────────────────────────────────\n');
    return res.json({ mock: true, message: 'Receipt logged to console (SMTP not configured)' });
  }

  try {
    await transporter.sendMail({
      from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
      to,
      subject: subject || 'Your Receipt — TransVega RV & Truck Center',
      html
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[send-receipt]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
