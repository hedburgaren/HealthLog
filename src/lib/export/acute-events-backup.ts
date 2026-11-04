/**
 * Acute stressor events, with both backup ends in one file.
 *
 * Same arrangement as `life-events-backup.ts`: a reader asking "is this
 * carried at both ends?" answers it here, and a reader who greps only the
 * restore route gets a false negative because the route delegates.
 *
 * ## Free text follows the note contract
 *
 * A disaster-recovery payload carries the note ciphertext verbatim as
 * base64, which the same instance's key reads back unchanged. A portable
 * export decrypts it, because a portable file exists to be readable by the
 * person who owns it and to restore under another instance's key. A note
 * this instance cannot decrypt travels as the visible unreadable marker
 * rather than as nothing, the rule `records-backup.ts` states for notes.
 *
 * The rows are hard-deleted (no tombstones), and nothing references an
 * acute event and an acute event references nothing but its owner, so the
 * section restores in any order against the others.
 */
import { Buffer } from "node:buffer";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { AcuteEventCategory } from "@/generated/prisma/client";

import { decryptFromBytes, encryptToBytes } from "@/lib/ai/coach/bytes-codec";
import { getEvent } from "@/lib/logging/context";

import { UNREADABLE_EXPORT_MARKER } from "./unreadable-marker";

export interface AcuteEventsBackupOptions {
  purpose?: "portable-export" | "disaster-recovery";
}

/** One acute event as the backup carries it. */
export interface AcuteEventBackupEntry {
  /** Present in a disaster-recovery payload. */
  id?: string;
  category: AcuteEventCategory;
  occurredAt: string;
  intensity: number;
  /** Plaintext; present on a portable payload. */
  note?: string | null;
  /** Ciphertext as base64; present on a disaster-recovery payload. */
  noteEncrypted?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcuteEventsBackupSection {
  acuteEvents: AcuteEventBackupEntry[];
}

export interface AcuteEventsBackupCounts {
  acuteEvents: number;
}

function base64(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}

function readTextForExport(buf: Uint8Array | null): string | null {
  if (!buf || buf.byteLength === 0) return null;
  try {
    return decryptFromBytes(buf);
  } catch (err) {
    getEvent()?.addWarning(
      `acute event note decrypt failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return UNREADABLE_EXPORT_MARKER;
  }
}

/** Build the acute-event slice of a user's full backup. */
export async function buildAcuteEventsBackupSection(
  prisma: Pick<PrismaClient, "acuteEvent">,
  userId: string,
  options: AcuteEventsBackupOptions = {},
): Promise<AcuteEventsBackupSection> {
  const disasterRecovery = options.purpose === "disaster-recovery";
  const rows = await prisma.acuteEvent.findMany({
    where: { userId },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  return {
    acuteEvents: rows.map((row) => ({
      ...(disasterRecovery
        ? {
            id: row.id,
            noteEncrypted: row.noteEncrypted ? base64(row.noteEncrypted) : null,
          }
        : {
            note: readTextForExport(row.noteEncrypted),
          }),
      category: row.category,
      occurredAt: row.occurredAt.toISOString(),
      intensity: row.intensity,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export function countAcuteEventsBackupSection(
  section: AcuteEventsBackupSection,
): AcuteEventsBackupCounts {
  return { acuteEvents: section.acuteEvents.length };
}

/** Counts the acute-event restore wiped, for the audit trail. */
export interface AcuteEventsRestoreCleared {
  acuteEvents: number;
}

/**
 * What the parser hands over, which is looser than what the builder writes:
 * a file from before the feature carries no key at all, and optional
 * columns arrive as `undefined` rather than `null`.
 */
export interface AcuteEventsRestoreInput {
  acuteEvents: Array<{
    id?: string | undefined;
    category: AcuteEventCategory;
    occurredAt: string;
    intensity: number;
    note?: string | null | undefined;
    noteEncrypted?: string | null | undefined;
    createdAt: string;
    updatedAt: string;
  }>;
}

function decodeBytes(encoded: string): Uint8Array<ArrayBuffer> {
  const decoded = Buffer.from(encoded, "base64");
  const bytes = new Uint8Array(new ArrayBuffer(decoded.byteLength));
  bytes.set(decoded);
  return bytes;
}

/**
 * Re-create the account's acute events. Delete-then-recreate inside the
 * caller's transaction, like every other section.
 */
export async function restoreAcuteEventsData(
  tx: Prisma.TransactionClient,
  ownerId: string,
  payload: AcuteEventsRestoreInput,
): Promise<AcuteEventsRestoreCleared> {
  const cleared = await tx.acuteEvent.deleteMany({
    where: { userId: ownerId },
  });

  if (payload.acuteEvents.length > 0) {
    await tx.acuteEvent.createMany({
      data: payload.acuteEvents.map((event) => ({
        ...(event.id ? { id: event.id } : {}),
        userId: ownerId,
        category: event.category,
        occurredAt: new Date(event.occurredAt),
        intensity: event.intensity,
        noteEncrypted:
          event.noteEncrypted !== undefined
            ? event.noteEncrypted === null
              ? null
              : decodeBytes(event.noteEncrypted)
            : event.note
              ? encryptToBytes(event.note)
              : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      })),
    });
  }

  return { acuteEvents: cleared.count };
}
