-- CreateTable
CREATE TABLE "PartnershipInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipInvitation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipInvitation_partnershipId_email_key" ON "PartnershipInvitation"("partnershipId", "email");
