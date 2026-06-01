// YardBoss — Seed Data  |  TransVega RV and Truck Center, Sebring FL

const APP_DATA = {
  owner: {
    name: 'Toby Herndon',
    initials: 'TH',
    email: 'toby@transvegalogistics.com',
    phone: '(863) 441-3444',
    address: '7406 HWY 27 North, Sebring, FL 33870',
    businessName: 'TransVega Logistics LLC'
  },

  lots: [
    {
      id: 'lot-1',
      name: 'TransVega RV and Truck Center',
      address: '7406 HWY 27 North',
      city: 'Sebring', state: 'FL', zip: '33870',
      totalSpaces: 140,
      status: 'active',
      amenities: [
        '24/7 Gated Access','Security Cameras','Full Hookups (30/50 Amp)',
        'Water & Sewer','WiFi Available','Dump Station','Truck Wash Bay',
        'On-Site Manager','Paved Surfaces','Lighting'
      ],
      spaceTypes: ['Class A RV','Class B/C RV','Travel Trailer','Fifth Wheel','Semi-Truck','Box Truck'],
      monthlyRates: {
        'Class A RV': 220,'Class B/C RV': 175,'Travel Trailer': 165,
        'Fifth Wheel': 190,'Semi-Truck': 295,'Box Truck': 225
      },
      image: null
    }
  ],

  tenants: [
    {
      id: 't-001', name: 'Bobby Tran', initials: 'BT',
      email: 'bobby.tran@transfleetfl.com', phone: '(863) 555-0201',
      company: 'Trans Fleet Florida LLC', lotId: 'lot-1', spaceNumber: 'T-08',
      monthlyRate: 295, startDate: '2024-01-10', endDate: '2025-01-09',
      status: 'active', registrationStatus: 'verified',
      truckNumber: 'TK-2281', trailerNumber: 'TR-4411', plateState: 'FL',
      vehicle: { make: 'Kenworth', model: 'T680', year: 2022, plate: 'FL-KW8821', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: 'POL-4421882', insuranceCompany: 'Progressive Commercial', insuranceExpDate: '2025-12-31',
      autoRenew: true, renewalPeriod: 'monthly', renewalRate: 295,
      paymentMethod: 'autopay', autopayCard: '4242', autopayNextDate: '2025-02-01',
      payments: [
        { date: '2024-12-01', amount: 295, status: 'paid', method: 'autopay' },
        { date: '2024-11-01', amount: 295, status: 'paid', method: 'autopay' },
        { date: '2024-10-01', amount: 295, status: 'paid', method: 'autopay' }
      ]
    },
    {
      id: 't-002', name: 'Linda Marsh', initials: 'LM',
      email: 'linda.marsh@suncoastrvs.com', phone: '(863) 555-0312',
      company: 'Suncoast RV Rentals', lotId: 'lot-1', spaceNumber: 'R-14',
      monthlyRate: 220, startDate: '2024-03-01', endDate: '2025-02-28',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Tiffin', model: 'Allegro Bus 45', year: 2021, plate: 'FL-RV4492', type: 'Class A RV' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: true, renewalPeriod: 'monthly', renewalRate: 220,
      paymentMethod: 'autopay', autopayCard: '9834', autopayNextDate: '2025-03-01',
      payments: [
        { date: '2024-12-01', amount: 220, status: 'paid', method: 'autopay' },
        { date: '2024-11-01', amount: 220, status: 'paid', method: 'autopay' },
        { date: '2024-10-01', amount: 220, status: 'late',  method: 'manual' }
      ]
    },
    {
      id: 't-003', name: 'Carlos Vega', initials: 'CV',
      email: 'c.vega@vegafreight.com', phone: '(863) 555-0423',
      company: 'Vega Freight Inc', lotId: 'lot-1', spaceNumber: 'T-21',
      monthlyRate: 295, startDate: '2024-02-15', endDate: '2025-02-14',
      status: 'active', registrationStatus: 'verified',
      truckNumber: 'VF-0991', trailerNumber: 'VF-TR-223', plateState: 'FL',
      vehicle: { make: 'Peterbilt', model: '579', year: 2020, plate: 'FL-PT7741', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: true, renewalPeriod: 'monthly', renewalRate: 295,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 295, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-004', name: 'Diane Kowalczyk', initials: 'DK',
      email: 'diane.k@highlands-rv.com', phone: '(863) 555-0534',
      company: 'Highlands RV Park', lotId: 'lot-1', spaceNumber: 'R-07',
      monthlyRate: 165, startDate: '2024-04-01', endDate: '2025-03-31',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Forest River', model: 'Wildwood 36', year: 2019, plate: 'FL-TT2234', type: 'Travel Trailer' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 165, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 165, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 165, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-005', name: 'Raymond Okafor', initials: 'RO',
      email: 'r.okafor@fastlanefl.com', phone: '(863) 555-0645',
      company: 'Fast Lane Logistics FL', lotId: 'lot-1', spaceNumber: 'T-35',
      monthlyRate: 295, startDate: '2023-11-01', endDate: '2024-10-31',
      status: 'active', registrationStatus: 'pending',
      truckNumber: 'FL-1002', trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Freightliner', model: 'Cascadia', year: 2023, plate: 'FL-FC9912', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 295, status: 'overdue', method: 'manual' },
        { date: '2024-11-01', amount: 295, status: 'overdue', method: 'manual' },
        { date: '2024-10-01', amount: 295, status: 'paid',    method: 'manual' }
      ]
    },
    {
      id: 't-006', name: 'Patrice Guillaume', initials: 'PG',
      email: 'patrice.g@sunflower-rv.com', phone: '(863) 555-0756',
      company: 'Sunflower RV Adventures', lotId: 'lot-1', spaceNumber: 'R-22',
      monthlyRate: 190, startDate: '2024-05-01', endDate: '2025-04-30',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Grand Design', model: 'Reflection 315RLTS', year: 2022, plate: 'FL-FW5577', type: 'Fifth Wheel' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 190, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 190, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 190, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-007', name: 'Mike Santini', initials: 'MS',
      email: 'm.santini@santinidist.com', phone: '(863) 555-0867',
      company: 'Santini Distribution Co', lotId: 'lot-1', spaceNumber: 'T-44',
      monthlyRate: 225, startDate: '2024-06-01', endDate: '2025-05-31',
      status: 'active', registrationStatus: 'verified',
      truckNumber: 'SD-0044', trailerNumber: 'SD-TR-044', plateState: 'FL',
      vehicle: { make: 'Isuzu', model: 'NPR-HD', year: 2021, plate: 'FL-BX3312', type: 'Box Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 225, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 225, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 225, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-008', name: 'Angela Reyes', initials: 'AR',
      email: 'a.reyes@highlands-living.com', phone: '(863) 555-0978',
      company: 'Highlands RV Living', lotId: 'lot-1', spaceNumber: 'R-31',
      monthlyRate: 175, startDate: '2024-07-01', endDate: '2025-06-30',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Coachmen', model: 'Freelander 22XG', year: 2020, plate: 'FL-CV8821', type: 'Class B/C RV' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 175, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 175, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 175, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-009', name: 'Jerome Whitfield', initials: 'JW',
      email: 'j.whitfield@whitfield-hauling.com', phone: '(863) 555-1089',
      company: 'Whitfield Hauling LLC', lotId: 'lot-1', spaceNumber: 'T-52',
      monthlyRate: 295, startDate: '2024-01-01', endDate: '2024-12-31',
      status: 'active', registrationStatus: 'verified',
      truckNumber: 'WH-5200', trailerNumber: 'WH-TR-52', plateState: 'FL',
      vehicle: { make: 'Mack', model: 'Anthem 64T', year: 2022, plate: 'FL-MK2291', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: true, renewalPeriod: 'monthly', renewalRate: 295,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 295, status: 'late',  method: 'manual' }
      ]
    },
    {
      id: 't-010', name: 'Susan Delacroix', initials: 'SD',
      email: 's.delacroix@lake-rv.com', phone: '(863) 555-1190',
      company: 'Lake Placid RV Co', lotId: 'lot-1', spaceNumber: 'R-41',
      monthlyRate: 220, startDate: '2024-02-01', endDate: '2025-01-31',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Newmar', model: 'Dutch Star 4318', year: 2023, plate: 'FL-RV9912', type: 'Class A RV' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 220, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 220, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 220, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-011', name: 'Darnell Preston', initials: 'DP',
      email: 'd.preston@prestonexpress.com', phone: '(863) 555-1201',
      company: 'Preston Express LLC', lotId: 'lot-1', spaceNumber: 'T-60',
      monthlyRate: 295, startDate: '2024-03-15', endDate: '2025-03-14',
      status: 'active', registrationStatus: 'pending',
      truckNumber: 'PE-6001', trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Volvo', model: 'VNL 860', year: 2022, plate: 'FL-VL8812', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 295, status: 'overdue', method: 'manual' },
        { date: '2024-11-01', amount: 295, status: 'paid',    method: 'manual' },
        { date: '2024-10-01', amount: 295, status: 'paid',    method: 'manual' }
      ]
    },
    {
      id: 't-012', name: 'Tanya Simmons', initials: 'TS',
      email: 't.simmons@nomadfl.com', phone: '(863) 555-1312',
      company: 'Nomad Florida LLC', lotId: 'lot-1', spaceNumber: 'R-55',
      monthlyRate: 190, startDate: '2024-08-01', endDate: '2025-07-31',
      status: 'active', registrationStatus: 'verified',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Keystone', model: 'Montana 3855BR', year: 2021, plate: 'FL-FW3321', type: 'Fifth Wheel' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2024-12-01', amount: 190, status: 'paid', method: 'manual' },
        { date: '2024-11-01', amount: 190, status: 'paid', method: 'manual' },
        { date: '2024-10-01', amount: 190, status: 'paid', method: 'manual' }
      ]
    },
    {
      id: 't-013', name: 'Marcus Flores', initials: 'MF',
      email: 'm.flores@floreslogix.com', phone: '(863) 555-1423',
      company: 'Flores Logix', lotId: 'lot-1', spaceNumber: 'T-67',
      monthlyRate: 295, startDate: '2025-01-15', endDate: '2026-01-14',
      status: 'pending', registrationStatus: 'pending',
      truckNumber: 'FL-6700', trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'International', model: 'LT Series', year: 2022, plate: 'FL-IL4421', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: []
    },
    {
      id: 't-014', name: 'Rhonda Carter', initials: 'RC',
      email: 'rhonda.carter@sebringretire.com', phone: '(863) 555-1534',
      company: 'Sebring Retirement RV', lotId: 'lot-1', spaceNumber: 'R-62',
      monthlyRate: 165, startDate: '2025-02-01', endDate: '2026-01-31',
      status: 'pending', registrationStatus: 'pending',
      truckNumber: null, trailerNumber: null, plateState: 'FL',
      vehicle: { make: 'Thor Motor', model: 'ACE 30.3', year: 2023, plate: 'FL-CV7744', type: 'Class B/C RV' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: []
    },
    {
      id: 't-015', name: 'Greg Hutchins', initials: 'GH',
      email: 'g.hutchins@hutchhaul.com', phone: '(863) 555-1645',
      company: 'Hutch Haul Transport', lotId: 'lot-1', spaceNumber: 'T-15',
      monthlyRate: 295, startDate: '2023-01-01', endDate: '2023-12-31',
      status: 'past', registrationStatus: 'verified',
      truckNumber: 'HH-1500', trailerNumber: 'HH-TR-15', plateState: 'FL',
      vehicle: { make: 'Western Star', model: '4900SF', year: 2019, plate: 'FL-WS5511', type: 'Semi-Truck' },
      insuranceDoc: null, insurancePolicyNumber: null, insuranceCompany: null, insuranceExpDate: null,
      autoRenew: false, renewalPeriod: 'monthly', renewalRate: null,
      paymentMethod: 'manual', autopayCard: null, autopayNextDate: null,
      payments: [
        { date: '2023-12-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2023-11-01', amount: 295, status: 'paid', method: 'manual' },
        { date: '2023-10-01', amount: 295, status: 'paid', method: 'manual' }
      ]
    }
  ],

  revenue: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    'lot-1': [22400,23800,25100,26400,28200,30100,31400,30800,29100,27600,26200,28900]
  },

  avgRates: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    'lot-1': [218,221,225,229,234,239,242,239,233,228,224,230]
  },

  occupancy: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    'lot-1': {
      moveIns:  [6,5,7,8,9,11,10,8,7,6,5,7],
      moveOuts: [3,3,4,4,5, 6, 7,5,4,4,3,4]
    }
  },

  gates: [
    { id: 'gate-001', gateId: 'GTE-001', lotId: 'lot-1', gateName: 'Main Entrance',  deviceId: 'DEV-TVG-001', status: 'online', lastPing: new Date(Date.now() - 2*60000).toISOString() },
    { id: 'gate-002', gateId: 'GTE-002', lotId: 'lot-1', gateName: 'Rear Exit Gate', deviceId: 'DEV-TVG-002', status: 'online', lastPing: new Date(Date.now() - 7*60000).toISOString() }
  ],

  upcomingReservations: [
    { tenantId: 't-013', lotId: 'lot-1', space: 'T-67', startDate: '2025-01-15', endDate: '2026-01-14', amount: 295, status: 'pending'  },
    { tenantId: 't-014', lotId: 'lot-1', space: 'R-62', startDate: '2025-02-01', endDate: '2026-01-31', amount: 165, status: 'pending'  },
    { tenantId: 't-001', lotId: 'lot-1', space: 'T-08', startDate: '2025-01-10', endDate: '2026-01-09', amount: 295, status: 'renewal'  },
    { tenantId: 't-009', lotId: 'lot-1', space: 'T-52', startDate: '2025-01-01', endDate: '2025-12-31', amount: 295, status: 'renewal'  },
    { tenantId: 't-002', lotId: 'lot-1', space: 'R-14', startDate: '2025-03-01', endDate: '2026-02-28', amount: 220, status: 'confirmed' },
    { tenantId: 't-006', lotId: 'lot-1', space: 'R-22', startDate: '2025-05-01', endDate: '2026-04-30', amount: 190, status: 'confirmed' }
  ]
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLot(id) { return APP_DATA.lots.find(function(l){ return l.id===id; }); }
function getLotName(id) { var l=getLot(id); return l?l.name:'—'; }
function getTenant(id) { return APP_DATA.tenants.find(function(t){ return t.id===id; }); }

function formatCurrency(n) {
  if (n==null||isNaN(n)) return '$0';
  return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
}
function formatDate(str) {
  if (!str) return '—';
  var d=new Date(str+'T00:00:00');
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function timeAgo(iso) {
  if (!iso) return '—';
  var diff=Date.now()-new Date(iso).getTime(), mins=Math.floor(diff/60000);
  if (mins<1) return 'Just now';
  if (mins<60) return mins+'m ago';
  var hrs=Math.floor(mins/60);
  if (hrs<24) return hrs+'h ago';
  return Math.floor(hrs/24)+'d ago';
}

// ── Auto-Renewal Check ────────────────────────────────────────────────────────
// Returns tenants with autoRenew=true whose lease ends within 7 days (or already ended).
function checkAutoRenewals() {
  var today = new Date();
  today.setHours(0,0,0,0);
  var in7 = new Date(today.getTime() + 7*24*60*60*1000);
  return APP_DATA.tenants.filter(function(t) {
    if (!t.autoRenew || t.status === 'past' || t.status === 'cancelled') return false;
    if (!t.endDate) return false;
    var end = new Date(t.endDate+'T00:00:00');
    return end <= in7;
  });
}

// ── Renew Tenant Lease ────────────────────────────────────────────────────────
function renewTenantLease(tenantId) {
  var t = getTenant(tenantId);
  if (!t || !t.endDate) return null;
  var end = new Date(t.endDate+'T00:00:00');
  var newEnd = new Date(end);
  switch (t.renewalPeriod) {
    case 'weekly':    newEnd.setDate(end.getDate() + 7);     break;
    case 'quarterly': newEnd.setMonth(end.getMonth() + 3);   break;
    case 'annually':  newEnd.setFullYear(end.getFullYear()+1); break;
    default:          newEnd.setMonth(end.getMonth() + 1);   break; // monthly
  }
  t.endDate = newEnd.toISOString().split('T')[0];
  var rate = t.renewalRate || t.monthlyRate;
  var today = new Date().toISOString().split('T')[0];
  t.payments.unshift({ date: today, amount: rate, status: 'paid', method: t.paymentMethod === 'autopay' ? 'autopay' : 'manual' });
  return t;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  type = type||'success';
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  var colors={success:'#10b981',error:'#ef4444',warning:'#f59e0b',info:'#3b82f6'};
  var icons={success:'fa-check-circle',error:'fa-times-circle',warning:'fa-exclamation-triangle',info:'fa-info-circle'};
  var toast=document.createElement('div');
  toast.style.cssText='pointer-events:all;display:flex;align-items:center;gap:10px;background:white;border-left:4px solid '+(colors[type]||colors.success)+';border-radius:8px;padding:12px 18px;box-shadow:0 4px 20px rgba(0,0,0,0.15);font-size:0.875rem;font-family:Inter,sans-serif;color:#334155;min-width:260px;max-width:380px;transform:translateX(120%);transition:transform 0.3s ease;';
  toast.innerHTML='<i class="fas '+(icons[type]||icons.success)+'" style="color:'+(colors[type]||colors.success)+';flex-shrink:0;font-size:1rem;"></i><span>'+msg+'</span>';
  container.appendChild(toast);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ toast.style.transform='translateX(0)'; }); });
  setTimeout(function(){
    toast.style.transform='translateX(120%)';
    setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); },300);
  },3500);
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportToCSV(headers, rows, filename) {
  var esc=function(v){ var s=String(v==null?'':v); return (s.includes(',')||s.includes('"')||s.includes('\n'))?'"'+s.replace(/"/g,'""')+'"':s; };
  var csv=[headers.map(esc).join(',')].concat(rows.map(function(r){ return r.map(esc).join(','); })).join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download=filename||'yardboss-export.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloaded: '+(filename||'export.csv'),'success');
}

function generateId(prefix) {
  return (prefix||'id')+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
}
