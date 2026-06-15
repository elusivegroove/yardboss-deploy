/**
 * YardBoss — Email Preview Generator
 *
 * Renders the actual billing email templates (auto-pay confirmation w/
 * surcharge, manual-pay payment due) to static HTML files using sample
 * data, so they can be opened directly in a browser to review branding/
 * copy without sending a real email.
 *
 * Usage: node scripts/preview-emails.js
 */

const fs = require('fs');
const path = require('path');
const { buildEmailHtml } = require('../lib/email');
const { chargedEmailBody, dueEmailBody, calcSurcharge } = require('./monthly-renewal-billing');

const periodLabel = 'June 2026';
const billingDateStr = '2026-06-01';
const baseAmount = 500;
const surcharge = calcSurcharge(baseAmount);
const totalAmount = Math.round((baseAmount + surcharge) * 100) / 100;

const autopayHtml = buildEmailHtml('YardBoss', chargedEmailBody(
  { name: 'John Smith', spaceNumber: '14' }, baseAmount, surcharge, totalAmount, periodLabel, billingDateStr, '4471'
));
const manualHtml = buildEmailHtml('YardBoss', dueEmailBody(
  { name: 'Jane Doe', spaceNumber: '22' }, 450, periodLabel, null
));

const outDir = path.join(__dirname, '..', 'previews');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'autopay-confirmation.html'), autopayHtml);
fs.writeFileSync(path.join(outDir, 'manual-payment-due.html'), manualHtml);

console.log('Wrote previews:');
console.log('  ' + path.join(outDir, 'autopay-confirmation.html'));
console.log('  ' + path.join(outDir, 'manual-payment-due.html'));
