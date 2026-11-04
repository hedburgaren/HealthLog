/**
 * Everyday exertion events.
 *
 *   GET  /api/exertion: newest first, optionally narrowed by `from` and `to`
 *        (ISO instants); at most 500 per page.
 *   POST /api/exertion: log one (`{ label, intensity, occurredAt?,
 *        durationMin?, note? }`). `occurredAt` defaults to now and may not
 *        lie in the future beyond the shared five-minute skew. The label and
 *        the note are encrypted at rest.
 *
 * Owner-only, the way the life-event routes are: what the day asked of the
 * body, in the person's own words, is not a row a delegate needs. Bare
 * `requireAuth()`, which refuses under an acting-account switch and refuses
 * a narrow Bearer scope. The routes answer whether or not the `workouts`
 * module is on (the data-layer posture of the life-event routes); the module
 * gates the surfaces, and the correlation matrix skips the channel when it
 * is off.
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
import { encryptExertionText, toExertionEventDTO } from "@/lib/exertion/server";
import {
  exertionEventCreateSchema,
  exertionEventListQuerySchema,
} from "@/lib/exertion/shared";
import { invalidateUserHealthContext } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency";
import { listPage } from "@/lib/http/list-query";
import { annotate } from "@/lib/logging/context";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (request: NextRequest) => {
  const { user } = await requireAuth();

  const sp = request.nextUrl.searchParams;
  const parsed = exertionEventListQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return returnAllZodIssues(parsed.error, 422, {
      errorCode: "exertion.invalid",
    });
  }
  const q = parsed.data;

  const occurredAt: Prisma.DateTimeFilter = {};
  if (q.from) occurredAt.gte = new Date(q.from);
  if (q.to) occurredAt.lte = new Date(q.to);

  const { rows, cap } = await listPage(q.limit, (take) =>
    prisma.exertionEvent.findMany({
      where: {
        userId: user.id,
        ...(q.from || q.to ? { occurredAt } : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take,
    }),
  );

  annotate({
    action: { name: "exertion.list", entity_type: "exertion_event" },
    meta: { count: rows.length, limit: q.limit },
  });

  return apiSuccess({
    events: rows.map(toExertionEventDTO),
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

  const parsed = await parseJsonBody(request, exertionEventCreateSchema, {
    maxBytes: 16 * 1024,
    errorCode: "exertion.invalid",
  });
  if (!parsed.ok) return parsed.error;
  const entry = parsed.data;

  const created = await prisma.exertionEvent.create({
    data: {
      userId: user.id,
      labelEncrypted: encryptExertionText(entry.label),
      occurredAt: entry.occurredAt ?? new Date(),
      intensity: entry.intensity,
      durationMin: entry.durationMin ?? null,
      noteEncrypted: entry.note ? encryptExertionText(entry.note) : null,
    },
  });

  await auditLog("exertion.create", {
    userId: user.id,
    ipAddress: getClientIp(request),
    // The intensity and the duration are numbers, safe to audit; the label
    // is the person's own words and never reaches the audit log.
    details: {
      eventId: created.id,
      intensity: created.intensity,
      durationMin: created.durationMin,
    },
  });

  invalidateUserHealthContext(user.id);

  annotate({
    action: {
      name: "exertion.create",
      entity_type: "exertion_event",
      entity_id: created.id,
    },
    meta: { intensity: created.intensity },
  });

  return apiSuccess(toExertionEventDTO(created), 201);
}
