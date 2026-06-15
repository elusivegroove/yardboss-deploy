/**
 * YardBoss — Gate Code
 * Single source of truth for the current monthly gate code (Settings → Gate Code).
 * Reads/writes PostgreSQL when DATABASE_URL is set, falls back to an
 * in-memory store otherwise.
 */

const db = require('../db');
const { appSettings } = require('../routes/store');

async function getGateCode() {
  if (process.env.DATABASE_URL) {
    const r = await db.query('SELECT * FROM app_settings WHERE id = 1');
    if (r.rows.length) {
      return { gateCode: r.rows[0].gate_code || null, updatedAt: r.rows[0].gate_code_updated_at || null };
    }
    return { gateCode: null, updatedAt: null };
  }
  return { gateCode: appSettings.gateCode, updatedAt: appSettings.gateCodeUpdatedAt };
}

async function setGateCode(code) {
  const now = new Date();
  if (process.env.DATABASE_URL) {
    await db.query(
      `INSERT INTO app_settings (id, gate_code, gate_code_updated_at)
       VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET gate_code = $1, gate_code_updated_at = $2`,
      [code, now]
    );
  } else {
    appSettings.gateCode = code;
    appSettings.gateCodeUpdatedAt = now;
  }
  return { gateCode: code, updatedAt: now };
}

// "June 2026"
function currentPeriodLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Email body for the gate code — used both for new-booking welcome emails and
// for recurring monthly payment-confirmation emails to existing tenants.
function gateCodeEmailBody(tenantName, gateCode, periodLabel, opts) {
  opts = opts || {};
  const intro = opts.welcome
    ? `<p>Thanks for booking with us, ${tenantName}! Your reservation and payment are confirmed.</p>`
    : `<p>Hi ${tenantName},</p><p>Thanks for your payment — here is the current gate code for ${periodLabel}.</p>`;

  return `<h2 style="margin-top:0;color:#0f1e3c;">Gate Access Code — ${periodLabel}</h2>
${intro}
<div style="text-align:center;margin:20px 0;">
  <div style="display:inline-block;background:#f8fafc;border:2px dashed #00b4a0;border-radius:10px;padding:14px 32px;">
    <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:4px;">Gate Code</div>
    <div style="font-size:1.8rem;font-weight:800;color:#0f1e3c;letter-spacing:3px;">${gateCode}</div>
  </div>
</div>
<p style="font-size:0.85rem;color:#64748b;">This code is valid for entry through the end of ${periodLabel} and changes monthly. We'll email you the new code each month after your payment is received.</p>
<p>If you have any trouble at the gate, call us at (863) 441-3444.</p>`;
}

module.exports = { getGateCode, setGateCode, currentPeriodLabel, gateCodeEmailBody };
