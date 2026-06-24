/**
 * YardBoss — Shared email transport.
 *
 * Priority:
 *   1. RESEND_API_KEY set → Resend HTTP API (works on Railway — no SMTP port blocking)
 *   2. SMTP_HOST set      → nodemailer SMTP (local dev fallback)
 *   3. Neither set        → mock mode (console log only)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SMTP_FROM      = process.env.SMTP_FROM || process.env.SMTP_USER || '';
const SMTP_REPLY_TO  = process.env.SMTP_REPLY_TO || '';

const MOCK_SMTP = !RESEND_API_KEY && (!process.env.SMTP_HOST || process.env.SMTP_HOST === '');

let transporter = null;

if (RESEND_API_KEY) {
  // Resend HTTP API — used on Railway (SMTP ports are blocked there)
  const { Resend } = require('resend');
  const resend = new Resend(RESEND_API_KEY);

  transporter = {
    sendMail: async ({ from, replyTo, to, subject, html }) => {
      const { error } = await resend.emails.send({
        from: from || SMTP_FROM || 'YardBoss <noreply@transvegatruckcenter.com>',
        reply_to: replyTo || SMTP_REPLY_TO || undefined,
        to: Array.isArray(to) ? to : to.split(',').map(e => e.trim()).filter(Boolean),
        subject,
        html,
      });
      if (error) throw new Error(error.message || 'Resend error');
    },
  };
  console.log('[Email] Resend HTTP API ready');

} else if (process.env.SMTP_HOST && process.env.SMTP_HOST !== '') {
  // Nodemailer SMTP — local dev only
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log('[Email] SMTP ready via', process.env.SMTP_HOST);
  } catch (e) {
    console.warn('[Email] nodemailer not available:', e.message);
  }
}

if (!transporter) {
  console.log('[Email] Mock mode — emails will be logged to console only');
}

function buildEmailHtml(senderName, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:0;}
  .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.07);}
  .hdr{background:#0f1e3c;padding:24px 32px;text-align:center;}
  .hdr .logo{margin-bottom:10px;}
  .hdr .logo img{height:120px;border-radius:8px;display:block;margin:0 auto;background:#fff;padding:8px;}
  .hdr .sub{font-size:0.8rem;color:rgba(255,255,255,0.75);margin-top:8px;}
  .body{padding:28px 32px;font-size:0.92rem;color:#334155;line-height:1.65;}
  .footer{padding:16px 32px;background:#0f1e3c;border-top:1px solid rgba(255,255,255,0.1);font-size:0.78rem;color:#cbd5e1;text-align:center;}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <div class="logo"><img src="https://yardboss-deploy.vercel.app/images/transvega-logo.png" alt="TransVega RV and Truck Center"></div>
    <div class="sub">TransVega RV and Truck Center &nbsp;·&nbsp; 7406 HWY 27 North, Sebring, FL 33870</div>
  </div>
  <div class="body">${body}</div>
  <div class="footer">TransVega RV and Truck Center &nbsp;·&nbsp; (863) 441-3444 &nbsp;·&nbsp; sebring@transvegatruckcenter.com</div>
</div>
</body></html>`;
}

function buildPlainEmailHtml(senderName, body) {
  return buildEmailHtml(senderName, body.replace(/\n/g, '<br>'));
}

module.exports = { MOCK_SMTP, transporter, buildEmailHtml, buildPlainEmailHtml, SMTP_REPLY_TO };
