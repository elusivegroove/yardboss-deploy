/**
 * YardBoss — Monthly Late Fee Charges
 *
 * Runs at 8:00 AM America/New_York on the 6th of every month, for every
 * active, monthly-rate tenant who still has an outstanding balance (rent
 * billed on the 1st hasn't been paid):
 *
 *   - Adds a $35 "Late fee" charge to the tenant's ledger.
 *   - Emails the tenant a Late Fee Notice.
 *
 * Tenants are skipped if:
 *   - They're not on a monthly rate plan (weekly/daily handled separately).
 *   - Their current balance is $0 or a credit (rent already paid).
 *   - They're marked `lateFeeExempt` on their profile.
 *   - A late fee for this month was already applied (idempotent re-runs).
 *
 * A summary email is sent to accounting so staff know who was charged.
 */

const db = require('../db');
const { MOCK_SMTP, transporter, buildEmailHtml } = require('../lib/email');

const LATE_FEE_AMOUNT = 35;
const RECIPIENTS = ['accounting1@transvegalogistics.com', 'sam.f@transvegalogistics.com'];

function formatCurrency(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function periodLabelFor(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function calcBalance(payments) {
  return (payments || []).reduce((sum, p) => {
    const amt = Number(p.amount) || 0;
    return sum + (p.type === 'charge' ? amt : -amt);
  }, 0);
}

function lateFeeEmailBody(tenant, balance, periodLabel, billingDateStr) {
  return `<h2 style="margin-top:0;color:#0f1e3c;">Late Fee Notice</h2>
<p>Hi ${tenant.name},</p>
<p>As of ${billingDateStr}, your ${periodLabel} rent for Space #${tenant.spaceNumber} remains unpaid. A late fee of <strong>${formatCurrency(LATE_FEE_AMOUNT)}</strong> has been added to your account.</p>
<p>Updated balance due: <strong>${formatCurrency(balance + LATE_FEE_AMOUNT)}</strong></p>
<p>Please log in to the tenant portal to make a payment, or contact us at (863) 441-3444 if you have any questions.</p>`;
}

async function sendEmail(to, subject, html) {
  if (MOCK_SMTP || !transporter) {
    console.log(`[LateFee MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }
  await transporter.sendMail({
    from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  return { mock: false };
}

function summaryEmailBody(summary, periodLabel) {
  const list = (items) => items.length
    ? `<ul style="margin:4px 0 16px;padding-left:20px;">${items.map(i => `<li style="font-size:0.85rem;color:#334155;">${i}</li>`).join('')}</ul>`
    : '<p style="color:#94a3b8;font-size:0.85rem;margin:4px 0 16px;">None</p>';

  return `<h2 style="margin-top:0;color:#0f1e3c;">Late Fee Charges — ${periodLabel}</h2>
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Late Fees Applied (${summary.charged.length})</h3>
${list(summary.charged)}
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">No Email On File (${summary.skippedNoEmail.length})</h3>
${list(summary.skippedNoEmail)}
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Exempt (${summary.exempt.length})</h3>
${list(summary.exempt)}
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Already Paid (${summary.paid.length})</h3>
${list(summary.paid)}`;
}

// Runs the late-fee pass for all active, monthly-rate tenants with a balance due.
async function runLateFeeCharges() {
  const result = await db.query(`SELECT * FROM tenants WHERE status = 'active'`);
  const now = new Date();
  const periodLabel = periodLabelFor(now);
  const billingDateStr = now.toISOString().split('T')[0];
  const feeDescription = `Late fee — ${periodLabel}`;

  const summary = { charged: [], skippedNoEmail: [], exempt: [], paid: [] };

  for (const row of result.rows) {
    if ((row.rate_type || 'monthly') !== 'monthly') continue;

    const tenant = { id: row.id, name: row.name, email: row.email, spaceNumber: row.space_number };

    if (row.late_fee_exempt) {
      summary.exempt.push(tenant.name);
      continue;
    }

    const payments = row.payments || [];
    const balance = calcBalance(payments);

    if (balance <= 0) {
      summary.paid.push(tenant.name);
      continue;
    }

    if (payments.some(p => p.type === 'charge' && p.description === feeDescription)) {
      // Already charged this month — don't double up on re-runs.
      continue;
    }

    payments.push({ date: billingDateStr, amount: LATE_FEE_AMOUNT, type: 'charge', description: feeDescription });
    await db.query(`UPDATE tenants SET payments = $1 WHERE id = $2`, [JSON.stringify(payments), row.id]);

    if (!tenant.email) {
      summary.skippedNoEmail.push(`${tenant.name} (charged, no email)`);
      continue;
    }

    const subject = 'Late Fee Notice — TransVega RV & Truck Center';
    const html = buildEmailHtml('YardBoss', lateFeeEmailBody(tenant, balance, periodLabel, billingDateStr));
    await sendEmail(tenant.email, subject, html);
    summary.charged.push(tenant.name);
  }

  const adminSubject = `Yard Boss Late Fee Charges — ${periodLabel}`;
  const adminHtml = buildEmailHtml('YardBoss', summaryEmailBody(summary, periodLabel));
  if (MOCK_SMTP || !transporter) {
    console.log('\n[LATE FEE CHARGES — MOCK] ──────────────────────────────────');
    console.log(`  Subject: ${adminSubject}`);
    console.log(`  To: ${RECIPIENTS.join(', ')}`);
    console.log(`  Charged: ${summary.charged.length}, No Email: ${summary.skippedNoEmail.length}, Exempt: ${summary.exempt.length}, Paid: ${summary.paid.length}`);
    console.log('────────────────────────────────────────────────────────────────\n');
  } else {
    await transporter.sendMail({
      from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
      to: RECIPIENTS.join(', '),
      subject: adminSubject,
      html: adminHtml,
    });
  }

  return summary;
}

module.exports = { runLateFeeCharges, calcBalance };

// Allow running directly: node scripts/late-fee-charges.js
if (require.main === module) {
  require('dotenv').config({ path: `.env.${process.env.YARDBOSS_ENV || 'sandbox'}` });
  runLateFeeCharges()
    .then(summary => { console.log('[late-fee-charges] Done.', JSON.stringify(summary, null, 2)); process.exit(0); })
    .catch(err => { console.error('[late-fee-charges] Error:', err); process.exit(1); });
}
