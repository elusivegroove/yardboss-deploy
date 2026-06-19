const { randomUUID, createSign } = require('crypto');

const POYNT_API = 'https://services.poynt.net';

function getPrivateKey() {
  const raw = process.env.POYNT_PRIVATE_KEY || '';
  // Handle \n literals stored in .env / Railway secrets
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

let _tokenCache = null;

function isConfigured() {
  return !!(
    process.env.POYNT_APPLICATION_ID &&
    process.env.POYNT_BUSINESS_ID &&
    process.env.POYNT_PRIVATE_KEY
  );
}

function buildJWT() {
  const appId = process.env.POYNT_APPLICATION_ID;
  const key = getPrivateKey();
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: appId,
    sub: appId,
    iat: now,
    exp: now + 3600,
    jti: randomUUID(),
  })).toString('base64url');
  const signing = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signing);
  const sig = signer.sign(key, 'base64url');
  return `${signing}.${sig}`;
}

async function getAccessToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token;
  }
  const jwt = buildJWT();
  const res = await fetch(`${POYNT_API}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'api-version': '1.2',
    },
    body: `grantType=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Poynt auth ${res.status}: ${text}`);
  }
  const data = await res.json();
  _tokenCache = {
    token: data.accessToken,
    expiresAt: Date.now() + ((data.expiresIn || 3600) * 1000),
  };
  return _tokenCache.token;
}

async function poyntRequest(method, path, body) {
  const token = await getAccessToken();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'api-version': '1.2',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${POYNT_API}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Poynt ${res.status} ${method} ${path}: ${text}`);
  }
  return res.json();
}

const businessId = () => process.env.POYNT_BUSINESS_ID;

async function getStores() {
  return poyntRequest('GET', `/businesses/${businessId()}/stores`);
}

async function getTerminals(storeId) {
  return poyntRequest('GET', `/businesses/${businessId()}/stores/${storeId}/terminals`);
}

async function sendTerminalPayment({ storeId, terminalId, amountCents, referenceId, notes }) {
  return poyntRequest(
    'POST',
    `/businesses/${businessId()}/stores/${storeId}/terminals/${terminalId}/cloudMessages`,
    {
      action: 'PAYMENT',
      data: {
        action: 'SALE',
        purchaseAmount: amountCents,
        tipAmount: 0,
        currency: 'USD',
        multiTender: false,
        referenceId,
        notes: notes || '',
      },
    }
  );
}

async function getTransactionsByRef(referenceId) {
  return poyntRequest(
    'GET',
    `/businesses/${businessId()}/transactions?referenceId=${encodeURIComponent(referenceId)}&limit=1`
  );
}

module.exports = {
  isConfigured,
  getStores,
  getTerminals,
  sendTerminalPayment,
  getTransactionsByRef,
};
