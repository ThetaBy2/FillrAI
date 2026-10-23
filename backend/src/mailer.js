import nodemailer from 'nodemailer';

// Email is optional, like Gemini: without SMTP_HOST in .env we just log and skip.
let transport;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// One layout for every email. Inline styles + tables because email clients ignore <style> and flexbox.
// details: [[label, value], ...] shown as a table. button: { text, page } links to a frontend page.
function layout({ heading, intro, details = [], button, note }) {
  const appUrl = process.env.APP_URL || 'http://localhost:8000';
  const rows = details
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #ece9df;color:#6b6656;font-size:14px;">${esc(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #ece9df;color:#232017;font-size:14px;font-weight:600;text-align:right;">${esc(value)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f5ef;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dcd8cc;border-radius:8px;">
        <tr><td style="background:#1b2a4a;padding:20px 32px;border-radius:8px 8px 0 0;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">Fillr<span style="color:#e0a559;">AI</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;color:#1b2a4a;font-size:22px;">${esc(heading)}</h1>
          <p style="margin:0 0 20px;color:#232017;font-size:15px;line-height:1.6;">${esc(intro)}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>` : ''}
          ${button ? `<a href="${esc(`${appUrl}/${button.page}`)}" style="display:inline-block;background:#c97a22;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:6px;">${esc(button.text)}</a>` : ''}
          ${note ? `<p style="margin:24px 0 0;color:#6b6656;font-size:13px;line-height:1.5;">${esc(note)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ece9df;color:#6b6656;font-size:12px;line-height:1.5;">
          This is an automated message from FillrAI. Please do not reply to this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Fire-and-forget: callers don't await, so a slow or broken mail server never blocks a request.
export function sendMail(to, subject, content) {
  const t = getTransport();
  if (!t) return console.log(`Email skipped (no SMTP_HOST): "${subject}" to ${to}`);
  t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: layout(content),
    text: [content.heading, content.intro, ...(content.details || []).map(([k, v]) => `${k}: ${v}`), content.note]
      .filter(Boolean)
      .join('\n\n'),
  }).catch((err) => console.error(`Email to ${to} failed:`, err.message));
}

