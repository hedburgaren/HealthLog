import { z } from "zod/v4";

import { validateEntryInstant } from "@/lib/validations/entry-instant";
import { isoDateTime } from "@/lib/validations/datetime";

/**
 * Everyday exertion events: client-safe constants, wire types and the
 * request schemas. Server-only helpers (label and note crypto, DTO mappers)
 * live in `./server.ts`, so the quick-entry sheet can import this file
 * without pulling `node:crypto` into the browser bundle.
 *
 * An exertion event is everyday physical load beyond the ordinary, logged by
 * hand: the grocery haul up three flights of stairs, the unplanned long
 * walk. Deliberately NOT a workout: a workout is a planned session with a
 * sport, a distance and heart rate, and the manual workout form is built
 * around those. The label is free text in the person's own words; the 0-10
 * perceived intensity is what the correlation matrix reads. The surfaces
 * ride the `workouts` module (it owns the activity record), and the routes
 * are owner-only the way the life-event routes are.
 */

/** The perceived-exertion scale: 0 nothing, 10 the heaviest the day gets. */
export const EXERTION_INTENSITY_MIN = 0;
export const EXERTION_INTENSITY_MAX = 10;

/** Upper bound on one entries page. */
export const MAX_EXERTION_EVENTS_PAGE = 500;

/** Bounds on the label, in the person's own words. */
export const MAX_EXERTION_LABEL_CHARS = 60;

/** Upper bound on one note. */
export const MAX_EXERTION_NOTE_CHARS = 500;

/** Bounds on one duration, in minutes. A day of hard physical work max. */
export const MAX_EXERTION_DURATION_MIN = 24 * 60;

/** Correlation channel key of the daily exertion series. */
export const EXERTION_CHANNEL_KEY = "EXERTION";

/** Wire shape of one exertion event. */
export interface ExertionEventDTO {
  id: string;
  label: string | null;
  occurredAt: string;
  intensity: number;
  durationMin: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const labelSchema = z
  .string()
  .trim()
  .min(1, "Label must not be empty")
  .max(MAX_EXERTION_LABEL_CHARS, "Label must be at most 60 characters");

const intensitySchema = z
  .number()
  .int()
  .min(EXERTION_INTENSITY_MIN)
  .max(EXERTION_INTENSITY_MAX);

const occurredAtSchema = validateEntryInstant(
  isoDateTime()
    .transform((s) => new Date(s))
    .pipe(z.date()),
);

export const exertionEventCreateSchema = z.object({
  label: labelSchema,
  /** Defaults to now. Not in the future beyond the shared 5-minute skew. */
  occurredAt: occurredAtSchema.optional(),
  intensity: intensitySchema,
  durationMin: z.number().int().min(1).max(MAX_EXERTION_DURATION_MIN).nullish(),
  note: z.string().trim().max(MAX_EXERTION_NOTE_CHARS).nullish(),
});

export const exertionEventUpdateSchema = z
  .object({
    label: labelSchema.optional(),
    occurredAt: occurredAtSchema.optional(),
    intensity: intensitySchema.optional(),
    durationMin: z
      .number()
      .int()
      .min(1)
      .max(MAX_EXERTION_DURATION_MIN)
      .nullish(),
    note: z.string().trim().max(MAX_EXERTION_NOTE_CHARS).nullish(),
  })
  .refine(
    (v) =>
      v.label !== undefined ||
      v.occurredAt !== undefined ||
      v.intensity !== undefined ||
      v.durationMin !== undefined ||
      v.note !== undefined,
    "At least one field is required",
  );

export const exertionEventListQuerySchema = z.object({
  from: isoDateTime().optional(),
  to: isoDateTime().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_EXERTION_EVENTS_PAGE)
    .default(200),
});
