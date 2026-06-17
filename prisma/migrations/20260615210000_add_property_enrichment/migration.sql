-- CreateTable
CREATE TABLE "PropertyRecord" (
    "id" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ownerName" TEXT,
    "ownerOccupied" BOOLEAN,
    "mailingAddress" TEXT,
    "yearBuilt" INTEGER,
    "sqft" INTEGER,
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "lotSizeSqft" INTEGER,
    "lastSalePrice" INTEGER,
    "lastSaleDate" TIMESTAMP(3),
    "assessedValue" INTEGER,
    "avmValue" INTEGER,
    "avmLow" INTEGER,
    "avmHigh" INTEGER,
    "estimatedEquity" INTEGER,
    "mortgageBalanceEst" INTEGER,
    "estimatedIncomeBand" TEXT,
    "phones" JSONB,
    "emails" JSONB,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyRecord_normalizedAddress_key" ON "PropertyRecord"("normalizedAddress");

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "propertyRecordId" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_propertyRecordId_idx" ON "Lead"("propertyRecordId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "PropertyRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
