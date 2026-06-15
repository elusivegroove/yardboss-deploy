/**
 * YardBoss — Database Migration & Seed
 * Creates tables and seeds initial data. Idempotent (safe to re-run).
 */

const db = require('../db');

async function runMigrations() {
  // ── Create dev_items table (Dev Tracker — shared across admin + beta users) ─
  await db.query(`
    CREATE TABLE IF NOT EXISTS dev_items (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      type         TEXT DEFAULT 'feature',
      priority     TEXT DEFAULT 'medium',
      status       TEXT DEFAULT 'pending',
      description  TEXT,
      tags         JSONB DEFAULT '[]',
      notes        TEXT,
      source       TEXT DEFAULT 'admin',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Create branding table (Settings → Branding — logo + primary color) ────
  await db.query(`
    CREATE TABLE IF NOT EXISTS branding (
      id            INT PRIMARY KEY DEFAULT 1,
      logo_url      TEXT,
      primary_color TEXT
    )
  `);

  // ── Create app_settings table (Settings → Gate Code) ─────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id                   INT PRIMARY KEY DEFAULT 1,
      gate_code            TEXT,
      gate_code_updated_at TIMESTAMPTZ
    )
  `);

  // ── Create lots table ─────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS lots (
      id             TEXT PRIMARY KEY,
      name           TEXT,
      address        TEXT,
      city           TEXT,
      state          TEXT,
      zip            TEXT,
      total_spaces   INT,
      status         TEXT,
      amenities      JSONB,
      space_types    JSONB,
      monthly_rates  JSONB,
      pricing_plans  JSONB,
      image          TEXT
    )
  `);

  // ── Lot columns (idempotent for pre-existing tables) ─────────────────────
  await db.query(`ALTER TABLE lots ADD COLUMN IF NOT EXISTS pricing_plans JSONB`);

  // ── Create tenants table ──────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id                      TEXT PRIMARY KEY,
      lot_id                  TEXT,
      name                    TEXT,
      email                   TEXT,
      phone                   TEXT,
      company                 TEXT,
      space_number            TEXT,
      monthly_rate            NUMERIC,
      start_date              DATE,
      end_date                DATE,
      status                  TEXT,
      registration_status     TEXT,
      vehicle                 JSONB,
      plate_state             TEXT,
      truck_number            TEXT,
      trailer_number          TEXT,
      insurance_doc           JSONB,
      insurance_policy_number TEXT,
      insurance_company       TEXT,
      insurance_exp_date      DATE,
      auto_renew              BOOLEAN,
      renewal_period          TEXT,
      renewal_rate            NUMERIC,
      payment_method          TEXT,
      autopay_card            TEXT,
      autopay_next_date       DATE,
      payments                JSONB DEFAULT '[]',
      price_locked            BOOLEAN DEFAULT false,
      move_out_date           DATE,
      rejection_reason        TEXT,
      additional_drivers      JSONB DEFAULT '[]',
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Tenant lifecycle columns (idempotent for pre-existing tables) ────────
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT false`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS move_out_date DATE`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS additional_drivers JSONB DEFAULT '[]'`);

  // ── Parking expiration / renewal tracking columns ────────────────────────
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS due_date DATE`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'current'`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rate_type TEXT DEFAULT 'monthly'`);
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ`);

  // ── Multi-space reservations: additional space numbers beyond the primary one ──
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS additional_spaces JSONB DEFAULT '[]'`);

  // ── Late fee exemption (per-tenant opt-out of the monthly late fee job) ──
  await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS late_fee_exempt BOOLEAN DEFAULT false`);

  console.log('[migrate] Tables ready.');

  // ── Default pricing plans (Semi Truck + RV) ──────────────────────────────
  const defaultPricingPlans = {
    'Semi Truck': [
      { id: 'semi-daily',   label: 'Daily',   price: 30.00,  unit: 'day',   qty: 1 },
      { id: 'semi-weekly',  label: 'Weekly',  price: 95.00,  unit: 'week',  qty: 1 },
      { id: 'semi-monthly', label: 'Monthly', price: 180.00, unit: 'month', qty: 1 }
    ],
    'RV': [
      { id: 'rv-1mo', label: '1 Month',  price: 100.00, unit: 'month', qty: 1 },
      { id: 'rv-3mo', label: '3 Months', price: 275.00, unit: 'month', qty: 3 },
      { id: 'rv-6mo', label: '6 Months', price: 550.00, unit: 'month', qty: 6 },
      { id: 'rv-1yr', label: '1 Year',   price: 985.00, unit: 'month', qty: 12 }
    ]
  };

  // ── Seed lot ──────────────────────────────────────────────────────────────
  await db.query(`
    INSERT INTO lots (id, name, address, city, state, zip, total_spaces, status, amenities, space_types, monthly_rates, pricing_plans, image)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO NOTHING
  `, [
    'lot-1',
    'TransVega RV and Truck Center',
    '7406 HWY 27 North',
    'Sebring', 'FL', '33870',
    140,
    'active',
    JSON.stringify(['24/7 Gated Access','Security Cameras','Full Hookups (30/50 Amp)','Water & Sewer','WiFi Available','Dump Station','Truck Wash Bay','On-Site Manager','Paved Surfaces','Lighting']),
    JSON.stringify(['Class A RV','Class B/C RV','Travel Trailer','Fifth Wheel','Semi-Truck','Box Truck']),
    JSON.stringify({'Class A RV':220,'Class B/C RV':175,'Travel Trailer':165,'Fifth Wheel':190,'Semi-Truck':295,'Box Truck':225}),
    JSON.stringify(defaultPricingPlans),
    null
  ]);

  // Backfill pricing_plans for rows that existed before this column/feature was added.
  await db.query(`UPDATE lots SET pricing_plans = $1 WHERE pricing_plans IS NULL`, [JSON.stringify(defaultPricingPlans)]);

  // ── Seed tenants ──────────────────────────────────────────────────────────
  const tenants = [
    { id:'t-001', name:'Hilbert Garzia', initials:'HG', email:'hilbertgarza98@gmail.com', phone:'', company:'DURABLE EXPRESS BLACK', lotId:'lot-1', spaceNumber:'6', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-002', name:'Victor Simon', initials:'VS', email:'247avenuex@gmail.com', phone:'', company:'Avenue Express  #1974 White Trailer', lotId:'lot-1', spaceNumber:'7', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Travel Trailer'}, plateState:'FL', truckNumber:'125563', trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-003', name:'Todd Tucker', initials:'TT', email:'toddrtucker@hotmail.com', phone:'', company:'SCHNEIDER # 89322', lotId:'lot-1', spaceNumber:'8', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:'133655', trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-004', name:'Ivory Hunter', initials:'IH', email:'fattdaddytrucking@yahoo.com', phone:'', company:'FATT DADDY #041 Pl# JB95CN FL PETERBILT', lotId:'lot-1', spaceNumber:'9', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'Peterbilt',model:'',year:null,plate:'JB95CN',type:'Semi Truck'}, plateState:'FL', truckNumber:'676680', trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-006', name:'Luis Moyano', initials:'LM', email:'', phone:'', company:'#13 HORA EXPRESS RED -Trailer', lotId:'lot-1', spaceNumber:'11', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Travel Trailer'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-008', name:'Urban Paul', initials:'UP', email:'', phone:'', company:'WHITE Trailer', lotId:'lot-1', spaceNumber:'13', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Travel Trailer'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-010', name:'Yosbany Hernandez Aquino', initials:'YH', email:'yosbany2005@gmail.com', phone:'3057937401', company:'SABEL TRUCKING', lotId:'lot-1', spaceNumber:'15', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'autopay', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-012', name:'Ray Redmon', initials:'RR', email:'', phone:'', company:'', lotId:'lot-1', spaceNumber:'17', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-014', name:'Giovanni Arrindell', initials:'GA', email:'carxpofl@gmail.com', phone:'', company:'ONE GLOBAL LLC CAR HAULERS', lotId:'lot-1', spaceNumber:'19', monthlyRate:0, startDate:'2026-03-01', endDate:'2026-03-31', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Other'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-019', name:'Lea Hardewijk', initials:'LH', email:'', phone:'', company:'', lotId:'lot-1', spaceNumber:'24', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-020', name:'Tom Gallagher', initials:'TG', email:'', phone:'', company:'box truck(ice cream truck)  Shipping Container', lotId:'lot-1', spaceNumber:'25', monthlyRate:0, startDate:'2025-11-01', endDate:'2026-06-30', status:'past', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Box Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-021', name:'Bradley Hunter', initials:'BH', email:'', phone:'954-465-3020', company:'', lotId:'lot-1', spaceNumber:'26', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Travel Trailer'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-022', name:'Joe Penn', initials:'JP', email:'joe@iprlogistics.com', phone:'225-937-4716', company:'RED #4248 - Clean & Take Pics for sale', lotId:'lot-1', spaceNumber:'27', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-023', name:'David Perez', initials:'DP', email:'davidrogue79@aol.com', phone:'(305) 394-3238', company:'Werner Enterprises', lotId:'lot-1', spaceNumber:'28', monthlyRate:0, startDate:'2026-03-01', endDate:'2026-03-31', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:'00138328', trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-024', name:'Caden Byroadsn', initials:'CB', email:'', phone:'', company:'18ft truck 2008 black ford 250', lotId:'lot-1', spaceNumber:'29', monthlyRate:0, startDate:'2026-02-11', endDate:'2026-03-11', status:'active', registrationStatus:'verified', vehicle:{make:'Ford',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-025', name:'Daniel Oramas', initials:'DO', email:'oramasdaniel90@gmail.com', phone:'8636776726', company:'Panthers Trucking Service orange freightliner Pl#66AKRP FL SILVER TRAILER Brown Pick up Truck Pl# RKZI72', lotId:'lot-1', spaceNumber:'30', monthlyRate:0, startDate:'2026-01-01', endDate:'2026-01-31', status:'past', registrationStatus:'verified', vehicle:{make:'Freightliner',model:'',year:null,plate:'66AKRP',type:'Other'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-026', name:'Osmar Payan', initials:'OP', email:'osmarpayan@yahoo.com', phone:'8632572491', company:'FL Black Ram', lotId:'lot-1', spaceNumber:'31', monthlyRate:0, startDate:'2026-03-01', endDate:'2026-03-31', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-027', name:'Zach Peccarina', initials:'ZP', email:'zachpecarina@gmail.com', phone:'', company:'white Camper', lotId:'lot-1', spaceNumber:'32', monthlyRate:0, startDate:'2026-04-01', endDate:'2026-04-30', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Class A RV'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-028', name:'Inocles T', initials:'IT', email:'', phone:'', company:'CHEVY 3500 HD TRUCK AND TRAILER  Trazil Family Transport LLC  Plate# REMR07', lotId:'lot-1', spaceNumber:'33', monthlyRate:0, startDate:'2026-03-01', endDate:'2026-03-31', status:'active', registrationStatus:'verified', vehicle:{make:'Chevrolet',model:'',year:null,plate:'REMR07',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-029', name:'Mary P', initials:'MP', email:'', phone:'', company:'trailer sold', lotId:'lot-1', spaceNumber:'34', monthlyRate:0, startDate:'2026-03-01', endDate:'2026-03-31', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:null, trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
    { id:'t-030', name:'Aylisa Davis', initials:'AD', email:'', phone:'', company:'LEGACY GROUP  white truck for sale', lotId:'lot-1', spaceNumber:'35', monthlyRate:0, startDate:'2026-02-27', endDate:'2026-03-27', status:'active', registrationStatus:'verified', vehicle:{make:'',model:'',year:null,plate:'',type:'Semi Truck'}, plateState:'FL', truckNumber:'1520235', trailerNumber:null, insuranceDoc:null, insurancePolicyNumber:null, insuranceCompany:null, insuranceExpDate:null, autoRenew:false, renewalPeriod:'monthly', renewalRate:null, paymentMethod:'manual', autopayCard:null, autopayNextDate:null, payments:[] },
  ];

  for (const t of tenants) {
    await db.query(`
      INSERT INTO tenants (
        id, lot_id, name, email, phone, company, space_number, monthly_rate,
        start_date, end_date, status, registration_status, vehicle, plate_state,
        truck_number, trailer_number, insurance_doc, insurance_policy_number,
        insurance_company, insurance_exp_date, auto_renew, renewal_period,
        renewal_rate, payment_method, autopay_card, autopay_next_date, payments
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,
        $23,$24,$25,$26,$27
      ) ON CONFLICT (id) DO NOTHING
    `, [
      t.id, t.lotId, t.name, t.email, t.phone, t.company, t.spaceNumber, t.monthlyRate,
      t.startDate || null, t.endDate || null, t.status, t.registrationStatus,
      JSON.stringify(t.vehicle), t.plateState,
      t.truckNumber || null, t.trailerNumber || null,
      t.insuranceDoc ? JSON.stringify(t.insuranceDoc) : null,
      t.insurancePolicyNumber || null,
      t.insuranceCompany || null,
      t.insuranceExpDate || null,
      t.autoRenew || false,
      t.renewalPeriod || null,
      t.renewalRate || null,
      t.paymentMethod || 'manual',
      t.autopayCard || null,
      t.autopayNextDate || null,
      JSON.stringify(t.payments || [])
    ]);
  }

  console.log('[migrate] Seeded ' + tenants.length + ' tenants.');

  // Backfill due_date for rows that don't have one yet — use end_date if set,
  // else start_date + 1 month. Run after seeding so newly-seeded rows are included.
  await db.query(`
    UPDATE tenants
    SET due_date = COALESCE(end_date, (start_date + INTERVAL '1 month')::date)
    WHERE due_date IS NULL AND (end_date IS NOT NULL OR start_date IS NOT NULL)
  `);

  console.log('[migrate] Backfilled due_date.');
}

module.exports = { runMigrations };

// Allow running directly: node scripts/migrate.js
if (require.main === module) {
  require('dotenv').config({ path: '../.env.production' });
  runMigrations()
    .then(() => { console.log('[migrate] Done.'); process.exit(0); })
    .catch(err => { console.error('[migrate] Error:', err); process.exit(1); });
}
