/**
 * Everyday exertion events: the server-only half. Label and note crypto and
 * the row to wire mapper. The label (what it was, the person's own words)
 * and the optional note are held AES-256-GCM encrypted in Bytes columns
 * through the shared codec, and decrypted fail-soft on read: a key gap on
 * one row reads `null` rather than taking the page down.
 */
import { decryptFromBytes, encryptToBytes } from "@/lib/ai/coach/bytes-codec";
import { getEvent } from "@/lib/logging/context";
import type { ExertionEvent } from "@/generated/prisma/client";

import type { ExertionEventDTO } from "./shared";

export * from "./shared";

/** Encrypt an exertion label or note for storage. */
export function encryptExertionText(
  plaintext: string,
): Uint8Array<ArrayBuffer> {
  return encryptToBytes(plaintext);
}

/** Decrypt a stored label or note; null on a missing or unreadable value. */
export function decryptExertionText(
  buf: Uint8Array | null,
  field: "label" | "note",
): string | null {
  if (!buf || buf.byteLength === 0) return null;
  try {
    return decryptFromBytes(buf);
  } catch (err) {
    getEvent()?.addWarning(
      `exertion ${field} decrypt failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

export function toExertionEventDTO(row: ExertionEvent): ExertionEventDTO {
  return {
    id: row.id,
    label: decryptExertionText(row.labelEncrypted, "label"),
    occurredAt: row.occurredAt.toISOString(),
    intensity: row.intensity,
    durationMin: row.durationMin,
    note: decryptExertionText(row.noteEncrypted, "note"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
