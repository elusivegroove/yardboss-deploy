/**
 * YardBoss — SMS Templates
 * Stores customizable SMS templates with {{variable}} placeholders.
 * Templates are saved per-org in app_settings.sms_templates (JSONB).
 * Falls back to in-memory store when DATABASE_URL is not set.
 */

const db = require('../db');

const DEFAULT_TEMPLATES = {
  gate_code: {
    name: 'Gate Code',
    vars: ['name', 'gate_code', 'period'],
    body: 'Hi {{name}}, your gate code for {{period}} is {{gate_code}}. Valid through end of month. Questions? Call (863) 441-3444.',
  },
  renewal_30: {
    name: '30-Day Renewal Reminder',
    vars: ['name', 'space', 'renewal_date'],
    body: 'Hi {{name}}, your storage at Space {{space}} renews on {{renewal_date}} (30 days). Pay early to lock your spot. (863) 441-3444',
  },
  renewal_7: {
    name: '7-Day Renewal Reminder',
    vars: ['name', 'space', 'renewal_date'],
    body: 'Hi {{name}}, your storage at Space {{space}} renews in 7 days ({{renewal_date}}). Pay now to avoid a late fee. (863) 441-3444',
  },
  payment_received: {
    name: 'Payment Received',
    vars: ['name', 'space', 'amount'],
    body: 'Hi {{name}}, we received your ${{amount}} payment for Space {{space}}. Thank you! — TransVega Yard (863) 441-3444',
  },
  payment_past_due: {
    name: 'Payment Past Due',
    vars: ['name', 'space', 'amount'],
    body: 'Hi {{name}}, your balance of ${{amount}} for Space {{space}} is past due. Please call (863) 441-3444 to avoid a late fee.',
  },
  welcome: {
    name: 'Welcome / Move-In',
    vars: ['name', 'space', 'gate_code'],
    body: 'Welcome to TransVega Yard, {{name}}! Space {{space}} is all set. Gate code: {{gate_code}}. Questions? Call (863) 441-3444.',
  },
  moveout_reminder: {
    name: 'Move-Out Reminder',
    vars: ['name', 'space', 'moveout_date'],
    body: 'Hi {{name}}, your storage at Space {{space}} ends on {{moveout_date}}. Want to renew? Call (863) 441-3444.',
  },
  insurance_expiring: {
    name: 'Insurance Expiring',
    vars: ['name', 'expiry_date'],
    body: 'Hi {{name}}, your insurance on file expires {{expiry_date}}. Please submit updated proof to TransVega Yard. (863) 441-3444',
  },
};

// In-memory fallback (no DATABASE_URL)
let _memTemplates = null;

async function getTemplates() {
  if (process.env.DATABASE_URL) {
    const r = await db.query('SELECT sms_templates FROM app_settings WHERE id = 1');
    if (r.rows.length && r.rows[0].sms_templates) {
      const saved = r.rows[0].sms_templates;
      // Merge saved bodies over defaults — keeps structure current if we add new templates
      const merged = {};
      for (const [key, def] of Object.entries(DEFAULT_TEMPLATES)) {
        merged[key] = {
          ...def,
          body: (saved[key] && saved[key].body) ? saved[key].body : def.body,
        };
      }
      return merged;
    }
  } else if (_memTemplates) {
    return _memTemplates;
  }
  return structuredClone(DEFAULT_TEMPLATES);
}

async function setTemplates(templates) {
  // Only persist the body — name and vars are always derived from DEFAULT_TEMPLATES
  const toSave = {};
  for (const [key, val] of Object.entries(templates)) {
    if (DEFAULT_TEMPLATES[key] && val && val.body) {
      toSave[key] = { body: val.body };
    }
  }

  if (process.env.DATABASE_URL) {
    await db.query(
      `INSERT INTO app_settings (id, sms_templates)
       VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET sms_templates = $1`,
      [JSON.stringify(toSave)]
    );
  } else {
    const merged = {};
    for (const [key, def] of Object.entries(DEFAULT_TEMPLATES)) {
      merged[key] = {
        ...def,
        body: (toSave[key] && toSave[key].body) ? toSave[key].body : def.body,
      };
    }
    _memTemplates = merged;
  }
}

/**
 * Fill a template body with variable values.
 * fillTemplate('Hi {{name}}!', { name: 'John' }) → 'Hi John!'
 * Unrecognized variables are left as-is.
 */
function fillTemplate(body, vars) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}

module.exports = { getTemplates, setTemplates, fillTemplate, DEFAULT_TEMPLATES };
