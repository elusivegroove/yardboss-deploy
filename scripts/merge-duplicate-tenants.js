/**
 * YardBoss — One-time duplicate tenant merge
 *
 * Consolidates tenants that were re-added once per parking space (legacy
 * workflow) into a single profile using the existing `additionalSpaces`
 * multi-space feature.
 *
 * Groups (confirmed with Toby 2026-06-15):
 *   - Ivory Hunter:       primary t-004 (space 9)  <- merge t-005 (space 10)
 *   - Giovanni Arrindell: primary t-014 (space 19) <- merge t-007, t-009,
 *                         t-011, t-013, t-015, t-016, t-017, t-018
 *                         (spaces 12, 14, 16, 18, 20, 21, 22, 23)
 *
 * For the primary record:
 *   - additionalSpaces = union of every merged record's spaceNumber +
 *     existing additionalSpaces, sorted numerically.
 *   - payments arrays are concatenated and sorted by date.
 *   - monthlyRate / renewalRate are summed across all merged records
 *     (renewalRate falls back to monthlyRate per-record when only one
 *     of the two is set, so the combined renewal rate covers all spaces).
 *   - Any blank/null scalar or vehicle field on the primary is backfilled
 *     from a merged record that has a value.
 * Merged (non-primary) records are deleted after being folded in.
 *
 * Usage:
 *   node scripts/merge-duplicate-tenants.js            (dry run, no writes)
 *   node scripts/merge-duplicate-tenants.js --apply    (writes + deletes)
 */

const db = require('../db');

const MERGE_GROUPS = [
  { primary: 't-004', merge: ['t-005'] },
  { primary: 't-014', merge: ['t-007', 't-009', 't-011', 't-013', 't-015', 't-016', 't-017', 't-018'] },
];

const SCALAR_BACKFILL_FIELDS = [
  'email', 'phone', 'company', 'plate_state', 'truck_number', 'trailer_number',
  'insurance_policy_number', 'insurance_company', 'insurance_exp_date',
  'insurance_doc', 'autopay_card', 'autopay_next_date', 'due_date', 'move_out_date',
];

const VEHICLE_SUBFIELDS = ['make', 'model', 'year', 'plate', 'type'];

function spaceSort(a, b) {
  const na = Number(a), nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

function effectiveRate(row) {
  const monthly = row.monthly_rate != null ? parseFloat(row.monthly_rate) : 0;
  const renewal = row.renewal_rate != null ? parseFloat(row.renewal_rate) : null;
  return { monthly, renewal };
}

async function loadTenant(id) {
  const res = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
  if (!res.rows.length) throw new Error(`Tenant ${id} not found`);
  return res.rows[0];
}

async function buildMergedTenant(group) {
  const primary = await loadTenant(group.primary);
  const dups = [];
  for (const id of group.merge) dups.push(await loadTenant(id));

  const additionalSpaces = new Set((primary.additional_spaces || []).map(String));
  let payments = [...(primary.payments || [])];
  let additionalDrivers = [...(primary.additional_drivers || [])];

  let { monthly: monthlyTotal, renewal: renewalTotal } = effectiveRate(primary);
  let anyRenewalSet = primary.renewal_rate != null;

  const backfills = [];
  const vehicleBackfills = [];
  const notes = [];
  const originalCompany = primary.company;

  for (const dup of dups) {
    if (dup.space_number) additionalSpaces.add(String(dup.space_number));
    (dup.additional_spaces || []).forEach(sp => additionalSpaces.add(String(sp)));

    payments = payments.concat(dup.payments || []);
    additionalDrivers = additionalDrivers.concat(dup.additional_drivers || []);

    const { monthly, renewal } = effectiveRate(dup);
    monthlyTotal += monthly;
    if (renewal != null) { anyRenewalSet = true; renewalTotal = (renewalTotal || 0) + renewal; }
    else if (anyRenewalSet) { renewalTotal = (renewalTotal || 0) + monthly; }

    for (const field of SCALAR_BACKFILL_FIELDS) {
      if ((primary[field] === null || primary[field] === '' || primary[field] === undefined) && dup[field] != null && dup[field] !== '') {
        primary[field] = dup[field];
        backfills.push(`${field} <- ${dup.id} (${JSON.stringify(dup[field])})`);
      }
    }

    if (primary.vehicle && dup.vehicle) {
      for (const sub of VEHICLE_SUBFIELDS) {
        const cur = primary.vehicle[sub];
        const incoming = dup.vehicle[sub];
        if ((cur === null || cur === '' || cur === undefined) && incoming != null && incoming !== '') {
          primary.vehicle[sub] = incoming;
          vehicleBackfills.push(`vehicle.${sub} <- ${dup.id} (${JSON.stringify(incoming)})`);
        }
      }
    }

    // Fold any distinctive per-space identifying info (DOT #s, truck descriptions)
    // into the primary's company/notes field so it isn't silently lost.
    if (dup.company && dup.company !== originalCompany) {
      const addition = `Space ${dup.space_number}: ${dup.company}`;
      primary.company = primary.company ? `${primary.company} | ${addition}` : addition;
      notes.push(addition);
    }
    if (dup.truck_number && dup.truck_number !== primary.truck_number) {
      notes.push(`Space ${dup.space_number} truck #: "${dup.truck_number}"`);
    }
  }

  additionalSpaces.delete(String(primary.space_number));
  if (anyRenewalSet && renewalTotal == null) renewalTotal = monthlyTotal;

  return {
    primary,
    additionalSpaces: [...additionalSpaces].sort(spaceSort),
    payments: payments.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)),
    additionalDrivers,
    monthlyTotal,
    renewalTotal: anyRenewalSet ? renewalTotal : null,
    backfills,
    vehicleBackfills,
    notes,
    removedIds: dups.map(d => d.id),
  };
}

async function applyMerge(merged) {
  const p = merged.primary;
  await db.query(
    `UPDATE tenants SET
       email = $1, phone = $2, company = $3, plate_state = $4, truck_number = $5,
       trailer_number = $6, insurance_policy_number = $7, insurance_company = $8,
       insurance_exp_date = $9, insurance_doc = $10, autopay_card = $11,
       autopay_next_date = $12, due_date = $13, move_out_date = $14,
       vehicle = $15, additional_spaces = $16, payments = $17,
       additional_drivers = $18, monthly_rate = $19, renewal_rate = $20,
       updated_at = NOW()
     WHERE id = $21`,
    [
      p.email, p.phone, p.company, p.plate_state, p.truck_number,
      p.trailer_number, p.insurance_policy_number, p.insurance_company,
      p.insurance_exp_date, p.insurance_doc ? JSON.stringify(p.insurance_doc) : null, p.autopay_card,
      p.autopay_next_date, p.due_date, p.move_out_date,
      JSON.stringify(p.vehicle), JSON.stringify(merged.additionalSpaces), JSON.stringify(merged.payments),
      JSON.stringify(merged.additionalDrivers), merged.monthlyTotal, merged.renewalTotal,
      p.id,
    ]
  );

  for (const id of merged.removedIds) {
    await db.query('DELETE FROM tenants WHERE id = $1', [id]);
  }
}

async function main() {
  const apply = process.argv.includes('--apply');

  for (const group of MERGE_GROUPS) {
    const merged = await buildMergedTenant(group);
    const p = merged.primary;

    console.log(`\n=== ${p.name} (primary ${p.id}, space ${p.space_number}) ===`);
    console.log(`  Merging in: ${merged.removedIds.join(', ')}`);
    console.log(`  additionalSpaces -> ${JSON.stringify(merged.additionalSpaces)}`);
    console.log(`  payments: ${merged.payments.length} total`);
    console.log(`  monthlyRate: ${p.monthly_rate} -> ${merged.monthlyTotal}`);
    console.log(`  renewalRate: ${p.renewal_rate} -> ${merged.renewalTotal}`);
    if (merged.backfills.length) console.log(`  Backfilled fields:\n    ${merged.backfills.join('\n    ')}`);
    if (merged.vehicleBackfills.length) console.log(`  Backfilled vehicle fields:\n    ${merged.vehicleBackfills.join('\n    ')}`);
    if (merged.notes.length) console.log(`  Review (not auto-merged into a field):\n    ${merged.notes.join('\n    ')}`);

    if (apply) {
      await applyMerge(merged);
      console.log(`  --> Applied. Deleted: ${merged.removedIds.join(', ')}`);
    }
  }

  if (!apply) {
    console.log('\n(Dry run — no changes written. Re-run with --apply to commit.)');
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
