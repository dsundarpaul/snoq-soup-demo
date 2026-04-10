import { createHash } from "crypto";
import mongoose from "mongoose";

import { config } from "../../src/config/app.config";

async function run(): Promise<void> {
  if (!config.database.uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(config.database.uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection failed");
  }

  const merchants = db.collection("merchants");
  const tokenColl = db.collection("email_verification_tokens");

  const missingLastSent = merchants.find({
    $or: [
      { lastVerificationSentAt: { $exists: false } },
      { lastVerificationSentAt: null },
    ],
  });

  for await (const m of missingLastSent) {
    const created = m.createdAt instanceof Date ? m.createdAt : new Date();
    await merchants.updateOne(
      { _id: m._id },
      { $set: { lastVerificationSentAt: created } },
    );
  }

  const legacyCursor = merchants.find({
    emailVerified: false,
    "emailVerification.token": {
      $exists: true,
      $type: "string",
      $nin: ["", null],
    },
  });

  for await (const doc of legacyCursor) {
    const ev = doc.emailVerification as
      | { token?: string; expiresAt?: Date }
      | undefined;
    const plain = ev?.token;
    if (!plain || typeof plain !== "string") {
      continue;
    }

    const tokenHash = createHash("sha256").update(plain).digest("hex");
    const expiresAt =
      ev.expiresAt instanceof Date && !Number.isNaN(ev.expiresAt.getTime())
        ? ev.expiresAt
        : new Date(Date.now() + 60 * 60 * 1000);

    const existing = await tokenColl.findOne({ tokenHash });
    if (!existing) {
      await tokenColl.insertOne({
        tokenHash,
        merchantId: doc._id,
        expiresAt,
        used: false,
        createdAt: new Date(),
      });
    }

    await merchants.updateOne(
      { _id: doc._id },
      { $unset: { emailVerification: 1 } },
    );
  }

  await tokenColl.createIndex({ tokenHash: 1 }, { unique: true });
  await tokenColl.createIndex({ expiresAt: 1 });
  await tokenColl.createIndex({ merchantId: 1, used: 1 });

  await mongoose.disconnect();
  console.log("Email verification migration finished.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
