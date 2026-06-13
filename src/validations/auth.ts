import { z } from "zod";
import { emailSchema } from "@/lib/auth/email-schema";
import { passwordSchema } from "@/lib/auth/password";

export const sendOtpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: emailSchema,
});
export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export const completeSignupSchema = z.object({ password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });
export const requestResetSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestResetInput = z.infer<typeof requestResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const setPasswordSchema = z.object({ password: passwordSchema });
export const changePasswordSchema = z.object({
  current: z.string().min(1, "Enter your current password"),
  password: passwordSchema,
});

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
