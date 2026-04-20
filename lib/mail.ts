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

  return transporter.sendMail({
    from: {
      name: config.fromName,
      address: config.fromEmail,
    },
    to: to ?? defaultRecipient,
    subject,
    html,
    text,
  });
}
