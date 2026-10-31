import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.user || !env.email.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`[Email Fallback -> ${to}] Subject: ${subject}`);
    return { simulated: true };
  }

  return mailer.sendMail({
    from: `"RoktoLagbe Blood Network" <${env.email.user}>`,
    to,
    subject,
    text: text || "",
    html: html || `<p>${text || ""}</p>`,
  });
}