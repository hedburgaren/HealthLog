/**
 * Everyday exertion events, with both backup ends in one file.
 *
 * Same arrangement as `life-events-backup.ts`: a reader asking "is this
 * carried at both ends?" answers it here, and a reader who greps only the
 * restore route gets a false negative because the route delegates.
 *
 * ## Free text follows the note contract
 *
 * A disaster-recovery payload carries the label and note ciphertext
 * verbatim as base64, which the same instance's key reads back unchanged. A
 * portable export decrypts both, because a portable file exists to be
 * readable by the person who owns it and to restore under another
 * instance's key. Text this instance cannot decrypt travels as the visible
 * unreadable marker rather than as nothing, the rule `records-backup.ts`
 * states for notes.
 *
 * The rows are hard-deleted (no tombstones), and nothing references an
 * exertion entry and an exertion entry references nothing but its owner, so
 * the section restores in any order against the others.
 */
import { Buffer } from "node:buffer";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { decryptFromBytes, encryptToBytes } from "@/lib/ai/coach/bytes-codec";
import { getEvent } from "@/lib/logging/context";

import { UNREADABLE_EXPORT_MARKER } from "./unreadable-marker";

export interface ExertionBackupOptions {
  purpose?: "portable-export" | "disaster-recovery";
}

/** One exertion entry as the backup carries it. */
export interface ExertionEventBackupEntry {
  /** Present in a disaster-recovery payload. */
  id?: string;
  /** Plaintext; present on a portable payload. */
  label?: string;
  /** Ciphertext as base64; present on a disaster-recovery payload. */
  labelEncrypted?: string;
  occurredAt: string;
  intensity: number;
  durationMin: number | null;
  /** Plaintext; present on a portable payload. */
  note?: string | null;
  /** Ciphertext as base64; present on a disaster-recovery payload. */
  noteEncrypted?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExertionBackupSection {
  exertionEvents: ExertionEventBackupEntry[];
}

export interface ExertionBackupCounts {
  exertionEvents: number;
}

function base64(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}

function readTextForExport(buf: Uint8Array, field: "label" | "note"): string {
  try {
    return decryptFromBytes(buf);
  } catch (err) {
    getEvent()?.addWarning(
      `exertion ${field} decrypt failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return UNREADABLE_EXPORT_MARKER;
  }
}

function readNoteForExport(buf: Uint8Array | null): string | null {
  if (!buf || buf.byteLength === 0) return null;
  return readTextForExport(buf, "note");
}

/** Build the exertion slice of a user's full backup. */
export async function buildExertionBackupSection(
  prisma: Pick<PrismaClient, "exertionEvent">,
  userId: string,
  options: ExertionBackupOptions = {},
): Promise<ExertionBackupSection> {
  const disasterRecovery = options.purpose === "disaster-recovery";
  const rows = await prisma.exertionEvent.findMany({
    where: { userId },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  return {
    exertionEvents: rows.map((row) => ({
      ...(disasterRecovery
        ? {
            id: row.id,
            labelEncrypted: base64(row.labelEncrypted),
            noteEncrypted: row.noteEncrypted ? base64(row.noteEncrypted) : null,
          }
        : {
            label: readTextForExport(row.labelEncrypted, "label"),
            note: readNoteForExport(row.noteEncrypted),
          }),
      occurredAt: row.occurredAt.toISOString(),
      intensity: row.intensity,
      durationMin: row.durationMin,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export function countExertionBackupSection(
  section: ExertionBackupSection,
): ExertionBackupCounts {
  return { exertionEvents: section.exertionEvents.length };
}

/** Counts the exertion restore wiped, for the audit trail. */
export interface ExertionRestoreCleared {
  exertionEvents: number;
}

/**
 * What the parser hands over, which is looser than what the builder writes:
 * a file from before the feature carries no key at all, and optional
 * columns arrive as `undefined` rather than `null`.
 */
export interface ExertionRestoreInput {
  exertionEvents: Array<{
    id?: string | undefined;
    label?: string | undefined;
    labelEncrypted?: string | undefined;
    occurredAt: string;
    intensity: number;
    durationMin?: number | null | undefined;
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
 * Re-create the account's exertion entries. Delete-then-recreate inside the
 * caller's transaction, like every other section.
 */
export async function restoreExertionData(
  tx: Prisma.TransactionClient,
  ownerId: string,
  payload: ExertionRestoreInput,
): Promise<ExertionRestoreCleared> {
  const cleared = await tx.exertionEvent.deleteMany({
    where: { userId: ownerId },
  });

  if (payload.exertionEvents.length > 0) {
    await tx.exertionEvent.createMany({
      data: payload.exertionEvents.map((event) => ({
        ...(event.id ? { id: event.id } : {}),
        userId: ownerId,
        labelEncrypted:
          event.labelEncrypted !== undefined
            ? decodeBytes(event.labelEncrypted)
            : encryptToBytes(event.label ?? ""),
        occurredAt: new Date(event.occurredAt),
        intensity: event.intensity,
        durationMin: event.durationMin ?? null,
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

  return { exertionEvents: cleared.count };
}
