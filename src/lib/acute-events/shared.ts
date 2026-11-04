import { z } from "zod/v4";

import { validateEntryInstant } from "@/lib/validations/entry-instant";
import { isoDateTime } from "@/lib/validations/datetime";

/**
 * Acute stressor events: client-safe constants, wire types and the request
 * schemas. Server-only helpers (note crypto, DTO mappers) live in
 * `./server.ts`, so the quick-entry sheet can import this file without
 * pulling `node:crypto` into the browser bundle.
 *
 * An acute event is a same-day stressor the person logs close to when it
 * happened: a quarrel at home, a conflict at work, something frightening on
 * the commute. It is deliberately NOT a life event: life events are the
 * long-term anchors of the timeline, this is the fine-grained grain beside
 * them, with a 0-10 intensity and an instant rather than a date. Both ride
 * the `timeline` module's surfaces; the routes are owner-only the way the
 * life-event routes are, because a quarrel at home is as personal as a
 * loss.
 */

/** The intensity scale: 0 a nothing, 10 the worst the day can hand out. */
export const ACUTE_EVENT_INTENSITY_MIN = 0;
export const ACUTE_EVENT_INTENSITY_MAX = 10;

/** Upper bound on one events page. */
export const MAX_ACUTE_EVENTS_PAGE = 500;

/** Upper bound on one note. */
export const MAX_ACUTE_EVENT_NOTE_CHARS = 500;

/**
 * The closed category list. The value of the row is the intensity over time,
 * not a taxonomy, so the list stays short and `OTHER` takes the rest.
 */
export const ACUTE_EVENT_CATEGORIES = [
  "HOME",
  "WORK",
  "COMMUTE",
  "FINANCE",
  "OTHER",
] as const;

export type AcuteEventCategory = (typeof ACUTE_EVENT_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(ACUTE_EVENT_CATEGORIES);

/** Wire shape of one acute event. */
export interface AcuteEventDTO {
  id: string;
  category: AcuteEventCategory;
  occurredAt: string;
  intensity: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const categorySchema = z
  .string()
  .refine((v) => CATEGORY_SET.has(v), "Unknown category");

const intensitySchema = z
  .number()
  .int()
  .min(ACUTE_EVENT_INTENSITY_MIN)
  .max(ACUTE_EVENT_INTENSITY_MAX);

const occurredAtSchema = validateEntryInstant(
  isoDateTime()
    .transform((s) => new Date(s))
    .pipe(z.date()),
);

export const acuteEventCreateSchema = z.object({
  category: categorySchema,
  /** Defaults to now. Not in the future beyond the shared 5-minute skew. */
  occurredAt: occurredAtSchema.optional(),
  intensity: intensitySchema,
  note: z.string().trim().max(MAX_ACUTE_EVENT_NOTE_CHARS).nullish(),
});

export const acuteEventUpdateSchema = z
  .object({
    category: categorySchema.optional(),
    occurredAt: occurredAtSchema.optional(),
    intensity: intensitySchema.optional(),
    note: z.string().trim().max(MAX_ACUTE_EVENT_NOTE_CHARS).nullish(),
  })
  .refine(
    (v) =>
      v.category !== undefined ||
      v.occurredAt !== undefined ||
      v.intensity !== undefined ||
      v.note !== undefined,
    "At least one field is required",
  );

export const acuteEventListQuerySchema = z.object({
  from: isoDateTime().optional(),
  to: isoDateTime().optional(),
  category: categorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_ACUTE_EVENTS_PAGE).default(200),
});
