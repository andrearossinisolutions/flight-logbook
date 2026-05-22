-- CreateTable
CREATE TABLE "_ReminderCovers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ReminderCovers_A_fkey" FOREIGN KEY ("A") REFERENCES "PartnershipAircraftReminder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ReminderCovers_B_fkey" FOREIGN KEY ("B") REFERENCES "PartnershipAircraftReminder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnershipAircraftReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aircraftId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "hoursInterval" DECIMAL,
    "monthsInterval" INTEGER,
    "lastCompletedHours" DECIMAL NOT NULL DEFAULT 0,
    "lastCompletedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnershipAircraftReminder_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "PartnershipAircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnershipAircraftReminder" ("aircraftId", "createdAt", "description", "hoursInterval", "id", "lastCompletedHours", "updatedAt") SELECT "aircraftId", "createdAt", "description", "hoursInterval", "id", "lastCompletedHours", "updatedAt" FROM "PartnershipAircraftReminder";
DROP TABLE "PartnershipAircraftReminder";
ALTER TABLE "new_PartnershipAircraftReminder" RENAME TO "PartnershipAircraftReminder";
CREATE INDEX "PartnershipAircraftReminder_aircraftId_idx" ON "PartnershipAircraftReminder"("aircraftId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ReminderCovers_AB_unique" ON "_ReminderCovers"("A", "B");

-- CreateIndex
CREATE INDEX "_ReminderCovers_B_index" ON "_ReminderCovers"("B");
