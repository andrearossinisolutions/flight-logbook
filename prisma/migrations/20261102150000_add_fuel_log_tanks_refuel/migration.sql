-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipFuelLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT,
    "tanksBeforeLiters" REAL,
    "aircraftBeforeLiters" REAL,
    "tanksAfterLiters" REAL NOT NULL,
    "aircraftAfterLiters" REAL,
    "kind" TEXT NOT NULL DEFAULT 'AIRCRAFT',
    "filledLiters" REAL,
    "pricePaid" REAL,
    "refueledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnershipFuelLog_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipFuelLog_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipFuelLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipFuelLog" ("aircraftAfterLiters", "aircraftBeforeLiters", "aircraftId", "createdAt", "id", "partnershipId", "refueledAt", "tanksAfterLiters", "tanksBeforeLiters", "userId", "kind") SELECT "aircraftAfterLiters", "aircraftBeforeLiters", "aircraftId", "createdAt", "id", "partnershipId", "refueledAt", "tanksAfterLiters", "tanksBeforeLiters", "userId", 'AIRCRAFT' FROM "PartnershipFuelLog";
DROP TABLE "PartnershipFuelLog";
ALTER TABLE "new_PartnershipFuelLog" RENAME TO "PartnershipFuelLog";
CREATE INDEX "PartnershipFuelLog_aircraftId_refueledAt_idx" ON "PartnershipFuelLog"("aircraftId", "refueledAt");
CREATE INDEX "PartnershipFuelLog_partnershipId_refueledAt_idx" ON "PartnershipFuelLog"("partnershipId", "refueledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable
ALTER TABLE "PartnershipTransaction" ADD COLUMN "fuelLogId" TEXT REFERENCES "PartnershipFuelLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipTransaction_fuelLogId_key" ON "PartnershipTransaction"("fuelLogId");
