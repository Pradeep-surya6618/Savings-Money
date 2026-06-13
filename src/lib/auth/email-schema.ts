import { z } from "zod";

/** Normalizes (trim + lowercase) then validates a basic email shape. */
export const emailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email");
