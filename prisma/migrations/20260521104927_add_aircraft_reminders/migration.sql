-- CreateTable
CREATE TABLE "PartnershipAircraftReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hoursInterval" DECIMAL NOT NULL,
    "lastCompletedHours" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraftReminder_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnershipAircraftMaintenanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedAtHours" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraftMaintenanceLog_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipAircraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hourlyFuelCost" DECIMAL NOT NULL DEFAULT 0,
    "hourlyMaintCost" DECIMAL NOT NULL DEFAULT 0,
    "hourlyEngineFund" DECIMAL NOT NULL DEFAULT 0,
    "initialHours" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraft_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipAircraft" ("createdAt", "hourlyEngineFund", "hourlyFuelCost", "hourlyMaintCost", "id", "partnershipId", "registration", "type", "updatedAt") SELECT "createdAt", "hourlyEngineFund", "hourlyFuelCost", "hourlyMaintCost", "id", "partnershipId", "registration", "type", "updatedAt" FROM "PartnershipAircraft";
DROP TABLE "PartnershipAircraft";
ALTER TABLE "new_PartnershipAircraft" RENAME TO "PartnershipAircraft";
CREATE UNIQUE INDEX "PartnershipAircraft_registration_key" ON "PartnershipAircraft"("registration");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PartnershipAircraftReminder_aircraftId_idx" ON "PartnershipAircraftReminder"("aircraftId");

-- CreateIndex
CREATE INDEX "PartnershipAircraftMaintenanceLog_aircraftId_idx" ON "PartnershipAircraftMaintenanceLog"("aircraftId");
