/**
 * YardBoss — Tenants API Router
 * CRUD for tenants backed by PostgreSQL.
 * All responses use camelCase keys matching the APP_DATA.tenants shape.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { notifyAdmin } = require('../lib/notify-admin');

// ── Snake → camelCase row mapper ──────────────────────────────────────────────
function rowToTenant(row) {
  // Derive initials from name if not stored
  const name = row.name || '';
  const initials = name.split(' ').map(function(p){ return p[0]; }).join('').toUpperCase().slice(0,2);

  return {
    id:                     row.id,
    name:                   row.name,
    initials:               initials,
    email:                  row.email || '',
    phone:                  row.phone || '',
    company:                row.company || '',
    lotId:                  row.lot_id,
    spaceNumber:            row.space_number,
    monthlyRate:            row.monthly_rate != null ? parseFloat(row.monthly_rate) : 0,
    startDate:              row.start_date ? row.start_date.toISOString().split('T')[0] : null,
    endDate:                row.end_date   ? row.end_date.toISOString().split('T')[0]   : null,
    status:                 row.status,
    registrationStatus:     row.registration_status,
    vehicle:                row.vehicle || { make:'', model:'', year:null, plate:'', type:'Semi Truck' },
    plateState:             row.plate_state || '',
    truckNumber:            row.truck_number   || null,
    trailerNumber:          row.trailer_number || null,
    insuranceDoc:           row.insurance_doc  || null,
    insurancePolicyNumber:  row.insurance_policy_number || null,
    insuranceCompany:       row.insurance_company       || null,
    insuranceExpDate:       row.insurance_exp_date ? row.insurance_exp_date.toISOString().split('T')[0] : null,
    autoRenew:              !!row.auto_renew,
    renewalPeriod:          row.renewal_period || 'monthly',
    renewalRate:            row.renewal_rate != null ? parseFloat(row.renewal_rate) : null,
    paymentMethod:          row.payment_method || 'manual',
    autopayCard:            row.autopay_card      || null,
    autopayNextDate:        row.autopay_next_date ? row.autopay_next_date.toISOString().split('T')[0] : null,
    payments:               row.payments || [],
    priceLocked:            !!row.price_locked,
    moveOutDate:            row.move_out_date ? row.move_out_date.toISOString().split('T')[0] : null,
    rejectionReason:        row.rejection_reason || null,
    additionalDrivers:      row.additional_drivers || [],
    dueDate:                row.due_date ? row.due_date.toISOString().split('T')[0] : null,
    renewalStatus:          row.renewal_status || 'current',
    rateType:               row.rate_type || 'monthly',
    lastReminderSentAt:     row.last_reminder_sent_at ? row.last_reminder_sent_at.toISOString() : null,
    additionalSpaces:       row.additional_spaces || [],
    spaceNumbers:           [row.space_number].concat(row.additional_spaces || []).filter(Boolean),
    lateFeeExempt:          !!row.late_fee_exempt,
    smsConsent:             !!row.sms_consent,
    membershipType:         row.membership_type || 'standard',
  };
}

// GET /api/tenants
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tenants ORDER BY space_number ASC');
    res.json(result.rows.map(rowToTenant));
  } catch (err) {
    console.error('[tenants] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tenants/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rowToTenant(result.rows[0]));
  } catch (err) {
    console.error('[tenants] GET /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenants
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || ('t-' + Date.now());
    const result = await db.query(`
      INSERT INTO tenants (
        id, lot_id, name, email, phone, company, space_number, monthly_rate,
        start_date, end_date, status, registration_status, vehicle, plate_state,
        truck_number, trailer_number, insurance_doc, insurance_policy_number,
        insurance_company, insurance_exp_date, auto_renew, renewal_period,
        renewal_rate, payment_method, autopay_card, autopay_next_date, payments,
        price_locked, move_out_date, rejection_reason, additional_drivers,
        due_date, renewal_status, rate_type, additional_spaces, late_fee_exempt,
        sms_consent, membership_type
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,
        $23,$24,$25,$26,$27,
        $28,$29,$30,$31,
        $32,$33,$34,$35,$36,
        $37,$38
      ) RETURNING *
    `, [
      id,
      b.lotId || null,
      b.name || '',
      b.email || '',
      b.phone || '',
      b.company || '',
      b.spaceNumber || null,
      b.monthlyRate != null ? b.monthlyRate : 0,
      b.startDate || null,
      b.endDate   || null,
      b.status || 'active',
      b.registrationStatus || 'pending',
      b.vehicle ? JSON.stringify(b.vehicle) : JSON.stringify({ make:'', model:'', year:null, plate:'', type:'Semi Truck' }),
      b.plateState || null,
      b.truckNumber   || null,
      b.trailerNumber || null,
      b.insuranceDoc ? JSON.stringify(b.insuranceDoc) : null,
      b.insurancePolicyNumber || null,
      b.insuranceCompany      || null,
      b.insuranceExpDate      || null,
      b.autoRenew || false,
      b.renewalPeriod || 'monthly',
      b.renewalRate != null ? b.renewalRate : null,
      b.paymentMethod || 'manual',
      b.autopayCard     || null,
      b.autopayNextDate || null,
      b.payments ? JSON.stringify(b.payments) : '[]',
      b.priceLocked || false,
      b.moveOutDate || null,
      b.rejectionReason || null,
      b.additionalDrivers ? JSON.stringify(b.additionalDrivers) : '[]',
      b.dueDate || null,
      b.renewalStatus || 'current',
      b.rateType || 'monthly',
      b.additionalSpaces ? JSON.stringify(b.additionalSpaces) : '[]',
      b.lateFeeExempt || false,
      b.smsConsent || false,
      b.membershipType || 'standard'
    ]);
    const tenant = rowToTenant(result.rows[0]);
    const isWalkin = (b.status === 'active' && b.registrationStatus === 'pending') || b.walkIn;
    notifyAdmin(
      `${isWalkin ? 'New Walk-In' : 'New Tenant Added'} — ${tenant.name}`,
      `<h2 style="margin-top:0;color:#0f1e3c;">${isWalkin ? 'Walk-In Check-In' : 'New Tenant Added'}</h2>
       <p><strong>${tenant.name}</strong> has been added${isWalkin ? ' via walk-in check-in' : ' by staff'}.</p>
       <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.95rem;">
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Space</td><td><strong>${tenant.spaceNumber || '—'}</strong></td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Rate</td><td><strong>$${tenant.monthlyRate}/mo</strong></td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Email</td><td>${tenant.email || '—'}</td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Phone</td><td>${tenant.phone || '—'}</td></tr>
         <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Vehicle</td><td>${tenant.vehicle?.type || '—'}</td></tr>
       </table>
       <p><a href="https://yardboss-deploy.vercel.app/reservations.html" style="color:#00b4a0;font-weight:600;">View in YardBoss →</a></p>`
    ).catch(() => {});
    res.status(201).json(tenant);
  } catch (err) {
    console.error('[tenants] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tenants/:id
router.patch('/:id', async (req, res) => {
  try {
    const b   = req.body;
    const { id } = req.params;

    // Build dynamic SET clause from provided fields
    const fieldMap = {
      lotId:                  'lot_id',
      name:                   'name',
      email:                  'email',
      phone:                  'phone',
      company:                'company',
      spaceNumber:            'space_number',
      monthlyRate:            'monthly_rate',
      startDate:              'start_date',
      endDate:                'end_date',
      status:                 'status',
      registrationStatus:     'registration_status',
      vehicle:                'vehicle',
      plateState:             'plate_state',
      truckNumber:            'truck_number',
      trailerNumber:          'trailer_number',
      insuranceDoc:           'insurance_doc',
      insurancePolicyNumber:  'insurance_policy_number',
      insuranceCompany:       'insurance_company',
      insuranceExpDate:       'insurance_exp_date',
      autoRenew:              'auto_renew',
      renewalPeriod:          'renewal_period',
      renewalRate:            'renewal_rate',
      paymentMethod:          'payment_method',
      autopayCard:            'autopay_card',
      autopayNextDate:        'autopay_next_date',
      payments:               'payments',
      priceLocked:            'price_locked',
      moveOutDate:            'move_out_date',
      rejectionReason:        'rejection_reason',
      additionalDrivers:      'additional_drivers',
      dueDate:                'due_date',
      renewalStatus:          'renewal_status',
      rateType:               'rate_type',
      lastReminderSentAt:     'last_reminder_sent_at',
      additionalSpaces:       'additional_spaces',
      lateFeeExempt:          'late_fee_exempt',
      smsConsent:             'sms_consent',
      membershipType:         'membership_type',
    };

    const jsonFields = new Set(['vehicle', 'insurance_doc', 'payments', 'additional_drivers', 'additional_spaces']);
    const setClauses = ['updated_at = NOW()'];
    const values = [];
    let paramIdx = 1;

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(b, camel)) {
        let val = b[camel];
        if (jsonFields.has(snake) && val !== null && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        setClauses.push(`${snake} = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }
    }

    if (setClauses.length === 1) {
      // only updated_at — still valid, just fetch existing
    }

    values.push(id);
    const result = await db.query(
      `UPDATE tenants SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Tenant not found' });
    const updated = rowToTenant(result.rows[0]);

    if (b.status === 'past' && b.moveOutDate) {
      notifyAdmin(
        `Move-Out Confirmed — ${updated.name}`,
        `<h2 style="margin-top:0;color:#0f1e3c;">Tenant Move-Out</h2>
         <p><strong>${updated.name}</strong> has been marked as moved out.</p>
         <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.95rem;">
           <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Space</td><td><strong>${updated.spaceNumber || '—'}</strong></td></tr>
           <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Move-Out Date</td><td><strong>${b.moveOutDate}</strong></td></tr>
           <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Email</td><td>${updated.email || '—'}</td></tr>
           <tr><td style="padding:5px 12px 5px 0;color:#64748b;">Phone</td><td>${updated.phone || '—'}</td></tr>
         </table>
         <p><a href="https://yardboss-deploy.vercel.app/reservations.html" style="color:#00b4a0;font-weight:600;">View in YardBoss →</a></p>`
      ).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    console.error('[tenants] PATCH /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tenants/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[tenants] DELETE /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
