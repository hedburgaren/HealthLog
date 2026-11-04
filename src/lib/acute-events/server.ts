/**
 * Acute stressor events: the server-only half. Note crypto and the row to
 * wire mapper. The note is free text in the person's own words, held
 * AES-256-GCM encrypted in a Bytes column through the shared codec (the same
 * codec the life-event title uses), and decrypted fail-soft on read: a key
 * gap on one row reads `null` rather than taking the page down.
 */
import { decryptFromBytes, encryptToBytes } from "@/lib/ai/coach/bytes-codec";
import { getEvent } from "@/lib/logging/context";
import type { AcuteEvent } from "@/generated/prisma/client";

import type { AcuteEventCategory, AcuteEventDTO } from "./shared";

export * from "./shared";

/** Encrypt an acute-event note for storage. */
export function encryptAcuteEventNote(
  plaintext: string,
): Uint8Array<ArrayBuffer> {
  return encryptToBytes(plaintext);
}

/** Decrypt a stored note; null on a missing or unreadable value. */
export function decryptAcuteEventNote(buf: Uint8Array | null): string | null {
  if (!buf || buf.byteLength === 0) return null;
  try {
    return decryptFromBytes(buf);
  } catch (err) {
    getEvent()?.addWarning(
      `acute event note decrypt failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

export function toAcuteEventDTO(row: AcuteEvent): AcuteEventDTO {
  return {
    id: row.id,
    category: row.category as AcuteEventCategory,
    occurredAt: row.occurredAt.toISOString(),
    intensity: row.intensity,
    note: decryptAcuteEventNote(row.noteEncrypted),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
