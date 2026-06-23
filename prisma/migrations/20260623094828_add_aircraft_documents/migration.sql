-- CreateTable
CREATE TABLE "PartnershipAircraftDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraftDocument_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PartnershipAircraftDocument_aircraftId_idx" ON "PartnershipAircraftDocument"("aircraftId");
