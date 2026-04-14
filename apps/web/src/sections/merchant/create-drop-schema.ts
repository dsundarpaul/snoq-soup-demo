import { z } from "zod";

export const createDropSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Drop name must be at most 100 characters"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(250, "Description must be at most 250 characters"),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radius: z.coerce
      .number()
      .min(5, "Radius must be at least 5 meters")
      .max(1000, "Radius must be at most 1000 meters")
      .default(15),
    rewardValue: z
      .string()
      .min(1, "Reward value is required")
      .max(20, "Reward value must be at most 20 characters"),
    logoUrl: z
      .string()
      .optional()
      .refine((val) => !val || val === "" || /^https?:\/\/.+/.test(val), {
        message: "Must be a valid HTTP URL or empty",
      }),
    redemptionType: z.enum(["anytime", "timer", "window"]).default("anytime"),
    redemptionMinutes: z.coerce.number().optional(),
    redemptionDeadline: z.string().optional(),
    availabilityType: z
      .enum(["unlimited", "captureLimit", "timeWindow"])
      .default("unlimited"),
    captureLimit: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(1).max(99999).optional()),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    voucherAbsoluteExpiresAt: z.string().optional(),
    voucherTtlHoursAfterClaim: z
      .union([
        z.coerce.number().min(1),
        z.literal(""),
        z.undefined(),
        z.null(),
      ])
      .optional()
      .nullable()
      .transform((v) =>
        typeof v === "number" && !Number.isNaN(v) ? v : undefined
      ),
    termsAndConditions: z
      .string()
      .max(4000, "Terms must be at most 4000 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.availabilityType === "captureLimit") {
      if (
        data.captureLimit === undefined ||
        data.captureLimit === null ||
        Number.isNaN(data.captureLimit as number)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Maximum captures is required",
          path: ["captureLimit"],
        });
      }
    }
  });

export type CreateDropForm = z.infer<typeof createDropSchema>;

export function getCreateDropEmptyValues(): CreateDropForm {
  return {
    name: "",
    description: "",
    latitude: 24.7136,
    longitude: 46.6753,
    radius: 15,
    rewardValue: "",
    logoUrl: "",
    redemptionType: "anytime",
    redemptionMinutes: undefined,
    redemptionDeadline: "",
    availabilityType: "unlimited",
    captureLimit: undefined,
    startTime: "",
    endTime: "",
    voucherAbsoluteExpiresAt: "",
    voucherTtlHoursAfterClaim: undefined,
    termsAndConditions: "",
  };
}

export function formatIsoForDatetimeLocalInput(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}
