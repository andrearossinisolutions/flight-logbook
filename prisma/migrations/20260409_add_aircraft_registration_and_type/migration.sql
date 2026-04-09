ALTER TABLE "Flight" ADD COLUMN "aircraftRegistration" TEXT NOT NULL DEFAULT 'I-4150';
ALTER TABLE "Flight" ADD COLUMN "aircraftType" TEXT NOT NULL DEFAULT 'P92';

UPDATE "Flight"
SET "aircraftType" = COALESCE(NULLIF("aircraft", ''), 'P92')
WHERE "aircraftType" = 'P92';