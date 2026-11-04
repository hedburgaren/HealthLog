-- Acute stressor events and everyday exertion entries.
--
-- An acute event is a same-day stressor with a 0-10 intensity (a quarrel at
-- home, a conflict at work, something frightening on the commute); an
-- exertion event is everyday physical load beyond the ordinary, also with a
-- 0-10 perceived intensity (the grocery haul up three flights of stairs).
-- Both feed their intensity into the correlation matrix; the free text on
-- both is AES-256-GCM encrypted at rest and never reaches a model.
-- Idempotent, so a re-run of a half-applied migration converges.
-- @retry-on-lock-timeout

DO $migration$
BEGIN
    PERFORM set_config('lock_timeout', '5s', true);

    DO $$ BEGIN
      CREATE TYPE "acute_event_category" AS ENUM ('HOME', 'WORK', 'COMMUTE', 'FINANCE', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "acute_events" (
      "id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "category" "acute_event_category" NOT NULL,
      "occurred_at" TIMESTAMP(3) NOT NULL,
      "intensity" INTEGER NOT NULL,
      "note_encrypted" BYTEA,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "acute_events_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "acute_events_user_id_occurred_at_idx"
      ON "acute_events" ("user_id", "occurred_at");

    DO $$ BEGIN
      ALTER TABLE "acute_events"
        ADD CONSTRAINT "acute_events_intensity_check"
        CHECK ("intensity" >= 0 AND "intensity" <= 10);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "acute_events"
        ADD CONSTRAINT "acute_events_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "exertion_events" (
      "id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "label_encrypted" BYTEA NOT NULL,
      "occurred_at" TIMESTAMP(3) NOT NULL,
      "intensity" INTEGER NOT NULL,
      "duration_min" INTEGER,
      "note_encrypted" BYTEA,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "exertion_events_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "exertion_events_user_id_occurred_at_idx"
      ON "exertion_events" ("user_id", "occurred_at");

    DO $$ BEGIN
      ALTER TABLE "exertion_events"
        ADD CONSTRAINT "exertion_events_intensity_check"
        CHECK ("intensity" >= 0 AND "intensity" <= 10);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "exertion_events"
        ADD CONSTRAINT "exertion_events_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
END
$migration$;
