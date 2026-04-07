import { z } from "zod";

export {
  merchantSignupSchema,
  merchantLoginSchema,
  type MerchantSignupInput,
  type MerchantLoginInput,
} from "@shared/schema";

export const merchantForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type MerchantForgotPasswordInput = z.infer<
  typeof merchantForgotPasswordSchema
>;

export const merchantResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type MerchantResetPasswordInput = z.infer<
  typeof merchantResetPasswordSchema
>;
