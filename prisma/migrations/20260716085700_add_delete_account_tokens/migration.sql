-- AlterTable
ALTER TABLE "User" ADD COLUMN "deleteAccountToken" TEXT;
ALTER TABLE "User" ADD COLUMN "deleteAccountTokenExpiresAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_deleteAccountToken_key" ON "User"("deleteAccountToken");
