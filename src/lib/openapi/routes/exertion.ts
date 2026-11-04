/**
 * OpenAPI route table for everyday exertion events (`/api/exertion`).
 *
 * Part of the OpenAPI route table; aggregated in `./index.ts`. Request
 * bodies and queries reuse the runtime Zod schemas from
 * `@/lib/exertion/shared` so the wire contract stays single-source; the
 * response shapes mirror the DTO the route serialises (decrypted label and
 * note).
 *
 * Every route is owner-only, the life-event posture. The intensity feeds
 * the EXERTION correlation channel; the label and note never reach a model
 * as anything but a fenced title.
 */
import type { ZodOpenApiObject } from "zod-openapi";
import { z } from "zod/v4";

import {
  exertionEventCreateSchema,
  exertionEventListQuerySchema,
  exertionEventUpdateSchema,
} from "@/lib/exertion/shared";

import {
  dataEnvelope,
  errorEnvelope,
  idempotencyKeyParameter,
  idempotentWrite,
  recordWriteRateLimitResponse,
  stdResponses,
} from "./shared";

const OWNER_ONLY =
  "Owner-only: no share reaches exertion entries, not a whole-record share or MANAGE, and not a guardian acting for a managed profile.";

const createExertionRequest = exertionEventCreateSchema.meta({
  id: "CreateExertionEventRequest",
  description:
    "Log one everyday exertion entry. `label` (1-60 characters, encrypted at rest) is what it was in the person's own words; `intensity` is 0-10 perceived exertion; `durationMin` (1-1440) is optional. `occurredAt` defaults to now and may not lie in the future beyond five minutes.",
});

const updateExertionRequest = exertionEventUpdateSchema.meta({
  id: "UpdateExertionEventRequest",
  description:
    "Partial edit of one entry. `note: null` clears the note, `durationMin: null` makes it untimed; an omitted key leaves the column untouched.",
});

const listExertionQuery = exertionEventListQuerySchema.meta({
  id: "ListExertionEventsQuery",
  description:
    "Optional `from` / `to` (ISO instants, inclusive); `limit` (1-500, default 200). Newest first.",
});

const exertionEvent = z
  .object({
    id: z.string(),
    label: z.string().nullable(),
    occurredAt: z.string(),
    intensity: z.number().int(),
    durationMin: z.number().int().nullable(),
    note: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({
    id: "ExertionEvent",
    description:
      "One everyday exertion entry: what it was (decrypted label), when, how heavy it felt (0-10), how long it took, and the decrypted note. The intensity feeds the EXERTION correlation channel.",
  });

const exertionEventList = z
  .object({
    events: z.array(exertionEvent),
    limit: z.number().int(),
    hasMore: z.boolean(),
  })
  .meta({
    id: "ExertionEventList",
    description:
      "A page of exertion entries, newest first. `hasMore` is true exactly when an entry past this page exists; page on with `to` set to the oldest `occurredAt` seen.",
  });

const pathId = { path: z.object({ id: z.string() }) };

const notFound = {
  "404": {
    description: "No such exertion entry on this account.",
    content: { "application/json": { schema: errorEnvelope } },
  },
};

const invalid = {
  "422": {
    description:
      "A field failed validation (`exertion.invalid`): an empty or over-long label, an intensity outside 0-10, a duration outside 1-1440, or a time in the future beyond five minutes.",
    content: { "application/json": { schema: errorEnvelope } },
  },
};

export const exertionPaths: NonNullable<ZodOpenApiObject["paths"]> = {
  "/api/exertion": {
    get: {
      tags: ["Records"],
      summary: "List exertion entries",
      description: `The account's own everyday exertion entries, newest first. ${OWNER_ONLY}`,
      requestParams: { query: listExertionQuery },
      responses: {
        "200": {
          description: "The exertion entries.",
          content: {
            "application/json": {
              schema: dataEnvelope(
                exertionEventList,
                "ExertionEventListEnvelope",
              ),
            },
          },
        },
        ...stdResponses,
      },
    },
    post: {
      parameters: [idempotencyKeyParameter],
      tags: ["Records"],
      summary: "Log an exertion entry",
      description: `Everyday load beyond the ordinary: what it was, how heavy, how long, when. ${OWNER_ONLY}`,
      requestBody: {
        required: true,
        content: { "application/json": { schema: createExertionRequest } },
      },
      responses: {
        "201": {
          description: "Created.",
          content: {
            "application/json": {
              schema: dataEnvelope(
                exertionEvent,
                "CreateExertionEventEnvelope",
              ),
            },
          },
        },
        ...invalid,
        ...stdResponses,
        ...recordWriteRateLimitResponse,
        ...idempotentWrite(),
      },
    },
  },
  "/api/exertion/{id}": {
    patch: {
      tags: ["Records"],
      summary: "Edit an exertion entry",
      description: `A partial edit; an omitted key leaves the column untouched. ${OWNER_ONLY}`,
      requestParams: pathId,
      requestBody: {
        required: true,
        content: { "application/json": { schema: updateExertionRequest } },
      },
      responses: {
        "200": {
          description: "Updated.",
          content: {
            "application/json": {
              schema: dataEnvelope(
                exertionEvent,
                "UpdateExertionEventEnvelope",
              ),
            },
          },
        },
        ...notFound,
        ...invalid,
        ...stdResponses,
      },
    },
    delete: {
      tags: ["Records"],
      summary: "Delete an exertion entry",
      description: `Hard-deletes one exertion entry. ${OWNER_ONLY}`,
      requestParams: pathId,
      responses: {
        "200": {
          description: "Deleted.",
          content: {
            "application/json": {
              schema: dataEnvelope(
                z.object({ deleted: z.literal(true) }),
                "DeleteExertionEventEnvelope",
              ),
            },
          },
        },
        ...notFound,
        ...stdResponses,
      },
    },
  },
};
