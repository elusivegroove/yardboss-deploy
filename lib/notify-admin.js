const { MOCK_SMTP, transporter, buildEmailHtml } = require('./email');

const ADMIN_EMAIL = 'sebring@transvegalogistics.com';

async function notifyAdmin(subject, bodyHtml) {
  if (MOCK_SMTP || !transporter) {
    console.log(`[ADMIN NOTIFY MOCK] To: ${ADMIN_EMAIL} | ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"YardBoss" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || undefined,
      to: ADMIN_EMAIL,
      subject,
      html: buildEmailHtml('YardBoss', bodyHtml),
    });
  } catch (err) {
    console.error('[notifyAdmin]', err.message);
  }
}

module.exports = { notifyAdmin, ADMIN_EMAIL };
