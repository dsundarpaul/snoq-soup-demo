import { z } from 'zod';

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const merchantRegisterSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/[A-Z]/, 'At least one uppercase').regex(/[0-9]/, 'At least one number'),
  businessName: z.string().min(2).max(100),
});

export const hunterRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  deviceId: z.string().min(1),
  nickname: z.string().min(2).max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords must match' });

// Drops
export const createDropSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(5).max(1000).default(15),
  rewardValue: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().nullable(),
  redemption: z.object({
    type: z.enum(['anytime', 'timer', 'window']),
    minutes: z.number().min(1).max(1440).optional(),
    deadline: z.date().optional(),
  }).refine(d => {
    if (d.type === 'timer') return d.minutes !== undefined;
    if (d.type === 'window') return d.deadline !== undefined;
    return true;
  }),
  availability: z.object({
    type: z.enum(['unlimited', 'limited']),
    limit: z.number().min(1).max(100000).optional(),
  }).refine(d => d.type !== 'limited' || d.limit !== undefined),
  schedule: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).refine(d => !d.start || !d.end || d.end > d.start).optional(),
  active: z.boolean().default(true),
});

export const updateDropSchema = createDropSchema.partial();

// Vouchers
export const claimVoucherSchema = z.object({
  dropId: z.string().min(1),
  deviceId: z.string().min(1),
  hunterId: z.string().optional(),
});

export const redeemVoucherSchema = z.object({
  voucherId: z.string().min(1),
  magicToken: z.string().min(1),
});

export const sendVoucherEmailSchema = z.object({
  email: z.string().email(),
  voucherId: z.string().min(1),
  magicLink: z.string().url(),
});

export const sendVoucherWhatsAppSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  voucherId: z.string().min(1),
  magicLink: z.string().url(),
});

// Hunters
export const updateHunterProfileSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  mobileCountryCode: z.string().max(5).optional(),
  mobileNumber: z.string().regex(/^\d{7,15}$/).optional(),
});

// Promo Codes
export const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/i),
});

export const bulkCreatePromoCodesSchema = z.object({
  codes: z.array(z.string().min(3).max(50)).min(1).max(1000),
});

// Upload
export const presignUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  size: z.number().max(5 * 1024 * 1024), // 5MB
});

// Types
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MerchantRegisterInput = z.infer<typeof merchantRegisterSchema>;
export type HunterRegisterInput = z.infer<typeof hunterRegisterSchema>;
export type CreateDropInput = z.infer<typeof createDropSchema>;
export type UpdateDropInput = z.infer<typeof updateDropSchema>;
export type ClaimVoucherInput = z.infer<typeof claimVoucherSchema>;
export type RedeemVoucherInput = z.infer<typeof redeemVoucherSchema>;
export type UpdateHunterProfileInput = z.infer<typeof updateHunterProfileSchema>;
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type BulkCreatePromoCodesInput = z.infer<typeof bulkCreatePromoCodesSchema>;
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
