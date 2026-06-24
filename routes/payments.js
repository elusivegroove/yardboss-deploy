const express = require('express');
const router = express.Router();
const { reservations } = require('./store');
const { MOCK_SMTP, transporter, buildEmailHtml } = require('../lib/email');
const { getGateCode, currentPeriodLabel, gateCodeEmailBody } = require('../lib/gate-code');
const { notifyAdmin } = require('../lib/notify-admin');

const MOCK = process.env.MOCK_PAYMENTS === 'true';
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = (!MOCK && stripeKey && !stripeKey.includes('YOUR_'))
  ? require('stripe')(stripeKey)
  : null;

// ─── POST /api/payments/create-intent ─────────────────────────────────────────
// Called by the client portal after filling out booking form.
// Returns a Stripe PaymentIntent clientSecret (or mock data).
router.post('/create-intent', async (req, res) => {
  try {
    const { reservationId, amount, currency = 'usd', description } = req.body;

    if (!reservationId || !amount) {
      return res.status(400).json({ error: 'reservationId and amount are required' });
    }

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    if (MOCK || !stripe) {
      // Mock mode — return a fake clientSecret so portal UI can proceed without real Stripe keys
      return res.json({
        mock: true,
        clientSecret: `pi_mock_${Date.now()}_secret_mock`,
        paymentIntentId: `pi_mock_${Date.now()}`,
        amount,
        currency,
        message: 'Mock payment intent (sandbox mode — add real Stripe keys to process payments)',
      });
    }

    // Real Stripe payment intent
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      description: description || `YardBoss reservation ${reservationId}`,
      metadata: {
        reservationId,
        tenantName: reservation.tenantName,
        lotId: reservation.lotId,
        spaceNumber: reservation.spaceNumber,
        env: process.env.YARDBOSS_ENV,
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
    });
  } catch (err) {
    console.error('create-intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/payments/confirm ───────────────────────────────────────────────
// Called after successful payment to mark reservation active.
router.post('/confirm', async (req, res) => {
  try {
    const { reservationId, paymentIntentId } = req.body;

    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx === -1) return res.status(404).json({ error: 'Reservation not found' });

    // Verify payment with Stripe (unless mock)
    if (!MOCK && stripe && paymentIntentId && !paymentIntentId.startsWith('pi_mock_')) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ error: `Payment not succeeded (status: ${intent.status})` });
      }
    }

    Object.assign(reservations[idx], {
      status: 'active',
      paymentStatus: 'current',
      stripePaymentIntentId: paymentIntentId,
      activatedAt: new Date().toISOString(),
    });

    const r = reservations[idx];

    // Email the current gate code to the new tenant now that their booking
    // and first payment are confirmed (Settings → Gate Code).
    sendGateCodeWelcomeEmail(r).catch(err => {
      console.error('[payments/confirm] gate code email error:', err.message);
    });

    notifyAdmin(
      `Payment Confirmed — ${r.tenantName}`,
      `<h2 style="margin-top:0;color:#0f1e3c;">Portal Payment Confirmed</h2>
       <p><strong>${r.tenantName}</strong>'s booking payment was confirmed. Their account is now active.</p>
       <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.95rem;">
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Space</td><td><strong>${r.spaceNumber || '—'}</strong></td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Rate</td><td><strong>$${r.monthlyRate}/mo</strong></td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Email</td><td>${r.email}</td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Phone</td><td>${r.phone || '—'}</td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Payment ID</td><td style="font-size:0.8rem;color:#64748b;">${paymentIntentId || '—'}</td></tr>
       </table>
       <p><a href="https://yardboss-deploy.vercel.app/reservations.html" style="color:#00b4a0;font-weight:600;">View in YardBoss →</a></p>`
    ).catch(() => {});

    res.json({ success: true, reservation: r });
  } catch (err) {
    console.error('confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/payments/create-customer ───────────────────────────────────────
// Creates a Stripe Customer for recurring billing.
router.post('/create-customer', async (req, res) => {
  try {
    const { reservationId } = req.body;
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    if (MOCK || !stripe) {
      return res.json({ mock: true, customerId: `cus_mock_${Date.now()}` });
    }

    const customer = await stripe.customers.create({
      email: reservation.email,
      name: reservation.tenantName,
      phone: reservation.phone,
      metadata: { reservationId, company: reservation.company, env: process.env.YARDBOSS_ENV },
    });

    const idx = reservations.findIndex(r => r.id === reservationId);
    reservations[idx].stripeCustomerId = customer.id;

    res.json({ customerId: customer.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────
// Raw body required — set up in server.js before bodyParser.
router.post('/../../webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (MOCK || !stripe || !secret || secret.includes('YOUR_')) {
    return res.json({ received: true, mock: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const resId = pi.metadata?.reservationId;
      if (resId) {
        const idx = reservations.findIndex(r => r.id === resId);
        if (idx !== -1) {
          reservations[idx].paymentStatus = 'current';
          reservations[idx].status = 'active';
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      const resId = pi.metadata?.reservationId;
      if (resId) {
        const idx = reservations.findIndex(r => r.id === resId);
        if (idx !== -1) reservations[idx].paymentStatus = 'failed';
      }
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      const customerId = inv.customer;
      const idx = reservations.findIndex(r => r.stripeCustomerId === customerId);
      if (idx !== -1) reservations[idx].paymentStatus = 'overdue';
      break;
    }
  }

  res.json({ received: true });
});

// ─── POST /api/payments/process-autopay ──────────────────────────────────────
// Charges a tenant's stored card. Mock mode just logs and returns success.
router.post('/process-autopay', async (req, res) => {
  try {
    const { tenantId, amount, description } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    if (MOCK || !stripe) {
      console.log(`[AutoPay MOCK] tenant=${tenantId} amount=$${amount || 0}`);
      return res.json({
        mock: true,
        success: true,
        paymentIntentId: `pi_mock_autopay_${Date.now()}`,
        processedAt: new Date().toISOString(),
        amount: amount || 0
      });
    }

    const reservation = reservations.find(r => r.id === tenantId);
    if (!reservation || !reservation.stripeCustomerId) {
      return res.status(404).json({ error: 'No Stripe customer on file for this tenant' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round((amount || 0) * 100),
      currency: 'usd',
      customer: reservation.stripeCustomerId,
      description: description || `YardBoss auto-pay for ${reservation.tenantName}`,
      confirm: true,
      off_session: true,
      payment_method: reservation.stripePaymentMethodId,
      metadata: { tenantId, env: process.env.YARDBOSS_ENV }
    });

    res.json({ success: true, paymentIntentId: intent.id, processedAt: new Date().toISOString(), amount });
  } catch (err) {
    console.error('[process-autopay]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Sends a welcome email with the current gate code to a newly-confirmed reservation.
// No-op (logged) if no gate code has been set yet, or the reservation has no email.
async function sendGateCodeWelcomeEmail(reservation) {
  if (!reservation || !reservation.email) return;

  const { gateCode } = await getGateCode();
  if (!gateCode) {
    console.log('[payments/confirm] No gate code set (Settings → Gate Code) — skipping gate code email for', reservation.email);
    return;
  }

  const periodLabel = currentPeriodLabel();
  const subject = `Booking Confirmed — Your Gate Code (${periodLabel})`;
  const html = buildEmailHtml('YardBoss', gateCodeEmailBody(reservation.tenantName || 'there', gateCode, periodLabel, { welcome: true }));

  if (MOCK_SMTP || !transporter) {
    console.log('\n[GATE CODE EMAIL MOCK] ─────────────────────────────');
    console.log(`  To:      ${reservation.email} (${reservation.tenantName || ''})`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Code:    ${gateCode}`);
    console.log('───────────────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({
    from: `"YardBoss — TransVega" <${process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to: reservation.email,
    subject,
    html,
  });
}

// ─── GET /api/payments/status ─────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    mock: MOCK || !stripe,
    stripeReady: !!(stripe),
    env: process.env.YARDBOSS_ENV,
  });
});

module.exports = router;
