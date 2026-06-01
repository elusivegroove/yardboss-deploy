const express = require('express');
const router = express.Router();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MOCK = !ANTHROPIC_KEY || ANTHROPIC_KEY.includes('YOUR_') || ANTHROPIC_KEY === '';

// POST /api/scan-insurance
// Body: { fileData: base64string, mimeType: 'image/jpeg'|'image/png'|'image/webp'|'application/pdf' }
router.post('/', async (req, res) => {
  const { fileData, mimeType } = req.body;
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: 'fileData and mimeType are required' });
  }

  if (MOCK) {
    // Sandbox — return plausible mock data so the UI can be tested end-to-end
    return res.json({
      mock: true,
      policyNumber: 'POL-' + Math.floor(Math.random() * 9000000 + 1000000),
      insuranceCompany: 'Progressive Commercial Insurance',
      insuredName: 'TransVega Logistics LLC',
      expirationDate: '2026-12-31',
      coverageAmount: '$1,000,000'
    });
  }

  try {
    const prompt =
      'Extract the following from this insurance document: ' +
      'Policy Number, Insurance Company Name, Insured Name, Policy Expiration Date, Coverage Amount. ' +
      'Return JSON only — no markdown, no explanation. ' +
      'Keys: policyNumber, insuranceCompany, insuredName, expirationDate (YYYY-MM-DD format), coverageAmount.';

    // Support both image and PDF (Anthropic supports PDF via base64 source)
    const imageSource = {
      type: 'base64',
      media_type: mimeType,
      data: fileData
    };

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: prompt }
        ]
      }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Anthropic API error', detail: errText });
    }

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    // Extract the JSON object from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: 'AI returned unreadable response', raw: text });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return res.json(extracted);

  } catch (err) {
    console.error('[scan-insurance]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
