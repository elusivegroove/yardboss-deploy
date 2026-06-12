/**
 * YardBoss — Parking expiration / renewal helpers (server-side).
 * Mirrors the notice-window logic in js/data.js for use by API routes
 * and scheduled jobs.
 *
 * Notice window before a tenant's due date, based on rental cadence:
 *   daily   → 24 hours (1 day) before
 *   weekly  → 3 days before
 *   monthly → 5 days before
 */

function getNoticeDays(rateType) {
  switch (rateType) {
    case 'daily':  return 1;
    case 'weekly': return 3;
    case 'monthly':
    default:       return 5;
  }
}

// Days remaining until dueDate (a 'YYYY-MM-DD' string), negative = past due.
// Returns null if dueDate is missing.
function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}

// Renewal status for a tenant row (camelCase shape from rowToTenant).
function computeRenewalStatus(tenant) {
  if (!tenant) return 'current';
  if (tenant.status === 'past') return 'moved_out';
  if (tenant.moveOutDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const moveOut = new Date(tenant.moveOutDate + 'T00:00:00');
    return moveOut <= today ? 'moved_out' : 'scheduled_move_out';
  }
  const daysRemaining = getDaysUntilDue(tenant.dueDate);
  if (daysRemaining === null) return 'current';
  if (daysRemaining < 0) return 'past_due';
  if (daysRemaining <= getNoticeDays(tenant.rateType)) return 'due_soon';
  return 'current';
}

module.exports = { getNoticeDays, getDaysUntilDue, computeRenewalStatus };
