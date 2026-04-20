-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rentalRatePerHour" DECIMAL NOT NULL DEFAULT 150,
    "instructorRatePerHour" DECIMAL NOT NULL DEFAULT 80,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultBase" TEXT,
    "dateMonoExam" DATETIME,
    "dateMedicalExam" DATETIME,
    "dateBipoExam" DATETIME,
    "dateFoniaExam" DATETIME,
    "dateAdvanced" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("createdAt", "currency", "dateAdvanced", "dateBipoExam", "dateFoniaExam", "dateMedicalExam", "dateMonoExam", "defaultBase", "id", "instructorRatePerHour", "rentalRatePerHour", "updatedAt", "userId") SELECT "createdAt", "currency", "dateAdvanced", "dateBipoExam", "dateFoniaExam", "dateMedicalExam", "dateMonoExam", "defaultBase", "id", "instructorRatePerHour", "rentalRatePerHour", "updatedAt", "userId" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
