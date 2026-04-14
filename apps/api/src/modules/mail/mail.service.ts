import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { config } from "../../config/app.config";
import {
  buildPasswordResetEmailContent,
  buildVerificationEmailContent,
  buildVoucherMagicLinkEmailContent,
} from "./email-templates";

@Injectable()
export class MailService {
  private createTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");
    const verifyUrl = `${base}/merchant/verify-email/${encodeURIComponent(token)}`;

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      console.log(`Verification email to ${email}: ${verifyUrl}`);
      return;
    }

    const { subject, text, html } = buildVerificationEmailContent(
      verifyUrl,
      base,
    );

    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    kind: "merchant" | "hunter",
  ): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");
    const path =
      kind === "merchant"
        ? `/merchant/reset-password/${encodeURIComponent(token)}`
        : `/reset-password/${encodeURIComponent(token)}`;
    const resetUrl = `${base}${path}`;

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      console.log(`Password reset email to ${email}: ${resetUrl}`);
      return;
    }

    const { subject, text, html } = buildPasswordResetEmailContent(
      resetUrl,
      base,
      kind,
    );

    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendVoucherMagicLink(
    to: string,
    magicLink: string,
    dropName: string,
  ): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      console.log(`[MailService] voucher email to ${to}: ${magicLink}`);
      return;
    }

    const { subject, text, html } = buildVoucherMagicLinkEmailContent(
      magicLink,
      dropName,
      base,
    );

    const transporter = this.createTransporter();
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
  }
}
