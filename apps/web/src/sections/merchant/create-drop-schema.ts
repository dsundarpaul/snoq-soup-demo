import { z } from "zod";

export const createDropSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(5).max(1000).default(15),
  rewardValue: z.string().min(1, "Reward value is required"),
  logoUrl: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val === "" ||
        /^https?:\/\/.+/.test(val) ||
        val.startsWith("/objects/"),
      {
        message: "Must be a valid URL or empty",
      }
    ),
  redemptionType: z.enum(["anytime", "timer", "window"]).default("anytime"),
  redemptionMinutes: z.coerce.number().optional(),
  redemptionDeadline: z.string().optional(),
  availabilityType: z
    .enum(["unlimited", "captureLimit", "timeWindow"])
    .default("unlimited"),
  captureLimit: z
    .union([z.coerce.number().min(1), z.literal(""), z.undefined(), z.null()])
    .optional()
    .nullable()
    .transform((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : undefined
    ),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  voucherAbsoluteExpiresAt: z.string().optional(),
  voucherTtlHoursAfterClaim: z
    .union([z.coerce.number().min(1), z.literal(""), z.undefined(), z.null()])
    .optional()
    .nullable()
    .transform((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : undefined
    ),
});

export type CreateDropForm = z.infer<typeof createDropSchema>;

export function formatIsoForDatetimeLocalInput(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}
