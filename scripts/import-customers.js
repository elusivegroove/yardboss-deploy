const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/elusi/Downloads/ASSIGNED SPOTS FOR CUSTOMERS_20250401 (1).xlsx');
const ws = wb.Sheets['Sebring Lot '];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return d.toISOString().split('T')[0];
}

function extractEmail(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

function extractPhone(s) {
  if (typeof s !== 'string' && typeof s !== 'number') return null;
  const str = String(s);
  const m = str.match(/[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]?\d{4}/);
  return m ? m[0].trim() : null;
}

function cleanName(s) {
  if (typeof s !== 'string') return '';
  s = s.replace(/-?WANTS AUTO PAY/gi, '');
  s = s.replace(/\s+text\s+\S+.*/gi, '');
  // Remove phone numbers (including formats like -(305) 394-3238)
  s = s.replace(/\s+-?\s*[\(]?\d{3}[\)\-\.\s]?\s?\d{3}[\-\.\s]\d{4}.*/g, '');
  s = s.replace(/\s+\d{10}.*/g, '');
  // Remove emails embedded in name
  s = s.replace(/\s+[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}.*/g, '');
  s = s.replace(/\s+IPR of CO.*/gi, '');
  s = s.replace(/\s+TRUCK PARKING CLUB.*/gi, '');
  s = s.replace(/\s+Truck Parking Club.*/gi, '');
  s = s.replace(/-paid by .*/gi, '');
  s = s.replace(/\s+\d{9,}.*/g, '');
  s = s.replace(/129 Sharon.*/gi, '');
  // Remove long trailing notes (anything after a dash + long text)
  s = s.replace(/\s+-\s+(will|has|spoke|gio|he |she ).*/gi, '');
  return s.trim();
}

function isNoteOnly(nameRaw) {
  const low = nameRaw.toLowerCase();
  if (low.includes('will stop by') || low.includes('spoke to sam') || low.includes('awaiting')) return true;
  // Only skip on length if the CLEANED name is still huge (genuinely a note)
  const cleaned = cleanName(nameRaw);
  return cleaned.length > 50;
}

function toTitleCase(s) {
  return s.replace(/\w\S*/g, function(w) {
    return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase();
  });
}

function detectVehicleType(desc) {
  const d = String(desc).toUpperCase();
  if (d.includes('CAMPER') || d.includes('MOTORHOME')) return 'Class A RV';
  if (d.includes('CAR HAULER')) return 'Other';
  if (d.includes('BOX TRUCK')) return 'Box Truck';
  if (d.includes('TRAVEL TRAILER')) return 'Travel Trailer';
  if (d.includes('TRAILER') && !d.includes('TRUCK')) return 'Travel Trailer';
  if (d.includes('BOAT')) return 'Other';
  if (d.includes('PICKUP') || d.includes('PICK UP') || d.includes('RAM ') || d.includes('RAM\t')) return 'Other';
  return 'Semi Truck';
}

function detectMake(desc) {
  const d = String(desc).toUpperCase();
  if (d.includes('PETERBILT')) return 'Peterbilt';
  if (d.includes('FREIGTHLINER') || d.includes('FREIGHTLINER')) return 'Freightliner';
  if (d.includes('KENWORTH')) return 'Kenworth';
  if (d.includes('VOLVO')) return 'Volvo';
  if (d.includes('INTERNATIONAL')) return 'International';
  if (d.includes('CHEVY') || d.includes('CHEVROLET')) return 'Chevrolet';
  if (d.includes('WHITE TRUCK') || d.includes('WHITE SEMI')) return '';
  if (d.includes('FORD')) return 'Ford';
  if (d.includes('MERCEDES')) return 'Mercedes-Benz';
  if (d.includes('MACK')) return 'Mack';
  return '';
}

function extractPlate(desc) {
  const d = String(desc);
  const m = d.match(/[Pp][Ll]#\s*([A-Z0-9]{4,8})/i)
         || d.match(/[Pp][Ll]ate#\s*([A-Z0-9]{4,8})/i)
         || d.match(/FL PLATE\s+([A-Z0-9]{4,8})/i)
         || d.match(/\bPL#([A-Z0-9]{4,8})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function extractPlateState(allText) {
  const d = String(allText).toUpperCase();
  // Look for explicit state near plate info
  const m = d.match(/([A-Z]{2})\s+(?:PLATE|PL#)/i) || d.match(/Pl#\s*[A-Z0-9]+\s+([A-Z]{2})/i);
  if (m) {
    const valid = ['FL','TX','GA','CA','NY','NC','OH','PA','TN','VA','CO','AZ','LA','OK','WI','IL','IN','MO','MN','NJ'];
    if (valid.includes(m[1])) return m[1];
  }
  return 'FL';
}

function padId(i) { return 't-' + String(i).padStart(3, '0'); }

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map(function(p) { return p[0]; }).join('').toUpperCase().slice(0, 2);
}

const tenants = [];
let idx = 1;

const skipWords = ['stakkly', 'semiyard', 'truck park club', 'rig hut', 'neighbor has been', 'walk in customers', 'will let us know'];

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const spot = row[0];
  const noteCol = String(row[1] || '').trim();
  const nameRaw = String(row[2] || '').trim();
  const contactRaw = String(row[3] || '').trim();
  const companyRaw = String(row[4] || '').trim();
  const mc = String(row[5] || '').trim();
  const dot = String(row[6] || '').trim();
  const dateIn = row[7];
  const dateOut = row[8];

  // Skip non-customer rows
  if (typeof spot !== 'number') continue;
  if (!nameRaw || nameRaw.startsWith('#REF')) continue;
  const nameLow = nameRaw.toLowerCase();
  if (skipWords.some(function(w) { return nameLow.includes(w); })) continue;
  if (isNoteOnly(nameRaw)) continue;

  const wantsAutopay = nameRaw.toUpperCase().includes('AUTO PAY');
  const isRemove = noteCol.toLowerCase().includes('remove') || nameLow.includes('remove');

  const name = cleanName(nameRaw);
  if (!name || name.length < 3) continue;

  const allText = [nameRaw, contactRaw, companyRaw].join(' ');
  const email = extractEmail(contactRaw) || extractEmail(nameRaw) || extractEmail(companyRaw) || '';
  const phone = extractPhone(contactRaw) || extractPhone(nameRaw) || '';

  // Clean company: skip if it's clearly a vehicle description masquerading as company
  let company = companyRaw;
  const compLow = companyRaw.toLowerCase();
  if (compLow.startsWith('white truck') || compLow.startsWith('white ram') || compLow.startsWith('boat') || companyRaw === '') {
    company = '';
  }
  // Also skip if the contact field was used as company (e.g. "WHITE TRUCK WITH CAR HAULER")
  if (!extractEmail(contactRaw) && !extractPhone(contactRaw) && contactRaw.length > 0) {
    // contact was a vehicle description — company might be more useful
  }

  const vDesc = allText;
  const vType = detectVehicleType(vDesc);
  const vMake = detectMake(vDesc);
  const plate = extractPlate(vDesc) || '';
  const plateState = extractPlateState(vDesc);

  const startDate = excelDate(dateIn) || '';
  const endDate = excelDate(dateOut) || '';

  // Determine status based on end date
  const today = new Date('2026-06-01');
  let status = 'active';
  if (isRemove) {
    status = 'past';
  } else if (endDate && new Date(endDate) < today) {
    // Lease technically expired but they're real customers — keep active
    status = 'active';
  }

  tenants.push({
    id: padId(idx++),
    name: toTitleCase(name),
    initials: initials(name),
    email: email,
    phone: phone,
    company: company,
    lotId: 'lot-1',
    spaceNumber: String(spot),
    monthlyRate: 0,
    startDate: startDate,
    endDate: endDate,
    status: status,
    registrationStatus: 'verified',
    vehicle: {
      make: vMake,
      model: '',
      year: null,
      plate: plate,
      type: vType
    },
    plateState: plateState,
    truckNumber: (mc && mc.length > 0 && mc.length < 12) ? mc : null,
    trailerNumber: null,
    insuranceDoc: null,
    insurancePolicyNumber: null,
    insuranceCompany: null,
    insuranceExpDate: null,
    autoRenew: false,
    renewalPeriod: 'monthly',
    renewalRate: null,
    paymentMethod: wantsAutopay ? 'autopay' : 'manual',
    autopayCard: null,
    autopayNextDate: null,
    payments: []
  });
}

process.stderr.write('Total tenants imported: ' + tenants.length + '\n');
console.log(JSON.stringify(tenants, null, 2));
