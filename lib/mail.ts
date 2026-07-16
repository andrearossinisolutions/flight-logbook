import "server-only";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const SMTP_HOST = "smtp.ionos.it";
const SMTP_PORT = 587;
const SMTP_SECURE = false;
const DEFAULT_FROM_NAME = "Flight Logbook";

function getMailConfig() {
  const authUser = process.env.SMTP_AUTH_USERNAME;
  const authPassword = process.env.SMTP_AUTH_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || DEFAULT_FROM_NAME;

  if (!authUser || !authPassword) {
    throw new Error("SMTP_AUTH_USERNAME o SMTP_AUTH_PASSWORD non configurati.");
  }

  if (!fromEmail) {
    throw new Error("SMTP_FROM_EMAIL non configurato.");
  }

  return {
    authUser,
    authPassword,
    fromEmail,
    fromName,
  };
}

type SendUserEmailInput = {
  userId: string;
  subject: string;
  html: string;
  text?: string;
  to?: string;
};

export async function getDefaultUserEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
    },
  });

  if (!user?.email) {
    throw new Error("Utente non trovato.");
  }

  return user.email;
}

function appendFooter(html: string, text?: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const privacyUrl = `${appUrl}/privacy`;
  const termsUrl = `${appUrl}/terms`;
  const settingsUrl = `${appUrl}/settings`;

  const footerHtml = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; font-family: sans-serif; line-height: 1.5;">
      Ricevi questa email in quanto utente registrato su Flight Logbook.<br />
      <a href="${privacyUrl}" target="_blank" style="color: #9ca3af; text-decoration: underline;">Privacy Policy</a> | 
      <a href="${termsUrl}" target="_blank" style="color: #9ca3af; text-decoration: underline;">Termini di Servizio</a> | 
      <a href="${settingsUrl}" target="_blank" style="color: #9ca3af; text-decoration: underline;">Gestione Account / Eliminazione</a>
    </div>
  `;

  const footerText = 
    `\n\n---\nRicevi questa email in quanto utente registrato su Flight Logbook.\n` +
    `Privacy Policy: ${privacyUrl}\n` +
    `Termini di Servizio: ${termsUrl}\n` +
    `Gestione Account / Eliminazione: ${settingsUrl}`;

  // Se l'HTML ha un tag di chiusura div principale, inseriamo il footer prima per mantenere il layout coerente
  let finalHtml = html;
  const lastDivIndex = html.lastIndexOf("</div>");
  if (lastDivIndex !== -1 && lastDivIndex > html.length - 100) {
    finalHtml = html.substring(0, lastDivIndex) + footerHtml + html.substring(lastDivIndex);
  } else {
    finalHtml = html + footerHtml;
  }

  return {
    html: finalHtml,
    text: text ? (text + footerText) : undefined,
  };
}

export async function sendUserEmail({ userId, subject, html, text, to }: SendUserEmailInput) {
  const config = getMailConfig();
  const defaultRecipient = await getDefaultUserEmail(userId);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: config.authUser,
      pass: config.authPassword,
    },
  });

  const formatted = appendFooter(html, text);

  return transporter.sendMail({
    from: {
      name: config.fromName,
      address: config.fromEmail,
    },
    to: to ?? defaultRecipient,
    subject,
    html: formatted.html,
    text: formatted.text,
  });
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const config = getMailConfig();

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: config.authUser,
      pass: config.authPassword,
    },
  });

  const formatted = appendFooter(html, text);

  return transporter.sendMail({
    from: {
      name: config.fromName,
      address: config.fromEmail,
    },
    to,
    subject,
    html: formatted.html,
    text: formatted.text,
  });
}


