import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { ClientSession, Types } from "mongoose";

import { DatabaseService } from "../../database/database.service";

@Injectable()
export class EmailVerificationTokenService {
  private readonly tokenByteLength = 32;
  private readonly ttlMs = 60 * 60 * 1000;

  constructor(private readonly database: DatabaseService) {}

  hashPlainToken(plain: string): string {
    return createHash("sha256").update(plain).digest("hex");
  }

  async issueToken(
    merchantId: string,
    session?: ClientSession | null,
  ): Promise<string> {
    const plain = randomBytes(this.tokenByteLength).toString("hex");
    const tokenHash = this.hashPlainToken(plain);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    const opts = session ? { session } : {};
    await this.database.emailVerificationTokens.create(
      [
        {
          merchantId: new Types.ObjectId(merchantId),
          tokenHash,
          expiresAt,
          used: false,
        },
      ],
      opts,
    );

    return plain;
  }

  async markAllUnusedUsedForMerchant(
    merchantId: string,
    session?: ClientSession | null,
  ): Promise<void> {
    const opts = session ? { session } : {};
    await this.database.emailVerificationTokens.updateMany(
      { merchantId: new Types.ObjectId(merchantId), used: false },
      { $set: { used: true } },
      opts,
    );
  }
}
