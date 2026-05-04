import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { config } from "../../config/app.config";
import {
  buildPasswordResetEmailContent,
  buildRewardClaimedNotificationEmailContent,
  buildRewardRedeemedNotificationEmailContent,
  buildVerificationEmailContent,
  buildVoucherMagicLinkEmailContent,
} from "./email-templates";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
    null;

  private getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
    return this.transporter;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");
    const verifyUrl = `${base}/merchant/verify-email/${encodeURIComponent(token)}`;

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      this.logger.debug(`Verification email would be sent to ${email}`);
      return;
    }

    const { subject, text, html } = buildVerificationEmailContent(
      verifyUrl,
      base,
    );

    const transporter = this.getTransporter();

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
      this.logger.debug(`Password reset email would be sent to ${email}`);
      return;
    }

    const { subject, text, html } = buildPasswordResetEmailContent(
      resetUrl,
      base,
      kind,
    );

    const transporter = this.getTransporter();

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
      this.logger.debug(`Voucher magic link email would be sent to ${to}`);
      return;
    }

    const { subject, text, html } = buildVoucherMagicLinkEmailContent(
      magicLink,
      dropName,
      base,
    );

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
  }

  async sendRewardClaimedNotification(
    to: string,
    voucherUrl: string,
    dropName: string,
    merchantDisplayName: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending reward claimed notification to ${to}`);

      const base = config.FRONTEND_URL.replace(/\/$/, "");

      if (!config.ENABLE_EMAIL || !config.smtp.host) {
        this.logger.debug(`Reward claimed notification would be sent to ${to}`);
        return;
      }

      const { subject, text, html } =
        buildRewardClaimedNotificationEmailContent(
          voucherUrl,
          dropName,
          merchantDisplayName,
          base,
        );

      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send reward claimed notification to ${to}: ${error}`,
      );
    }
  }

  async sendRewardRedeemedNotification(
    to: string,
    voucherUrl: string,
    dropName: string,
    merchantDisplayName: string,
    redeemedAt: Date,
  ): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      this.logger.debug(`Reward redeemed notification would be sent to ${to}`);
      return;
    }

    const { subject, text, html } = buildRewardRedeemedNotificationEmailContent(
      voucherUrl,
      dropName,
      merchantDisplayName,
      redeemedAt,
      base,
    );

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
  }
}
