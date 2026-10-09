-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "weatherShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Settings_weatherShareToken_key" ON "Settings"("weatherShareToken");
