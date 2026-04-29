import { z } from "zod";

export const DROP_LOCATION_REQUIRED_MESSAGE_EN =
  "Set a drop location on the map, search for an address, use GPS, or enter coordinates.";

function emptyToOptionalNumber(val: unknown): unknown {
  if (val === "" || val === null || val === undefined) return undefined;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : undefined;
}

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
    latitude: z.preprocess(
      emptyToOptionalNumber,
      z.number().min(-90).max(90).optional()
    ),
    longitude: z.preprocess(
      emptyToOptionalNumber,
      z.number().min(-180).max(180).optional()
    ),
    radius: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    }, z
      .number()
      .min(5, "Radius must be at least 5 meters")
      .max(2000, "Radius must be at most 2000 meters")
      .optional()),
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
    redemptionType: z.enum(["anytime", "timer", "window"]),
    redemptionMinutes: z.coerce.number().optional(),
    redemptionDeadline: z.string().optional(),
    availabilityType: z.enum(["unlimited", "captureLimit"]),
    captureLimit: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(1).max(99999).optional()),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    voucherAbsoluteExpiresAt: z.string().optional(),
    voucherTtlHoursAfterClaim: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(1).optional()),
    termsAndConditions: z
      .string()
      .max(300, "Terms must be at most 300 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const latOk =
      typeof data.latitude === "number" &&
      Number.isFinite(data.latitude) &&
      data.latitude >= -90 &&
      data.latitude <= 90;
    const lngOk =
      typeof data.longitude === "number" &&
      Number.isFinite(data.longitude) &&
      data.longitude >= -180 &&
      data.longitude <= 180;
    if (!latOk || !lngOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: DROP_LOCATION_REQUIRED_MESSAGE_EN,
        path: ["latitude"],
      });
    }
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
    latitude: undefined,
    longitude: undefined,
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

