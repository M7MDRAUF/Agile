// Single source of truth for per-user preferences. Each group has a Zod schema
// and a set of defaults; values are persisted in the UserSetting table under
// the group key (e.g. "notifications") as a JSON blob.

import { z } from "zod";

export const DIGEST_FREQUENCIES = ["never", "daily", "weekly"] as const;
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD MMM YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ["12h", "24h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const WEEK_STARTS = ["sunday", "monday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

// -- Notifications ----------------------------------------------------------

export const notificationsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  assignments: z.boolean(),
  mentions: z.boolean(),
  blockers: z.boolean(),
  sprints: z.boolean(),
  dueDates: z.boolean(),
  digestFrequency: z.enum(DIGEST_FREQUENCIES),
});
export type NotificationPreferences = z.infer<typeof notificationsSchema>;
export const NOTIFICATION_DEFAULTS: NotificationPreferences = {
  inApp: true,
  email: true,
  assignments: true,
  mentions: true,
  blockers: true,
  sprints: true,
  dueDates: true,
  digestFrequency: "daily",
};

// -- Appearance & accessibility --------------------------------------------

export const appearanceSchema = z.object({
  theme: z.enum(THEMES),
  density: z.enum(DENSITIES),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  sidebarCollapsed: z.boolean(),
});
export type AppearancePreferences = z.infer<typeof appearanceSchema>;
export const APPEARANCE_DEFAULTS: AppearancePreferences = {
  theme: "system",
  density: "comfortable",
  reduceMotion: false,
  highContrast: false,
  sidebarCollapsed: false,
};

// -- Localization & regional ------------------------------------------------

export const LANGUAGES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "de-DE", label: "German (Deutschland)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "es-ES", label: "Spanish (España)" },
  { value: "ja-JP", label: "Japanese (日本)" },
] as const;

export const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const localizationSchema = z.object({
  language: z.string().min(2),
  timezone: z.string().min(1),
  dateFormat: z.enum(DATE_FORMATS),
  timeFormat: z.enum(TIME_FORMATS),
  firstDayOfWeek: z.enum(WEEK_STARTS),
});
export type LocalizationPreferences = z.infer<typeof localizationSchema>;
export const LOCALIZATION_DEFAULTS: LocalizationPreferences = {
  language: "en-US",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  firstDayOfWeek: "monday",
};

// -- Group registry ---------------------------------------------------------

export const PREFERENCE_GROUPS = {
  notifications: { schema: notificationsSchema, defaults: NOTIFICATION_DEFAULTS },
  appearance: { schema: appearanceSchema, defaults: APPEARANCE_DEFAULTS },
  localization: { schema: localizationSchema, defaults: LOCALIZATION_DEFAULTS },
} as const;

export type PreferenceGroup = keyof typeof PREFERENCE_GROUPS;

/**
 * Merge a persisted JSON string with the group defaults and validate. Invalid
 * or missing values fall back to defaults so the UI is never broken by bad
 * stored data.
 */
export function parsePreferences<G extends PreferenceGroup>(
  group: G,
  raw: string | null | undefined,
): z.infer<(typeof PREFERENCE_GROUPS)[G]["schema"]> {
  const { schema, defaults } = PREFERENCE_GROUPS[group];
  if (!raw) return defaults as z.infer<(typeof PREFERENCE_GROUPS)[G]["schema"]>;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return defaults as z.infer<(typeof PREFERENCE_GROUPS)[G]["schema"]>;
  }
  const merged = { ...(defaults as object), ...(parsedJson as object) };
  const result = schema.safeParse(merged);
  return (result.success ? result.data : defaults) as z.infer<
    (typeof PREFERENCE_GROUPS)[G]["schema"]
  >;
}

/** Example formatting used in the localization preview. */
export function formatDateSample(prefs: LocalizationPreferences, date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  switch (prefs.dateFormat) {
    case "MM/DD/YYYY":
      return `${pad(m + 1)}/${pad(d)}/${y}`;
    case "DD/MM/YYYY":
      return `${pad(d)}/${pad(m + 1)}/${y}`;
    case "DD MMM YYYY":
      return `${pad(d)} ${months[m]} ${y}`;
    case "YYYY-MM-DD":
    default:
      return `${y}-${pad(m + 1)}-${pad(d)}`;
  }
}

export function formatTimeSample(prefs: LocalizationPreferences, date: Date): string {
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (prefs.timeFormat === "24h") return `${pad(h)}:${pad(min)}`;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(min)} ${period}`;
}
