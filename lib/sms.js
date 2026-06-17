/**
 * YardBoss — Shared Twilio SMS helper
 * Used by gate-code.js, sms-templates.js, and any other route that needs to send SMS.
 */

const MOCK_SMS = !process.env.TWILIO_ACCOUNT_SID
  || process.env.TWILIO_ACCOUNT_SID.includes('YOUR_')
  || process.env.TWILIO_ACCOUNT_SID === '';

let twilioClient = null;
if (!MOCK_SMS) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[SMS] Twilio ready');
  } catch (e) {
    console.warn('[SMS] twilio not available:', e.message);
  }
}

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return null;
}

/**
 * Send an SMS to a phone number.
 * Returns { sent: true, to } or { mock: true, to } or throws on invalid phone.
 */
async function sendSMS(to, body) {
  const e164 = normalizePhone(to);
  if (!e164) throw new Error(`Invalid phone number: ${to}`);

  if (MOCK_SMS || !twilioClient) {
    console.log('\n[SMS MOCK] ─────────────────────────────────────────');
    console.log(`  To:   ${e164}`);
    console.log(`  Body: ${body.slice(0, 120)}${body.length > 120 ? '…' : ''}`);
    console.log('────────────────────────────────────────────────────\n');
    return { mock: true, to: e164 };
  }

  await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER,
    to: e164,
  });
  return { sent: true, to: e164 };
}

module.exports = { sendSMS, normalizePhone, MOCK_SMS };
