import { z } from "zod";

export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60, "Name is too long"),
  bio: z.string().trim().max(100, "Bio must be 100 characters or fewer").optional().default(""),
  dateOfBirth: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || (!Number.isNaN(Date.parse(v)) && new Date(v) <= new Date()),
      "Enter a valid past date",
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Client + server guard for avatar uploads. */
export function isValidAvatar(type: string, size: number): boolean {
  return type.startsWith("image/") && size > 0 && size <= MAX_AVATAR_BYTES;
}
