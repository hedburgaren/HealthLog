/**
 * Acute stressor events.
 *
 *   GET  /api/acute-events: newest first, optionally narrowed by `from` and
 *        `to` (ISO instants) and by `category`; at most 500 per page.
 *   POST /api/acute-events: log one (`{ category, intensity, occurredAt?,
 *        note? }`). `occurredAt` defaults to now and may not lie in the
 *        future beyond the shared five-minute skew. The note is encrypted at
 *        rest.
 *
 * Owner-only, the way the life-event routes are: a quarrel at home or
 * something frightening on the commute is as personal as a loss, and no
 * share level was ever worded for it, so no delegate reaches it. Bare
 * `requireAuth()`, which refuses under an acting-account switch and refuses
 * a narrow Bearer scope. Sharing acute events is a separate decision for a
 * later release. The routes answer whether or not the `timeline` module is
 * on (the data-layer posture of the life-event routes); the module gates the
 * surfaces, and the correlation matrix skips the channel when it is off.
 */
import { NextRequest } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { apiHandler, requireAuth } from "@/lib/api-handler";
import {
  apiSuccess,
  getClientIp,
  returnAllZodIssues,
} from "@/lib/api-response";
import { auditLog } from "@/lib/auth/audit";
import { parseJsonBody } from "@/lib/api/body";
import {
  acuteEventCreateSchema,
  acuteEventListQuerySchema,
} from "@/lib/acute-events/shared";
import {
  encryptAcuteEventNote,
  toAcuteEventDTO,
} from "@/lib/acute-events/server";
import { invalidateUserHealthContext } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { listPage } from "@/lib/http/list-query";
import { annotate } from "@/lib/logging/context";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  const { user } = await requireAuth();

  const sp = request.nextUrl.searchParams;
  const parsed = acuteEventListQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    category: sp.get("category") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return returnAllZodIssues(parsed.error, 422, {
      errorCode: "acuteEvents.invalid",
    });
  }
  const q = parsed.data;

  const occurredAt: Prisma.DateTimeFilter = {};
  if (q.from) occurredAt.gte = new Date(q.from);
  if (q.to) occurredAt.lte = new Date(q.to);

  const { rows, cap } = await listPage(q.limit, (take) =>
    prisma.acuteEvent.findMany({
      where: {
        userId: user.id,
        ...(q.from || q.to ? { occurredAt } : {}),
        // The schema narrows the string to the closed category set; the
        // cast tells the generated enum type that.
        ...(q.category ? { category: q.category as never } : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take,
    }),
  );

  annotate({
    action: { name: "acute_event.list", entity_type: "acute_event" },
    meta: { count: rows.length, limit: q.limit },
  });

  return apiSuccess({
    events: rows.map(toAcuteEventDTO),
    limit: q.limit,
    // Exact: true only when a row past this page exists. `rows.length ===
    // limit` said true on a page that was exactly full, and the client then
    // asked for a page that held nothing.
    hasMore: cap.truncated,
  });
});

// A retry from a flaky connection re-sends the same `Idempotency-Key` and gets
// the first answer back instead of a second occurrence at the same minute.
export const POST = apiHandler(withIdempotency<[NextRequest]>(postEvent));

async function postEvent(request: NextRequest): Promise<Response> {
  const { user } = await requireAuth();

  const parsed = await parseJsonBody(request, acuteEventCreateSchema, {
    maxBytes: 16 * 1024,
    errorCode: "acuteEvents.invalid",
  });
  if (!parsed.ok) return parsed.error;
  const entry = parsed.data;

  const created = await prisma.acuteEvent.create({
    data: {
      userId: user.id,
      // The schema narrows the string to the closed category set; the cast
      // tells the generated enum type that.
      category: entry.category as never,
      occurredAt: entry.occurredAt ?? new Date(),
      intensity: entry.intensity,
      noteEncrypted: entry.note ? encryptAcuteEventNote(entry.note) : null,
    },
  });

  await auditLog("acute_event.create", {
    userId: user.id,
    ipAddress: getClientIp(request),
    // The category is the shape of what happened, safe to audit; the note is
    // the person's own words and never reaches the audit log.
    details: {
      eventId: created.id,
      category: created.category,
      intensity: created.intensity,
    },
  });

  invalidateUserHealthContext(user.id);

  annotate({
    action: {
      name: "acute_event.create",
      entity_type: "acute_event",
      entity_id: created.id,
    },
    meta: { category: created.category },
  });

  return apiSuccess(toAcuteEventDTO(created), 201);
}
