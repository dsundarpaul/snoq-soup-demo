import { z } from "zod";
import {
  HUNTER_DOB_ZOD_MESSAGE,
  isValidHunterDobYmdString,
} from "@/lib/hunter-dob";
import { getHunterNationalNumberBounds } from "@/lib/hunter-phone-bounds";

const nestPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const insertMerchantSchema = z.object({
  username: z.string(),
  password: z.string(),
  businessName: z.string(),
  email: z.string(),
  resetToken: z.string().nullable().optional(),
  resetTokenExpiry: z.date().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

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

export const insertDropSchema = z.object({
  merchantId: z.string(),
  name: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().optional(),
  rewardValue: z.string(),
  termsAndConditions: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  redemptionType: z.enum(["anytime", "timer", "window"]).default("anytime"),
  redemptionMinutes: z.number().nullable().optional(),
  redemptionDeadline: z.date().nullable().optional(),
  availabilityType: z.string().optional(),
  captureLimit: z.number().nullable().optional(),
  active: z.boolean().optional(),
  startTime: z.date().nullable().optional(),
  endTime: z.date().nullable().optional(),
  voucherAbsoluteExpiresAt: z.date().nullable().optional(),
  voucherTtlHoursAfterClaim: z.number().nullable().optional(),
});
export type InsertDrop = z.infer<typeof insertDropSchema>;

export const insertVoucherSchema = z.object({
  dropId: z.string(),
  merchantId: z.string(),
  redeemed: z.boolean().optional(),
  userEmail: z.string().nullable().optional(),
  userPhone: z.string().nullable().optional(),
  magicToken: z.string(),
  deviceId: z.string().nullable().optional(),
  hunterId: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

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

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertTreasureHunterSchema = z.object({
  deviceId: z.string(),
  nickname: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  mobileCountryCode: z.string().nullable().optional(),
  mobileNumber: z.string().nullable().optional(),
  resetToken: z.string().nullable().optional(),
  resetTokenExpiry: z.date().nullable().optional(),
});
export type InsertTreasureHunter = z.infer<typeof insertTreasureHunterSchema>;

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
  ctx: z.RefinementCtx
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
  refineHunterSignupMobile
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

export const insertAdminSchema = z.object({
  email: z.string(),
  password: z.string(),
  name: z.string(),
});
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const insertPromoCodeSchema = z.object({
  dropId: z.string(),
  merchantId: z.string(),
  code: z.string(),
  status: z.string().optional(),
  voucherId: z.string().nullable().optional(),
  assignedAt: z.date().nullable().optional(),
});
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
