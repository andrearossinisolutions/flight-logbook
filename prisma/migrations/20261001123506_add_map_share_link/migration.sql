-- CreateTable
CREATE TABLE "MapShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "includeFuturePlans" BOOLEAN NOT NULL DEFAULT false,
    "passengerFilter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MapShareLink_token_key" ON "MapShareLink"("token");

-- CreateIndex
CREATE INDEX "MapShareLink_userId_idx" ON "MapShareLink"("userId");
