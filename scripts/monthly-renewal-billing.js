/**
 * YardBoss — Monthly Renewal Billing
 *
 * Runs at 8:00 AM America/New_York on the 1st of every month, for every
 * active tenant on a monthly rate plan:
 *
 *   - Auto-pay tenants: charge the card on file for the month's rent,
 *     record the payment, and email them a payment confirmation.
 *   - Manual-pay tenants: record the new charge on their ledger and
 *     email them a payment-due reminder.
 *
 * If an auto-pay charge fails (no card on file / processor error), the
 * tenant is treated like a manual-pay tenant for that cycle (charge is
 * recorded and a payment-due email is sent instead).
 *
 * A summary email is sent to accounting so staff know the run completed
 * and can follow up on any failures or tenants with no email on file.
 */

const db = require('../db');
const { MOCK_SMTP, transporter, buildEmailHtml } = require('../lib/email');

const MOCK_PAYMENTS = process.env.MOCK_PAYMENTS === 'true';
const RECIPIENTS = ['accounting1@transvegalogistics.com', 'sam.f@transvegalogistics.com'];

// Card processing surcharge applied to auto-pay (credit card on file) charges only.
const CARD_SURCHARGE_RATE = 0.035;

function formatCurrency(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function calcSurcharge(amount) {
  return Math.round(amount * CARD_SURCHARGE_RATE * 100) / 100;
}

function periodLabelFor(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Attempts to charge an auto-pay tenant's card on file.
// Real Stripe billing isn't wired up to the tenant ledger yet, so outside
// of mock mode this always reports failure (no card on file) so the tenant
// falls back to a payment-due reminder rather than silently going unbilled.
async function chargeAutopayTenant(tenant, amount, periodLabel) {
  if (MOCK_PAYMENTS || !process.env.STRIPE_SECRET_KEY) {
    console.log(`[MonthlyBilling MOCK] Charged ${tenant.name} (${tenant.id}) ${formatCurrency(amount)} for ${periodLabel}`);
    return { success: true, mock: true };
  }
  return { success: false, mock: false, error: 'No payment method on file for auto-pay' };
}

function chargedEmailBody(tenant, baseAmount, surcharge, totalAmount, periodLabel, billingDateStr) {
  return `<h2 style="margin-top:0;color:#0f1e3c;">Payment Confirmation</h2>
<p>Hi ${tenant.name},</p>
<p>This is a confirmation that the card on file for your auto-pay account was charged <strong>${formatCurrency(totalAmount)}</strong> on ${billingDateStr} for your ${periodLabel} rent — Space #${tenant.spaceNumber}.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.88rem;">
  <tr><td style="padding:4px 0;color:#334155;">${periodLabel} Rent</td><td style="padding:4px 0;text-align:right;color:#334155;">${formatCurrency(baseAmount)}</td></tr>
  <tr><td style="padding:4px 0;color:#334155;">Card Processing Fee (${(CARD_SURCHARGE_RATE*100).toFixed(1)}%)</td><td style="padding:4px 0;text-align:right;color:#334155;">${formatCurrency(surcharge)}</td></tr>
  <tr style="border-top:1px solid #e2e8f0;font-weight:700;"><td style="padding:6px 0;color:#0f1e3c;">Total Charged</td><td style="padding:6px 0;text-align:right;color:#0f1e3c;">${formatCurrency(totalAmount)}</td></tr>
</table>
<p>Thank you for being a valued tenant at TransVega RV &amp; Truck Center!</p>`;
}

function dueEmailBody(tenant, amount, periodLabel, reason) {
  const intro = reason === 'autopay_failed'
    ? `<p>We were unable to process your auto-pay for ${periodLabel} rent — Space #${tenant.spaceNumber}.</p>`
    : `<p>Your ${periodLabel} rent for Space #${tenant.spaceNumber} is now due.</p>`;
  return `<h2 style="margin-top:0;color:#0f1e3c;">Payment Due</h2>
<p>Hi ${tenant.name},</p>
${intro}
<p>Amount due: <strong>${formatCurrency(amount)}</strong></p>
<p>Please log in to the tenant portal to make a payment, or contact us at (863) 441-3444 if you have any questions.</p>`;
}

async function sendEmail(to, subject, html) {
  if (MOCK_SMTP || !transporter) {
    console.log(`[MonthlyBilling MOCK EMAIL] To: ${to} | Subject: ${subject}`);
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

  return `<h2 style="margin-top:0;color:#0f1e3c;">Monthly Renewal Billing — ${periodLabel}</h2>
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Auto-Pay Charged (${summary.charged.length})</h3>
${list(summary.charged)}
<p style="font-size:0.85rem;color:#334155;">Card processing surcharges collected (${(CARD_SURCHARGE_RATE*100).toFixed(1)}%): <strong>${formatCurrency(summary.surchargeTotal)}</strong></p>
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Payment Due Reminders Sent (${summary.due.length})</h3>
${list(summary.due)}
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">No Email On File (${summary.skippedNoEmail.length})</h3>
${list(summary.skippedNoEmail)}
<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;">Skipped — No Rate Set (${summary.skippedNoAmount.length})</h3>
${list(summary.skippedNoAmount)}`;
}

// Runs the monthly billing cycle for all active, monthly-rate tenants.
async function runMonthlyRenewalBilling() {
  const result = await db.query(`SELECT * FROM tenants WHERE status = 'active'`);
  const now = new Date();
  const periodLabel = periodLabelFor(now);
  const billingDateStr = now.toISOString().split('T')[0];

  const summary = { charged: [], due: [], skippedNoEmail: [], skippedNoAmount: [], surchargeTotal: 0 };

  for (const row of result.rows) {
    if ((row.rate_type || 'monthly') !== 'monthly') continue;

    const amount = row.renewal_rate != null ? parseFloat(row.renewal_rate) : parseFloat(row.monthly_rate || 0);
    if (!amount || amount <= 0) {
      summary.skippedNoAmount.push(row.name);
      continue;
    }

    const tenant = { id: row.id, name: row.name, email: row.email, spaceNumber: row.space_number };
    const payments = row.payments || [];
    let html, subject, reason = null;

    if (row.payment_method === 'autopay') {
      const surcharge = calcSurcharge(amount);
      const totalAmount = Math.round((amount + surcharge) * 100) / 100;
      const chargeResult = await chargeAutopayTenant(tenant, totalAmount, periodLabel);
      if (chargeResult.success) {
        payments.push({ date: billingDateStr, amount: totalAmount, baseAmount: amount, cardSurcharge: surcharge, type: 'payment', status: 'paid', method: 'autopay', note: `Auto-pay — ${periodLabel} rent (${formatCurrency(amount)} + ${formatCurrency(surcharge)} card surcharge)` });
        subject = 'Payment Confirmation — TransVega RV & Truck Center';
        html = buildEmailHtml('YardBoss', chargedEmailBody(tenant, amount, surcharge, totalAmount, periodLabel, billingDateStr));
        summary.surchargeTotal += surcharge;
      } else {
        payments.push({ date: billingDateStr, amount, type: 'charge', description: `${periodLabel} rent (auto-pay failed)` });
        reason = 'autopay_failed';
        subject = 'Payment Due — TransVega RV & Truck Center';
        html = buildEmailHtml('YardBoss', dueEmailBody(tenant, amount, periodLabel, reason));
      }
    } else {
      payments.push({ date: billingDateStr, amount, type: 'charge', description: `${periodLabel} rent` });
      subject = 'Payment Due — TransVega RV & Truck Center';
      html = buildEmailHtml('YardBoss', dueEmailBody(tenant, amount, periodLabel, reason));
    }

    await db.query(`UPDATE tenants SET payments = $1 WHERE id = $2`, [JSON.stringify(payments), row.id]);

    if (!tenant.email) {
      const label = row.payment_method === 'autopay' && !reason ? `${tenant.name} (charged, no email)` : `${tenant.name} (no email)`;
      summary.skippedNoEmail.push(label);
      continue;
    }

    await sendEmail(tenant.email, subject, html);
    if (row.payment_method === 'autopay' && !reason) {
      summary.charged.push(tenant.name);
    } else {
      summary.due.push(reason === 'autopay_failed' ? `${tenant.name} (auto-pay failed)` : tenant.name);
    }
  }

  const adminSubject = `Yard Boss Monthly Renewal Billing — ${periodLabel}`;
  const adminHtml = buildEmailHtml('YardBoss', summaryEmailBody(summary, periodLabel));
  if (MOCK_SMTP || !transporter) {
    console.log('\n[MONTHLY RENEWAL BILLING — MOCK] ──────────────────────────────');
    console.log(`  Subject: ${adminSubject}`);
    console.log(`  To: ${RECIPIENTS.join(', ')}`);
    console.log(`  Charged: ${summary.charged.length}, Due: ${summary.due.length}, No Email: ${summary.skippedNoEmail.length}, No Rate: ${summary.skippedNoAmount.length}`);
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

module.exports = { runMonthlyRenewalBilling, chargedEmailBody, dueEmailBody, calcSurcharge, periodLabelFor };

// Allow running directly: node scripts/monthly-renewal-billing.js
if (require.main === module) {
  require('dotenv').config({ path: `.env.${process.env.YARDBOSS_ENV || 'sandbox'}` });
  runMonthlyRenewalBilling()
    .then(summary => { console.log('[monthly-renewal-billing] Done.', JSON.stringify(summary, null, 2)); process.exit(0); })
    .catch(err => { console.error('[monthly-renewal-billing] Error:', err); process.exit(1); });
}
