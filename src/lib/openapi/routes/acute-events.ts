/**
 * OpenAPI route table for acute stressor events (`/api/acute-events`).
 *
 * Part of the OpenAPI route table; aggregated in `./index.ts`. Request
 * bodies and queries reuse the runtime Zod schemas from
 * `@/lib/acute-events/shared` so the wire contract stays single-source; the
 * response shapes mirror the DTO the route serialises (decrypted note).
 *
 * Every route is owner-only, the life-event posture: no share reaches acute
 * events, and the section is dropped from the model projection, so a model
 * never sees the words, only the day's intensity series.
 */
import type { ZodOpenApiObject } from "zod-openapi";
import { z } from "zod/v4";

import {
  acuteEventCreateSchema,
  acuteEventListQuerySchema,
  acuteEventUpdateSchema,
} from "@/lib/acute-events/shared";

import {
  dataEnvelope,
  errorEnvelope,
  idempotencyKeyParameter,
  idempotentWrite,
  recordWriteRateLimitResponse,
  stdResponses,
} from "./shared";

const OWNER_ONLY =
  "Owner-only: no share reaches acute events, not a whole-record share or MANAGE, and not a guardian acting for a managed profile. A quarrel at home is as personal as a loss.";

const createAcuteEventRequest = acuteEventCreateSchema.meta({
  id: "CreateAcuteEventRequest",
  description:
    "Log one acute stressor event. `category` is the closed list (HOME, WORK, COMMUTE, FINANCE, OTHER); `intensity` is 0-10. `occurredAt` defaults to now and may not lie in the future beyond five minutes. The note is encrypted at rest.",
});

const updateAcuteEventRequest = acuteEventUpdateSchema.meta({
  id: "UpdateAcuteEventRequest",
  description:
    "Partial edit of one event. `note: null` clears the note; an omitted key leaves the column untouched.",
});

const listAcuteEventsQuery = acuteEventListQuerySchema.meta({
  id: "ListAcuteEventsQuery",
  description:
    "Optional `from` / `to` (ISO instants, inclusive) and `category`; `limit` (1-500, default 200). Newest first.",
});

const acuteEvent = z
  .object({
    id: z.string(),
    category: z.enum(["HOME", "WORK", "COMMUTE", "FINANCE", "OTHER"]),
    occurredAt: z.string(),
    intensity: z.number().int(),
    note: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({
    id: "AcuteEvent",
    description:
      "One acute stressor event: the category, when, how bad it was (0-10), and the decrypted note. The intensity feeds the ACUTE_EVENT correlation channel; the note never reaches a model.",
  });

const acuteEventList = z
  .object({
    events: z.array(acuteEvent),
    limit: z.number().int(),
    hasMore: z.boolean(),
  })
  .meta({
    id: "AcuteEventList",
    description:
      "A page of acute events, newest first. `hasMore` is true exactly when an event past this page exists; page on with `to` set to the oldest `occurredAt` seen.",
  });

const pathId = { path: z.object({ id: z.string() }) };

const notFound = {
  "404": {
    description: "No such acute event on this account.",
    content: { "application/json": { schema: errorEnvelope } },
  },
};

const invalid = {
  "422": {
    description:
      "A field failed validation (`acuteEvents.invalid`): an unknown category, an intensity outside 0-10, or a time in the future beyond five minutes.",
    content: { "application/json": { schema: errorEnvelope } },
  },
};

export const acuteEventPaths: NonNullable<ZodOpenApiObject["paths"]> = {
  "/api/acute-events": {
    get: {
      tags: ["Records"],
      summary: "List acute events",
      description: `The account's own acute stressor events, newest first. ${OWNER_ONLY}`,
      requestParams: { query: listAcuteEventsQuery },
      responses: {
        "200": {
          description: "The acute events.",
          content: {
            "application/json": {
              schema: dataEnvelope(acuteEventList, "AcuteEventListEnvelope"),
            },
          },
        },
        ...stdResponses,
      },
    },
    post: {
      parameters: [idempotencyKeyParameter],
      tags: ["Records"],
      summary: "Log an acute event",
      description: `A same-day stressor: what kind, how bad, when. ${OWNER_ONLY}`,
      requestBody: {
        required: true,
        content: { "application/json": { schema: createAcuteEventRequest } },
      },
      responses: {
        "201": {
          description: "Created.",
          content: {
            "application/json": {
              schema: dataEnvelope(acuteEvent, "CreateAcuteEventEnvelope"),
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
  "/api/acute-events/{id}": {
    patch: {
      tags: ["Records"],
      summary: "Edit an acute event",
      description: `A partial edit; an omitted key leaves the column untouched. ${OWNER_ONLY}`,
      requestParams: pathId,
      requestBody: {
        required: true,
        content: { "application/json": { schema: updateAcuteEventRequest } },
      },
      responses: {
        "200": {
          description: "Updated.",
          content: {
            "application/json": {
              schema: dataEnvelope(acuteEvent, "UpdateAcuteEventEnvelope"),
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
      summary: "Delete an acute event",
      description: `Hard-deletes one acute event. ${OWNER_ONLY}`,
      requestParams: pathId,
      responses: {
        "200": {
          description: "Deleted.",
          content: {
            "application/json": {
              schema: dataEnvelope(
                z.object({ deleted: z.literal(true) }),
                "DeleteAcuteEventEnvelope",
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
