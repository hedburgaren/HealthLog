/**
 * The acute events slice of the backup payload schema.
 *
 * Part of the acute-events backup domain, beside its export and restore.
 * Loaded only through `src/lib/validations/backup.ts`, which composes every
 * slice into `backupPayloadSchema` on first use (the schema is ~12 MB of
 * heap; see `backup-schema-lazy-guard.test.ts`).
 */
import { z } from "zod/v4";
import { AcuteEventCategory } from "@/generated/prisma/enums";
import { base64BytesSchema, isoDateTime } from "@/lib/export/backup-schema-kit";

/**
 * An acute stressor event. `note` / `noteEncrypted` are the two ends of the
 * free-text contract: a portable file carries the plaintext, a
 * disaster-recovery file the ciphertext. The rows are hard-deleted, so a
 * disaster-recovery file has no tombstone to carry.
 */
export const acuteEventBackupSchema = z
  .object({
    id: z.string().min(1).optional(),
    category: z.enum(AcuteEventCategory),
    occurredAt: isoDateTime,
    intensity: z.number().int().min(0).max(10),
    note: z.string().nullable().optional(),
    noteEncrypted: base64BytesSchema.nullable().optional(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .passthrough();
