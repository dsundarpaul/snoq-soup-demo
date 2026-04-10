import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

import { config } from "../../config/app.config";

@Injectable()
export class MailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const base = config.FRONTEND_URL.replace(/\/$/, "");
    const verifyUrl = `${base}/merchant/verify-email/${encodeURIComponent(token)}`;

    if (!config.ENABLE_EMAIL || !config.smtp.host) {
      console.log(`Verification email to ${email}: ${verifyUrl}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: "Verify your email",
      text: `Verify your email: ${verifyUrl}`,
      html: `<p><a href="${verifyUrl}">Verify your email</a></p>`,
    });
  }
}
