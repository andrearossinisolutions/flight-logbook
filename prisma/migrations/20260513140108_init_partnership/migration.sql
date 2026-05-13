-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PartnershipMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipMember_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnershipMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnershipAircraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hourlyFuelCost" DECIMAL NOT NULL DEFAULT 0,
    "hourlyMaintCost" DECIMAL NOT NULL DEFAULT 0,
    "hourlyEngineFund" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraft_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnershipFixedCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnershipId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipFixedCost_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementId" TEXT NOT NULL,
    "partnershipAircraftId" TEXT,
    "aircraft" TEXT NOT NULL DEFAULT 'P92',
    "aircraftRegistration" TEXT NOT NULL DEFAULT 'I-4150',
    "aircraftType" TEXT NOT NULL DEFAULT 'P92',
    "inputMode" TEXT NOT NULL,
    "hobbsStartMinutes" INTEGER,
    "hobbsEndMinutes" INTEGER,
    "durationMinutes" INTEGER NOT NULL,
    "passengerName" TEXT,
    "instructorName" TEXT,
    "instructorMinutes" INTEGER NOT NULL,
    "takeoffPlace" TEXT,
    "arrivalPlace" TEXT,
    "engineOn" DATETIME,
    "engineOff" DATETIME,
    "rentalRateApplied" DECIMAL NOT NULL,
    "instructorRateApplied" DECIMAL NOT NULL,
    "rentalCost" DECIMAL NOT NULL,
    "instructorCost" DECIMAL NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flight_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Flight_partnershipAircraftId_fkey" FOREIGN KEY ("partnershipAircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Flight" ("aircraft", "aircraftRegistration", "aircraftType", "arrivalPlace", "createdAt", "durationMinutes", "engineOff", "engineOn", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "movementId", "passengerName", "rentalCost", "rentalRateApplied", "takeoffPlace", "totalCost", "updatedAt") SELECT "aircraft", "aircraftRegistration", "aircraftType", "arrivalPlace", "createdAt", "durationMinutes", "engineOff", "engineOn", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "movementId", "passengerName", "rentalCost", "rentalRateApplied", "takeoffPlace", "totalCost", "updatedAt" FROM "Flight";
DROP TABLE "Flight";
ALTER TABLE "new_Flight" RENAME TO "Flight";
CREATE UNIQUE INDEX "Flight_movementId_key" ON "Flight"("movementId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipMember_partnershipId_userId_key" ON "PartnershipMember"("partnershipId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipAircraft_registration_key" ON "PartnershipAircraft"("registration");
