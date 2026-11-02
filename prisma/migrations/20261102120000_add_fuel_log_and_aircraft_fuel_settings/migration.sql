-- AlterTable
ALTER TABLE "PartnershipAircraft" ADD COLUMN "tankCapacityLiters" REAL NOT NULL DEFAULT 0;
ALTER TABLE "PartnershipAircraft" ADD COLUMN "fuelBurnLitersPerHour" REAL NOT NULL DEFAULT 0;
ALTER TABLE "PartnershipAircraft" ADD COLUMN "hangarCapacityLiters" REAL NOT NULL DEFAULT 100;
ALTER TABLE "PartnershipAircraft" ADD COLUMN "fuelPricePerLiter" REAL NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PartnershipFuelLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT,
    "tanksBeforeLiters" REAL,
    "aircraftBeforeLiters" REAL,
    "tanksAfterLiters" REAL NOT NULL,
    "aircraftAfterLiters" REAL NOT NULL,
    "refueledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnershipFuelLog_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipFuelLog_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipFuelLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PartnershipFuelLog_aircraftId_refueledAt_idx" ON "PartnershipFuelLog"("aircraftId", "refueledAt");

-- CreateIndex
CREATE INDEX "PartnershipFuelLog_partnershipId_refueledAt_idx" ON "PartnershipFuelLog"("partnershipId", "refueledAt");
