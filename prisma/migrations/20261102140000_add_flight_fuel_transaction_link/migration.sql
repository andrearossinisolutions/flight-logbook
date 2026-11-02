-- AlterTable
ALTER TABLE "PartnershipTransaction" ADD COLUMN "flightId" TEXT REFERENCES "Flight" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipTransaction_flightId_key" ON "PartnershipTransaction"("flightId");
