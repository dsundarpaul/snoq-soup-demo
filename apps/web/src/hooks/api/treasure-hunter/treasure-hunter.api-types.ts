import { z } from "zod";

export {
  hunterSignupSchema,
  hunterSignupFormSchema,
  hunterLoginSchema,
  type HunterSignupInput,
  type HunterSignupFormInput,
  type HunterLoginInput,
} from "@shared/schema";

export const treasureHunterForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type TreasureHunterForgotPasswordInput = z.infer<
  typeof treasureHunterForgotPasswordSchema
>;

export const treasureHunterResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type TreasureHunterResetPasswordInput = z.infer<
  typeof treasureHunterResetPasswordSchema
>;

export type TreasureHunterProfile = {
  email?: string | null;
  nickname?: string | null;
  [key: string]: unknown;
};
