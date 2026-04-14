import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  real,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  HUNTER_DOB_ZOD_MESSAGE,
  isValidHunterDobYmdString,
} from "@/lib/hunter-dob";
import { getHunterNationalNumberBounds } from "@/lib/hunter-phone-bounds";

export interface StoreLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  howToReach?: string;
}

export const merchants = pgTable("merchants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  scannerToken: text("scanner_token"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  emailVerified: true,
  verificationToken: true,
  scannerToken: true,
  createdAt: true,
});
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect & {
  storeLocation?: StoreLocation | null;
  businessPhone?: string | null;
  businessHours?: string | null;
};

const nestPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const merchantUsernameSlugSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

export const merchantSignupSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  username: merchantUsernameSlugSchema,
  email: z.string().email("Please enter a valid email"),
  password: nestPassword,
});
export type MerchantSignupInput = z.infer<typeof merchantSignupSchema>;

export const merchantSignupFormSchema = merchantSignupSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type MerchantSignupFormInput = z.infer<typeof merchantSignupFormSchema>;

export const drops = pgTable("drops", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: real("radius").notNull().default(15),
  rewardValue: text("reward_value").notNull(),
  termsAndConditions: text("terms_and_conditions"),
  logoUrl: text("logo_url"),
  redemptionType: text("redemption_type").notNull().default("anytime"),
  redemptionMinutes: real("redemption_minutes"),
  redemptionDeadline: timestamp("redemption_deadline"),
  availabilityType: text("availability_type").notNull().default("unlimited"),
  captureLimit: integer("capture_limit"),
  active: boolean("active").notNull().default(true),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  voucherAbsoluteExpiresAt: timestamp("voucher_absolute_expires_at"),
  voucherTtlHoursAfterClaim: integer("voucher_ttl_hours_after_claim"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDropSchema = createInsertSchema(drops)
  .omit({ id: true, createdAt: true })
  .extend({
    redemptionType: z.enum(["anytime", "timer", "window"]).default("anytime"),
  });
export type InsertDrop = z.infer<typeof insertDropSchema>;
export type Drop = typeof drops.$inferSelect;

export const vouchers = pgTable("vouchers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dropId: varchar("drop_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
  redeemedAt: timestamp("redeemed_at"),
  redeemed: boolean("redeemed").notNull().default(false),
  userEmail: text("user_email"),
  userPhone: text("user_phone"),
  magicToken: text("magic_token").notNull(),
  deviceId: text("device_id"),
  hunterId: varchar("hunter_id"),
  expiresAt: timestamp("expires_at"),
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  claimedAt: true,
  redeemedAt: true,
});
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;

export const claimVoucherSchema = z.object({
  dropId: z.string(),
  userEmail: z.string().email().optional(),
  userPhone: z.string().optional(),
  deviceId: z.string().optional(),
});
export type ClaimVoucherInput = z.infer<typeof claimVoucherSchema>;

export const redeemVoucherSchema = z.object({
  voucherId: z.string(),
});
export type RedeemVoucherInput = z.infer<typeof redeemVoucherSchema>;

export const merchantLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1),
});
export type MerchantLoginInput = z.infer<typeof merchantLoginSchema>;

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Treasure Hunters (app users with optional signup)
export const treasureHunters = pgTable("treasure_hunters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  nickname: text("nickname"),
  email: text("email").unique(),
  password: text("password"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  mobileCountryCode: text("mobile_country_code"),
  mobileNumber: text("mobile_number"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  totalClaims: integer("total_claims").notNull().default(0),
  totalRedemptions: integer("total_redemptions").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTreasureHunterSchema = createInsertSchema(
  treasureHunters
).omit({
  id: true,
  createdAt: true,
  totalClaims: true,
  totalRedemptions: true,
});
export type InsertTreasureHunter = z.infer<typeof insertTreasureHunterSchema>;
export type TreasureHunter = typeof treasureHunters.$inferSelect;

const hunterSignupFieldsSchema = z.object({
  email: z.string().email(),
  password: nestPassword,
  nickname: z.string().min(2).max(20).optional(),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((s) => isValidHunterDobYmdString(s), {
      message: HUNTER_DOB_ZOD_MESSAGE,
    }),
  gender: z.enum(["male", "female"], {
    required_error: "Gender is required",
  }),
  mobileCountryCode: z.string().min(1, "Country code is required"),
  mobileNumber: z
    .string()
    .min(1, "Mobile number is required")
    .max(15, "Mobile number is too long"),
});

function refineHunterSignupMobile(
  data: {
    mobileCountryCode: string;
    mobileNumber: string;
  },
  ctx: z.RefinementCtx,
): void {
  const digits = data.mobileNumber.replace(/\D/g, "");
  const { min, max } = getHunterNationalNumberBounds(data.mobileCountryCode);
  if (digits.length < min || digits.length > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mobileNumber"],
      message:
        min === max
          ? `Enter exactly ${min} digits for the selected country`
          : `Enter between ${min} and ${max} digits for the selected country`,
    });
  }
}

export const hunterSignupSchema = hunterSignupFieldsSchema.superRefine(
  refineHunterSignupMobile,
);

export type HunterSignupInput = z.infer<typeof hunterSignupSchema>;

export const hunterSignupFormSchema = hunterSignupFieldsSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    refineHunterSignupMobile(data, ctx);
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type HunterSignupFormInput = z.infer<typeof hunterSignupFormSchema>;

export const hunterLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type HunterLoginInput = z.infer<typeof hunterLoginSchema>;

// Platform Admins
export const admins = pgTable("admins", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dropId: varchar("drop_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull().default("available"),
  voucherId: varchar("voucher_id"),
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
});
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
