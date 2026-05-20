/*
  Warnings:

  - Added the required column `expiresAt` to the `PartnershipInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PartnershipFixedCost" ADD COLUMN "billingMonth" INTEGER;
ALTER TABLE "PartnershipFixedCost" ADD COLUMN "billingYear" INTEGER;

-- CreateTable
CREATE TABLE "PartnershipMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipMessage_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipInvitation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipInvitation" ("createdAt", "email", "id", "partnershipId", "role", "updatedAt") SELECT "createdAt", "email", "id", "partnershipId", "role", "updatedAt" FROM "PartnershipInvitation";
DROP TABLE "PartnershipInvitation";
ALTER TABLE "new_PartnershipInvitation" RENAME TO "PartnershipInvitation";
CREATE UNIQUE INDEX "PartnershipInvitation_partnershipId_email_key" ON "PartnershipInvitation"("partnershipId", "email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
