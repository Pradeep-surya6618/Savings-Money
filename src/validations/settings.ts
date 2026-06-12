import { z } from "zod";

export const updatePreferencesSchema = z.object({
  language: z.string().min(1),
  dateFormat: z.string().min(1),
  firstDayOfWeek: z.string().min(1),
  defaultView: z.string().min(1),
  currency: z.string().min(1),
  locale: z.string().min(1),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const updateNotifyPrefsSchema = z.object({
  salary: z.boolean(),
  budget: z.boolean(),
  savings: z.boolean(),
});

export type NotifyPrefs = z.infer<typeof updateNotifyPrefsSchema>;
