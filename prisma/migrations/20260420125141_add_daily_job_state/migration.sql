-- CreateTable
CREATE TABLE "DailyJobState" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastRunDateKey" TEXT,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
