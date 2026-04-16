/*
  Warnings:

  - Made the column `instructorMinutes` on table `Flight` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementId" TEXT NOT NULL,
    "aircraft" TEXT NOT NULL DEFAULT 'P92',
    "aircraftRegistration" TEXT NOT NULL DEFAULT 'I-4150',
    "aircraftType" TEXT NOT NULL DEFAULT 'P92',
    "inputMode" TEXT NOT NULL,
    "hobbsStartMinutes" INTEGER,
    "hobbsEndMinutes" INTEGER,
    "durationMinutes" INTEGER NOT NULL,
    "passengerName" TEXT,
    "instructorName" TEXT,
    "instructorMinutes" INTEGER NOT NULL,
    "takeoffPlace" TEXT,
    "arrivalPlace" TEXT,
    "engineOn" DATETIME,
    "engineOff" DATETIME,
    "rentalRateApplied" DECIMAL NOT NULL,
    "instructorRateApplied" DECIMAL NOT NULL,
    "rentalCost" DECIMAL NOT NULL,
    "instructorCost" DECIMAL NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flight_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Flight" ("aircraft", "aircraftRegistration", "aircraftType", "createdAt", "durationMinutes", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "movementId", "passengerName", "rentalCost", "rentalRateApplied", "totalCost", "updatedAt") SELECT "aircraft", "aircraftRegistration", "aircraftType", "createdAt", "durationMinutes", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "movementId", "passengerName", "rentalCost", "rentalRateApplied", "totalCost", "updatedAt" FROM "Flight";
DROP TABLE "Flight";
ALTER TABLE "new_Flight" RENAME TO "Flight";
CREATE UNIQUE INDEX "Flight_movementId_key" ON "Flight"("movementId");
CREATE TABLE "new_Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "notes" TEXT,
    "isDraft" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movement" ("amount", "createdAt", "date", "id", "isDraft", "notes", "type", "updatedAt", "userId") SELECT "amount", "createdAt", "date", "id", "isDraft", "notes", "type", "updatedAt", "userId" FROM "Movement";
DROP TABLE "Movement";
ALTER TABLE "new_Movement" RENAME TO "Movement";
CREATE INDEX "Movement_userId_date_idx" ON "Movement"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
