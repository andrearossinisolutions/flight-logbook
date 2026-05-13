-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipFixedCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipFixedCost_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipFixedCost" ("amount", "createdAt", "description", "id", "partnershipId", "updatedAt") SELECT "amount", "createdAt", "description", "id", "partnershipId", "updatedAt" FROM "PartnershipFixedCost";
DROP TABLE "PartnershipFixedCost";
ALTER TABLE "new_PartnershipFixedCost" RENAME TO "PartnershipFixedCost";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
