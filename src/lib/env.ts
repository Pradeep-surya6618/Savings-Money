import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine((v) => v.startsWith("mongodb"), "MONGODB_URI must be a MongoDB connection string"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${msg}`);
  }
  return parsed.data;
}

let cached: Env | null = null;

/** Lazily validate process.env so importing this module never throws. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
