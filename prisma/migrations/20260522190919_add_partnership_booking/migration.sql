-- CreateTable
CREATE TABLE "PartnershipBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipBooking_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipBooking_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PartnershipBooking_partnershipId_idx" ON "PartnershipBooking"("partnershipId");

-- CreateIndex
CREATE INDEX "PartnershipBooking_aircraftId_idx" ON "PartnershipBooking"("aircraftId");

-- CreateIndex
CREATE INDEX "PartnershipBooking_userId_idx" ON "PartnershipBooking"("userId");
