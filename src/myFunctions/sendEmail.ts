import Mailgun from 'mailgun.js';
import formData from 'form-data';

const api_key = process.env.MAILGUN_API_KEY;
const domain = process.env.PROAVALON_EMAIL_ADDRESS_DOMAIN;
const fromAddress = process.env.PROAVALON_EMAIL_ADDRESS;

let mg: ReturnType<Mailgun['client']> | null = null;

function getMailgunClient() {
  if (mg) {
    return mg;
  }

  if (!api_key) {
    return null;
  }

  const mailgun = new Mailgun(formData);
  mg = mailgun.client({ username: 'api', key: api_key });
  return mg;
}

export const sendEmail = (
  recipientEmail: string,
  subject: string,
  messageHtml: string,
) => {
  const client = getMailgunClient();

  if (!client || !domain || !fromAddress) {
    console.warn(
      'Email send requested, but Mailgun is not fully configured. Skipping email delivery.',
    );
    return;
  }

  const data = {
    from: 'ProAvalon <' + fromAddress + '>',
    to: recipientEmail,
    subject: subject,
    html: messageHtml,
  };

  client.messages.create(domain, data);
};
