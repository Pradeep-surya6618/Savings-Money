import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .refine((v) => /[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v), "Include a number or special character");

export type PasswordRules = { length: boolean; numberOrSymbol: boolean };

/** Live checklist booleans for the password field UI. */
export function passwordRules(value: string): PasswordRules {
  return {
    length: value.length >= 8,
    numberOrSymbol: /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value),
  };
}
