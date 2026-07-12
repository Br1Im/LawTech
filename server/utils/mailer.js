/**
 * Email sender (nodemailer) — registration email verification with a 6-digit code.
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || (SMTP_USER ? `Law.Tech <${SMTP_USER}>` : 'Law.Tech');

let transporter = null;
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function codeCells(code) {
  return String(code)
    .split('')
    .map(
      (d) =>
        `<td style="padding:0 5px;"><div style="width:46px;height:58px;line-height:58px;text-align:center;font-size:28px;font-weight:800;color:#161d3a;background:#f3f6fd;border:1px solid #e2e8f6;border-radius:12px;font-family:'Courier New',monospace;">${d}</div></td>`
    )
    .join('');
}

function verificationHtml(code, name) {
  const greeting = name ? `Здравствуйте, ${name}!` : 'Здравствуйте!';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#eef1f7;padding:32px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e7eaf2;border-radius:20px;overflow:hidden;box-shadow:0 14px 44px rgba(22,29,58,.08);">
      <tr><td style="background:#161d3a;padding:22px 36px;">
        <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:#2563EB;color:#fff;border-radius:7px;font-weight:800;font-size:15px;vertical-align:middle;">L</span>
        <span style="color:#fff;font-weight:800;font-size:17px;margin-left:9px;vertical-align:middle;letter-spacing:.2px;">Law.Tech</span>
      </td></tr>
      <tr><td style="padding:32px 36px 4px;">
        <h1 style="font-size:21px;color:#161d3a;margin:0 0 10px;">Подтверждение регистрации</h1>
        <p style="color:#5b6478;font-size:15px;line-height:1.55;margin:0 0 6px;">${greeting}</p>
        <p style="color:#5b6478;font-size:15px;line-height:1.55;margin:0 0 22px;">Вы создаёте аккаунт в Law.Tech. Введите этот код подтверждения на сайте:</p>
      </td></tr>
      <tr><td align="center" style="padding:0 36px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${codeCells(code)}</tr></table>
      </td></tr>
      <tr><td align="center" style="padding:14px 36px 4px;">
        <p style="color:#9aa3b2;font-size:13px;margin:0;">Код действует <b>30 минут</b>.</p>
      </td></tr>
      <tr><td style="padding:24px 36px 30px;">
        <div style="border-top:1px solid #eef0f4;padding-top:16px;color:#9aa3b2;font-size:12px;line-height:1.5;">
          Если вы не регистрировались в Law.Tech — просто проигнорируйте это письмо.<br>© Law.Tech — CRM для юридических компаний
        </div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendVerificationEmail(to, code, name) {
  const t = getTransporter();
  if (!t) { console.warn('[mailer] SMTP не настроен — письмо не отправлено'); return false; }
  await t.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Код подтверждения Law.Tech: ${code}`,
    text: `Ваш код подтверждения Law.Tech: ${code}. Код действует 30 минут.`,
    html: verificationHtml(code, name),
  });
  return true;
}

module.exports = { sendVerificationEmail, getTransporter };
