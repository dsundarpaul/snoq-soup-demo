import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDate, IsString } from "class-validator";
import { HydratedDocument, Types } from "mongoose";

import { Merchant } from "./merchant.schema";

@Schema({
  collection: "email_verification_tokens",
  timestamps: { createdAt: true, updatedAt: false },
})
export class EmailVerificationToken {
  @ApiProperty({ description: "SHA-256 hash of the raw verification token" })
  @IsString()
  @Prop({ type: String, required: true })
  tokenHash!: string;

  @ApiProperty({ description: "Merchant this token belongs to" })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Merchant.name, required: true })
  merchantId!: Types.ObjectId;

  @ApiProperty({ description: "Token expiration time" })
  @IsDate()
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @ApiProperty({ description: "Whether the token has been consumed" })
  @IsBoolean()
  @Prop({ type: Boolean, default: false })
  used!: boolean;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt!: Date;
}

export type EmailVerificationTokenDocument =
  HydratedDocument<EmailVerificationToken>;

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken,
);

EmailVerificationTokenSchema.index({ tokenHash: 1 }, { unique: true });
EmailVerificationTokenSchema.index({ expiresAt: 1 });
EmailVerificationTokenSchema.index({ merchantId: 1, used: 1 });
