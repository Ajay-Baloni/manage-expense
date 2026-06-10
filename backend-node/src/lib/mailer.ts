import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.MAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: env.MAIL_PORT === 465,
      auth: env.MAIL_USER ? { user: env.MAIL_USER, pass: env.MAIL_PASSWORD } : undefined,
    });
  } else {
    // Dev/test: stream transport prints the message instead of sending it.
    transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const tx = getTransporter();
  const info = await tx.sendMail({ from: env.MAIL_FROM, ...message });
  if (!env.MAIL_HOST) {
    // eslint-disable-next-line no-console
    console.log(`📧 [dev mail] to=${message.to} subject="${message.subject}"`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`📧 mail sent to=${message.to} id=${info.messageId}`);
  }
}
