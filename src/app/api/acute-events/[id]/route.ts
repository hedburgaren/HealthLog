/**
 * One acute stressor event.
 *
 *   PATCH  /api/acute-events/{id}: change the category, time, intensity or
 *          note. Field by field; a note that is absent from the body leaves
 *          the stored one alone, a null note clears it.
 *   DELETE /api/acute-events/{id}: remove it.
 *
 * Owner-scoped (another account's id is a 404), the life-event posture: bare
 * `requireAuth()` on every verb, no delegate reaches these rows. The note is
 * never logged.
 */
import { NextRequest } from "next/server";

import { apiHandler, requireAuth } from "@/lib/api-handler";
import { apiSuccess, apiError, getClientIp } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/api/body";
import { acuteEventUpdateSchema } from "@/lib/acute-events/shared";
import {
  decryptAcuteEventNote,
  encryptAcuteEventNote,
  toAcuteEventDTO,
} from "@/lib/acute-events/server";
import { auditLog } from "@/lib/auth/audit";
import { invalidateUserHealthContext } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";
import { annotate } from "@/lib/logging/context";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function notFound(): Response {
  return apiError("Acute event not found", 404, {
    errorCode: "acuteEvents.event.notFound",
  });
}

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const { user } = await requireAuth();

    const { id } = await params;
    const parsed = await parseJsonBody(request, acuteEventUpdateSchema, {
      maxBytes: 16 * 1024,
      errorCode: "acuteEvents.invalid",
    });
    if (!parsed.ok) return parsed.error;
    const entry = parsed.data;

    const existing = await prisma.acuteEvent.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        category: true,
        occurredAt: true,
        intensity: true,
        noteEncrypted: true,
      },
    });
    if (!existing) return notFound();

    const updated = await prisma.acuteEvent.update({
      where: { id: existing.id },
      data: {
        ...(entry.category !== undefined
          ? { category: entry.category as never }
          : {}),
        ...(entry.occurredAt !== undefined
          ? { occurredAt: entry.occurredAt }
          : {}),
        ...(entry.intensity !== undefined
          ? { intensity: entry.intensity }
          : {}),
        ...(entry.note !== undefined
          ? {
              noteEncrypted: entry.note
                ? encryptAcuteEventNote(entry.note)
                : null,
            }
          : {}),
      },
    });

    await auditLog("acute_event.update", {
      userId: user.id,
      ipAddress: getClientIp(request),
      details: {
        eventId: id,
        category: updated.category,
        intensity: updated.intensity,
        // The note is the person's own words: the audit row says it changed,
        // never what it says now.
        noteChanged: entry.note !== undefined,
        noteWasPresent: decryptAcuteEventNote(existing.noteEncrypted) !== null,
      },
    });

    invalidateUserHealthContext(user.id);

    annotate({
      action: {
        name: "acute_event.update",
        entity_type: "acute_event",
        entity_id: id,
      },
    });

    return apiSuccess(toAcuteEventDTO(updated));
  },
);

export const DELETE = apiHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const { user } = await requireAuth();

    const { id } = await params;
    const existing = await prisma.acuteEvent.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        category: true,
        occurredAt: true,
        intensity: true,
      },
    });
    if (!existing) return notFound();

    await prisma.acuteEvent.delete({ where: { id: existing.id } });

    await auditLog("acute_event.delete", {
      userId: user.id,
      ipAddress: getClientIp(request),
      // The row is gone after this; the audit row says what it was. The note
      // is the person's own words and stays out of it.
      details: {
        eventId: id,
        category: existing.category,
        intensity: existing.intensity,
        effectiveAt: existing.occurredAt,
      },
    });

    invalidateUserHealthContext(user.id);

    annotate({
      action: {
        name: "acute_event.delete",
        entity_type: "acute_event",
        entity_id: id,
      },
    });

    return apiSuccess({ deleted: true });
  },
);
