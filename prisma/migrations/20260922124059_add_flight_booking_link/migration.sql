-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementId" TEXT NOT NULL,
    "partnershipAircraftId" TEXT,
    "bookingId" TEXT,
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
    "intermediatePlaces" TEXT,
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
    CONSTRAINT "Flight_partnershipAircraftId_fkey" FOREIGN KEY ("partnershipAircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Flight_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "PartnershipBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Flight" ("aircraft", "aircraftRegistration", "aircraftType", "arrivalPlace", "createdAt", "durationMinutes", "engineOff", "engineOn", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "intermediatePlaces", "movementId", "partnershipAircraftId", "passengerName", "rentalCost", "rentalRateApplied", "takeoffPlace", "totalCost", "updatedAt") SELECT "aircraft", "aircraftRegistration", "aircraftType", "arrivalPlace", "createdAt", "durationMinutes", "engineOff", "engineOn", "hobbsEndMinutes", "hobbsStartMinutes", "id", "inputMode", "instructorCost", "instructorMinutes", "instructorName", "instructorRateApplied", "intermediatePlaces", "movementId", "partnershipAircraftId", "passengerName", "rentalCost", "rentalRateApplied", "takeoffPlace", "totalCost", "updatedAt" FROM "Flight";
DROP TABLE "Flight";
ALTER TABLE "new_Flight" RENAME TO "Flight";
CREATE UNIQUE INDEX "Flight_movementId_key" ON "Flight"("movementId");
CREATE UNIQUE INDEX "Flight_bookingId_key" ON "Flight"("bookingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
