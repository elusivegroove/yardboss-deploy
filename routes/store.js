/**
 * In-memory data store — mirrors data.js for the backend.
 * When Railway + PostgreSQL are wired up, replace these with DB queries.
 */

const lots = [
  {
    id: 'lot-1',
    name: 'TransVega RV and Truck Center',
    address: '7406 HWY 27 North',
    city: 'Sebring', state: 'FL', zip: '33870',
    totalSpaces: 140,
    status: 'active',
    amenities: ['24/7 Gated Access', 'Security Cameras', 'Full Hookups (30/50 Amp)', 'Water & Sewer', 'WiFi Available', 'Dump Station', 'Truck Wash Bay', 'Restrooms', 'Laundry', 'On-Site Manager', 'Paved Surfaces', 'Lighting'],
    spaceTypes: ['RV Space', 'Semi Truck', 'Box Truck', 'Fifth Wheel'],
    monthlyRates: { 'RV Space': 350, 'Semi Truck': 425, 'Box Truck': 375, 'Fifth Wheel': 325 },
    image: 'https://placehold.co/600x300/0f1e3c/00b4a0?text=TransVega+RV+%26+Truck+Center',
  },
];

// In-memory reservations store
const reservations = [
  {
    id: 'res-001', lotId: 'lot-1', spaceNumber: 'T-01', spaceType: 'Semi Truck',
    tenantName: 'Carlos Mendez', email: 'carlos@sunstatefreight.com', phone: '(863) 555-0101',
    company: 'Sun State Freight LLC', vehicleMake: 'Kenworth', vehicleModel: 'T680',
    vehicleYear: 2022, vehiclePlate: 'FL-KW8821',
    startDate: '2024-01-15', endDate: '2025-01-14', monthlyRate: 425,
    status: 'active', paymentStatus: 'current',
    stripeCustomerId: null, stripeSubscriptionId: null,
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'res-002', lotId: 'lot-1', spaceNumber: 'R-05', spaceType: 'Class A RV',
    tenantName: 'Barbara Simmons', email: 'bsimmons@gmail.com', phone: '(863) 555-0112',
    company: '', vehicleMake: 'Tiffin', vehicleModel: 'Allegro Bus 45OPP',
    vehicleYear: 2019, vehiclePlate: 'FL-RV2291',
    startDate: '2024-03-01', endDate: '2025-02-28', monthlyRate: 350,
    status: 'active', paymentStatus: 'current',
    stripeCustomerId: null, stripeSubscriptionId: null,
    createdAt: '2024-02-20T09:00:00Z',
  },
];

let nextResId = reservations.length + 1;

function genResId() {
  return `res-${String(nextResId++).padStart(3, '0')}`;
}

module.exports = { lots, reservations, genResId };
