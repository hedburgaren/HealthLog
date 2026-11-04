/**
 * One everyday exertion event.
 *
 *   PATCH  /api/exertion/{id}: change the label, time, intensity, duration
 *          or note. Field by field; a note that is absent from the body
 *          leaves the stored one alone, a null note clears it.
 *   DELETE /api/exertion/{id}: remove it.
 *
 * Owner-scoped (another account's id is a 404), the life-event posture: bare
 * `requireAuth()` on every verb, no delegate reaches these rows. The label
 * and the note are never logged.
 */
import { NextRequest } from "next/server";

import { apiHandler, requireAuth } from "@/lib/api-handler";
import { apiSuccess, apiError, getClientIp } from "@/lib/api-response";
import { parseJsonBody } from "@/lib/api/body";
import {
  decryptExertionText,
  encryptExertionText,
  toExertionEventDTO,
} from "@/lib/exertion/server";
import { exertionEventUpdateSchema } from "@/lib/exertion/shared";
import { auditLog } from "@/lib/auth/audit";
import { invalidateUserHealthContext } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";
import { annotate } from "@/lib/logging/context";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function notFound(): Response {
  return apiError("Exertion event not found", 404, {
    errorCode: "exertion.event.notFound",
  });
}

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const { user } = await requireAuth();

    const { id } = await params;
    const parsed = await parseJsonBody(request, exertionEventUpdateSchema, {
      maxBytes: 16 * 1024,
      errorCode: "exertion.invalid",
    });
    if (!parsed.ok) return parsed.error;
    const entry = parsed.data;

    const existing = await prisma.exertionEvent.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        labelEncrypted: true,
        occurredAt: true,
        intensity: true,
        durationMin: true,
        noteEncrypted: true,
      },
    });
    if (!existing) return notFound();

    const updated = await prisma.exertionEvent.update({
      where: { id: existing.id },
      data: {
        ...(entry.label !== undefined
          ? { labelEncrypted: encryptExertionText(entry.label) }
          : {}),
        ...(entry.occurredAt !== undefined
          ? { occurredAt: entry.occurredAt }
          : {}),
        ...(entry.intensity !== undefined
          ? { intensity: entry.intensity }
          : {}),
        ...(entry.durationMin !== undefined
          ? { durationMin: entry.durationMin ?? null }
          : {}),
        ...(entry.note !== undefined
          ? {
              noteEncrypted: entry.note
                ? encryptExertionText(entry.note)
                : null,
            }
          : {}),
      },
    });

    await auditLog("exertion.update", {
      userId: user.id,
      ipAddress: getClientIp(request),
      details: {
        eventId: id,
        intensity: updated.intensity,
        durationMin: updated.durationMin,
        // The label and the note are the person's own words: the audit row
        // says they changed, never what they say now.
        labelChanged: entry.label !== undefined,
        noteChanged: entry.note !== undefined,
        noteWasPresent:
          decryptExertionText(existing.noteEncrypted, "note") !== null,
      },
    });

    invalidateUserHealthContext(user.id);

    annotate({
      action: {
        name: "exertion.update",
        entity_type: "exertion_event",
        entity_id: id,
      },
    });

    return apiSuccess(toExertionEventDTO(updated));
  },
);

export const DELETE = apiHandler(
  async (request: NextRequest, { params }: RouteParams) => {
    const { user } = await requireAuth();

    const { id } = await params;
    const existing = await prisma.exertionEvent.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        occurredAt: true,
        intensity: true,
        durationMin: true,
      },
    });
    if (!existing) return notFound();

    await prisma.exertionEvent.delete({ where: { id: existing.id } });

    await auditLog("exertion.delete", {
      userId: user.id,
      ipAddress: getClientIp(request),
      // The row is gone after this; the audit row says what it was. The
      // label is the person's own words and stays out of it.
      details: {
        eventId: id,
        intensity: existing.intensity,
        durationMin: existing.durationMin,
        effectiveAt: existing.occurredAt,
      },
    });

    invalidateUserHealthContext(user.id);

    annotate({
      action: {
        name: "exertion.delete",
        entity_type: "exertion_event",
        entity_id: id,
      },
    });

    return apiSuccess({ deleted: true });
  },
);
