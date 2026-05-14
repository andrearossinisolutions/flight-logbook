-- CreateTable
CREATE TABLE "PartnershipTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipTransaction_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
