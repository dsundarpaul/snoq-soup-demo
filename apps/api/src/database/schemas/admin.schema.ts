import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  IsDate,
  IsOptional,
  IsNumber,
} from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({ timestamps: true })
export class Admin {
  @ApiProperty({
    example: "admin@example.com",
    description: "Admin email address",
  })
  @IsEmail()
  @IsString()
  @Prop({ type: String, required: true, lowercase: true })
  email!: string;

  @ApiProperty({ minLength: 8, description: "Hashed password" })
  @IsString()
  @MinLength(8)
  @Prop({ type: String, required: true, select: false })
  password!: string;

  @ApiProperty({ example: "Platform Administrator", description: "Admin name" })
  @IsString()
  @Prop({ type: String, required: true })
  name!: string;

  @ApiProperty({ default: 0, description: "Number of failed login attempts" })
  @IsNumber()
  @Prop({ type: Number, default: 0 })
  loginAttempts!: number;

  @ApiProperty({
    nullable: true,
    description: "Account lockout expiration timestamp",
  })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date })
  lockUntil!: Date | null;

  @ApiProperty({ nullable: true, description: "Soft delete timestamp" })
  @IsDate()
  @IsOptional()
  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @ApiProperty({ description: "Timestamp when document was created" })
  createdAt!: Date;

  @ApiProperty({ description: "Timestamp when document was last updated" })
  updatedAt!: Date;
}

export type AdminDocument = HydratedDocument<Admin>;

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Indexes
AdminSchema.index({ email: 1 }, { unique: true });
