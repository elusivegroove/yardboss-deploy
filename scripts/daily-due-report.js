/**
 * YardBoss — Daily Parking Due Report
 *
 * Runs every morning at 8:00 AM (America/New_York), scans active tenants
 * for upcoming/past due parking, and emails a digest to accounting/management.
 *
 * Notice windows (per tenant rate type) are defined in lib/renewal.js:
 *   daily   → 24 hours (1 day) before due date
 *   weekly  → 3 days before due date
 *   monthly → 5 days before due date
 * This report itself always covers the full 0–5 day window plus past due,
 * so it's a superset; the "Recommended Action" column reflects whether a
 * given tenant's own notice window has been reached yet.
 */

const db = require('../db');
const { getDaysUntilDue, getNoticeDays } = require('../lib/renewal');
const { MOCK_SMTP, transporter, buildEmailHtml } = require('../lib/email');

const RECIPIENTS = ['accounting1@transvegalogistics.com', 'sam.f@transvegalogistics.com'];

const BUCKETS = [
  { key: 'dueWithin5',  title: 'Due Within 5 Days' },
  { key: 'dueWithin3',  title: 'Due Within 3 Days' },
  { key: 'dueTomorrow', title: 'Due Tomorrow' },
  { key: 'dueToday',    title: 'Due Today' },
  { key: 'pastDue',     title: 'Past Due' },
];

function bucketFor(daysRemaining) {
  if (daysRemaining < 0) return 'pastDue';
  if (daysRemaining === 0) return 'dueToday';
  if (daysRemaining === 1) return 'dueTomorrow';
  if (daysRemaining <= 3) return 'dueWithin3';
  return 'dueWithin5'; // 4-5
}

function recommendedAction(daysRemaining, rateType) {
  if (daysRemaining < 0) return 'Past due — contact tenant for payment or initiate move-out';
  if (daysRemaining <= getNoticeDays(rateType || 'monthly')) return 'Send renewal reminder';
  return 'Monitor — no action needed yet';
}

function formatCurrency(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

// Fetches active tenants with a due date and buckets them by days remaining.
async function buildReportBuckets() {
  const result = await db.query(`SELECT * FROM tenants WHERE status = 'active' AND due_date IS NOT NULL`);
  const buckets = { dueWithin5: [], dueWithin3: [], dueTomorrow: [], dueToday: [], pastDue: [] };

  for (const row of result.rows) {
    const dueDateStr = row.due_date.toISOString().split('T')[0];
    const daysRemaining = getDaysUntilDue(dueDateStr);
    if (daysRemaining === null || daysRemaining > 5) continue;

    const payments = row.payments || [];
    const balance = payments.reduce((sum, p) => {
      const amt = Number(p.amount) || 0;
      return sum + (p.type === 'charge' ? amt : -amt);
    }, 0);

    buckets[bucketFor(daysRemaining)].push({
      name: row.name || '',
      company: row.company || '',
      phone: row.phone || '',
      email: row.email || '',
      vehicleType: (row.vehicle && row.vehicle.type) || '',
      spaceNumber: row.space_number || '',
      dueDate: dueDateStr,
      daysRemaining,
      balance: Math.round(balance * 100) / 100,
      action: recommendedAction(daysRemaining, row.rate_type),
    });
  }

  return buckets;
}

function rowsTableHtml(rows) {
  if (!rows.length) {
    return '<p style="color:#94a3b8;font-size:0.85rem;margin:4px 0 20px;">None</p>';
  }
  const headers = ['Customer Name', 'Company', 'Phone', 'Email', 'Vehicle Type', 'Space #', 'Due Date', 'Days Remaining', 'Balance Due', 'Recommended Action'];
  const headerHtml = headers.map(h =>
    `<th style="text-align:left;padding:6px 10px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">${h}</th>`
  ).join('');

  const bodyHtml = rows.map(r => {
    const cells = [
      r.name, r.company, r.phone, r.email, r.vehicleType, r.spaceNumber,
      formatDate(r.dueDate), String(r.daysRemaining), formatCurrency(r.balance), r.action
    ];
    return '<tr>' + cells.map(c =>
      `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:0.8rem;color:#334155;">${c || '—'}</td>`
    ).join('') + '</tr>';
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;margin:4px 0 20px;"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function buildEmailBody(buckets) {
  const total = BUCKETS.reduce((s, b) => s + buckets[b.key].length, 0);
  if (total === 0) {
    return '<h2 style="margin-top:0;color:#0f1e3c;">Yard Boss Daily Parking Due Report</h2>'
      + '<p style="color:#475569;">No tenants are due, due soon, or past due today. Nothing to action.</p>';
  }
  let html = '<h2 style="margin-top:0;color:#0f1e3c;">Yard Boss Daily Parking Due Report</h2>';
  for (const b of BUCKETS) {
    const rows = buckets[b.key];
    html += `<h3 style="color:#0f1e3c;border-bottom:2px solid #00b4a0;padding-bottom:4px;margin-top:24px;">${b.title} (${rows.length})</h3>`;
    html += rowsTableHtml(rows);
  }
  return html;
}

// Runs the report: queries tenants, builds the digest, and emails RECIPIENTS.
async function runDailyDueReport() {
  const buckets = await buildReportBuckets();
  const body = buildEmailBody(buckets);
  const html = buildEmailHtml('YardBoss', body);
  const subject = 'Yard Boss Daily Parking Due Report';

  if (MOCK_SMTP || !transporter) {
    console.log('\n[DAILY DUE REPORT — MOCK] ──────────────────────────────────');
    console.log(`  Subject: ${subject}`);
    console.log(`  To: ${RECIPIENTS.join(', ')}`);
    for (const b of BUCKETS) {
      console.log(`  ${b.title}: ${buckets[b.key].length}`);
    }
    console.log('  (Add SMTP_HOST/USER/PASS to .env to send real emails)');
    console.log('────────────────────────────────────────────────────────────\n');
    return { mock: true, buckets };
  }

  await transporter.sendMail({
    from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to: RECIPIENTS.join(', '),
    subject,
    html,
  });
  return { mock: false, buckets };
}

module.exports = { runDailyDueReport, buildReportBuckets };

// Allow running directly: node scripts/daily-due-report.js
if (require.main === module) {
  require('dotenv').config({ path: `.env.${process.env.YARDBOSS_ENV || 'sandbox'}` });
  runDailyDueReport()
    .then(result => { console.log('[daily-due-report] Done.', result.mock ? '(mock)' : '(sent)'); process.exit(0); })
    .catch(err => { console.error('[daily-due-report] Error:', err); process.exit(1); });
}
