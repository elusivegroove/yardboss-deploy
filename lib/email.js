/**
 * YardBoss — Shared email transport (nodemailer).
 * Falls back to console-logged "mock" mode when SMTP_HOST is not configured,
 * so emails can be developed/tested without real credentials.
 */

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
    console.log('[Email] SMTP ready via', process.env.SMTP_HOST);
  } catch (e) {
    console.warn('[Email] nodemailer not available:', e.message);
  }
}

// Wraps body content (plain text or HTML) in the branded YardBoss email shell.
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

// Wraps plain-text body (escapes newlines to <br>) — used for tenant messages.
function buildPlainEmailHtml(senderName, body) {
  return buildEmailHtml(senderName, body.replace(/\n/g, '<br>'));
}

module.exports = { MOCK_SMTP, transporter, buildEmailHtml, buildPlainEmailHtml };
