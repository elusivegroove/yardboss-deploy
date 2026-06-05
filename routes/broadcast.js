const express = require('express');
const router = express.Router();

// ── Email (nodemailer) ────────────────────────────────────────────────────────
const MOCK_SMTP = !process.env.SMTP_HOST
  || process.env.SMTP_HOST.includes('YOUR_')
  || process.env.SMTP_HOST === '';

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
    console.log('[Broadcast] SMTP ready via', process.env.SMTP_HOST);
  } catch (e) {
    console.warn('[Broadcast] nodemailer not available:', e.message);
  }
}

// ── SMS (Twilio) ──────────────────────────────────────────────────────────────
const MOCK_SMS = !process.env.TWILIO_ACCOUNT_SID
  || process.env.TWILIO_ACCOUNT_SID.includes('YOUR_')
  || process.env.TWILIO_ACCOUNT_SID === '';

let twilioClient = null;
if (!MOCK_SMS) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[Broadcast] Twilio ready');
  } catch (e) {
    console.warn('[Broadcast] twilio not available:', e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

function buildEmailHtml(senderName, body) {
  const escaped = body.replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:0;}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.07);}
  .hdr{background:#0f1e3c;padding:24px 32px;}
  .hdr .logo{font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:-0.5px;}
  .hdr .logo span{color:#00b4a0;}
  .hdr .sub{font-size:0.75rem;color:rgba(255,255,255,0.55);margin-top:3px;}
  .body{padding:28px 32px;font-size:0.92rem;color:#334155;line-height:1.65;}
  .footer{padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:0.75rem;color:#94a3b8;text-align:center;}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <div class="logo">Yard<span>Boss</span></div>
    <div class="sub">TransVega RV and Truck Center &nbsp;·&nbsp; 7406 HWY 27 North, Sebring FL 33870</div>
  </div>
  <div class="body">${escaped}</div>
  <div class="footer">TransVega RV and Truck Center &nbsp;·&nbsp; (863) 441-3444 &nbsp;·&nbsp; toby@transvegalogistics.com</div>
</div>
</body></html>`;
}

// ── POST /api/broadcast ───────────────────────────────────────────────────────
// Body: { tenants: [{name,email,phone}], subject, body, channels: ['email','sms'] }
router.post('/', async (req, res) => {
  const { tenants, subject, body, channels } = req.body;

  if (!tenants || !Array.isArray(tenants) || !tenants.length) {
    return res.status(400).json({ error: 'No tenants provided' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }
  const doEmail = Array.isArray(channels) && channels.includes('email');
  const doSMS   = Array.isArray(channels) && channels.includes('sms');
  if (!doEmail && !doSMS) {
    return res.status(400).json({ error: 'Select at least one channel' });
  }

  const results = { emailsSent: 0, emailsFailed: 0, smsSent: 0, smsFailed: 0, mock: false };

  // ── Email ─────────────────────────────────────────────────────────────────
  if (doEmail) {
    const emailTargets = tenants.filter(t => t.email && t.email.trim());

    if (MOCK_SMTP || !transporter) {
      results.mock = true;
      results.emailsSent = emailTargets.length;
      console.log('\n[BROADCAST EMAIL — MOCK] ─────────────────────────────────');
      console.log(`  Subject: ${subject || '(no subject)'}`);
      console.log(`  Sending to ${emailTargets.length} tenant(s):`);
      emailTargets.forEach(t => console.log(`    • ${t.name} <${t.email}>`));
      console.log('  (Add SMTP_HOST/USER/PASS to .env to send real emails)');
      console.log('──────────────────────────────────────────────────────────\n');
    } else {
      const html = buildEmailHtml('TransVega Yard', body);
      const emailJobs = emailTargets.map(tenant =>
        transporter.sendMail({
          from: `"TransVega Yard" <${process.env.SMTP_USER}>`,
          to: tenant.email,
          subject: subject || 'Message from TransVega RV & Truck Center',
          html,
          text: body
        }).then(() => { results.emailsSent++; })
          .catch(err => {
            results.emailsFailed++;
            console.error(`[Broadcast] Email failed for ${tenant.email}:`, err.message);
          })
      );
      await Promise.all(emailJobs);
    }
  }

  // ── SMS ───────────────────────────────────────────────────────────────────
  if (doSMS) {
    const smsTargets = tenants
      .map(t => ({ ...t, e164: normalizePhone(t.phone) }))
      .filter(t => t.e164);

    if (MOCK_SMS || !twilioClient) {
      results.mock = true;
      results.smsSent = smsTargets.length;
      console.log('\n[BROADCAST SMS — MOCK] ───────────────────────────────────');
      console.log(`  Message: ${body.slice(0, 80)}${body.length > 80 ? '…' : ''}`);
      console.log(`  Sending to ${smsTargets.length} tenant(s):`);
      smsTargets.forEach(t => console.log(`    • ${t.name} (${t.e164})`));
      console.log('  (Add TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM to .env to send real SMS)');
      console.log('──────────────────────────────────────────────────────────\n');
    } else {
      const smsBody = `TransVega Yard: ${body}`;
      const smsJobs = smsTargets.map(tenant =>
        twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_FROM_NUMBER,
          to: tenant.e164
        }).then(() => { results.smsSent++; })
          .catch(err => {
            results.smsFailed++;
            console.error(`[Broadcast] SMS failed for ${tenant.e164}:`, err.message);
          })
      );
      await Promise.all(smsJobs);
    }
  }

  res.json(results);
});

module.exports = router;
