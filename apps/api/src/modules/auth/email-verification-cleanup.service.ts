import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { DatabaseService } from "../../database/database.service";

@Injectable()
export class EmailVerificationCleanupService {
  private readonly logger = new Logger(EmailVerificationCleanupService.name);

  constructor(private readonly database: DatabaseService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeStaleVerificationTokens(): Promise<void> {
    const now = new Date();
    const result = await this.database.emailVerificationTokens.deleteMany({
      $or: [{ used: true }, { expiresAt: { $lt: now } }],
    });
    this.logger.log(
      `Removed ${result.deletedCount} email verification token document(s)`,
    );
  }
}
