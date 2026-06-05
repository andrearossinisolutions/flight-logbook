-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maintenanceLogId" TEXT,
    "recipientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipTransaction_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_maintenanceLogId_fkey" FOREIGN KEY ("maintenanceLogId") REFERENCES "PartnershipAircraftMaintenanceLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipTransaction" ("amount", "createdAt", "date", "description", "id", "maintenanceLogId", "partnershipId", "type", "updatedAt", "userId") SELECT "amount", "createdAt", "date", "description", "id", "maintenanceLogId", "partnershipId", "type", "updatedAt", "userId" FROM "PartnershipTransaction";
DROP TABLE "PartnershipTransaction";
ALTER TABLE "new_PartnershipTransaction" RENAME TO "PartnershipTransaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
