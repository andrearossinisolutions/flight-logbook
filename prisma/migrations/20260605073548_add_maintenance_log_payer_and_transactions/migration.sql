-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipAircraftMaintenanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedAtHours" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "cost" DECIMAL,
    "payerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraftMaintenanceLog_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipAircraftMaintenanceLog_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipAircraftMaintenanceLog" ("aircraftId", "cost", "createdAt", "date", "description", "id", "notes", "performedAtHours", "updatedAt") SELECT "aircraftId", "cost", "createdAt", "date", "description", "id", "notes", "performedAtHours", "updatedAt" FROM "PartnershipAircraftMaintenanceLog";
DROP TABLE "PartnershipAircraftMaintenanceLog";
ALTER TABLE "new_PartnershipAircraftMaintenanceLog" RENAME TO "PartnershipAircraftMaintenanceLog";
CREATE INDEX "PartnershipAircraftMaintenanceLog_aircraftId_idx" ON "PartnershipAircraftMaintenanceLog"("aircraftId");
CREATE TABLE "new_PartnershipTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maintenanceLogId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipTransaction_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_maintenanceLogId_fkey" FOREIGN KEY ("maintenanceLogId") REFERENCES "PartnershipAircraftMaintenanceLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipTransaction" ("amount", "createdAt", "date", "description", "id", "partnershipId", "type", "updatedAt", "userId") SELECT "amount", "createdAt", "date", "description", "id", "partnershipId", "type", "updatedAt", "userId" FROM "PartnershipTransaction";
DROP TABLE "PartnershipTransaction";
ALTER TABLE "new_PartnershipTransaction" RENAME TO "PartnershipTransaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
