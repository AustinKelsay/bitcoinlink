-- CreateTable
CREATE TABLE "NWC" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxAmount" INTEGER NOT NULL,

    CONSTRAINT "NWC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLink" (
    "id" TEXT NOT NULL,
    "nwcId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RewardLink" ADD CONSTRAINT "RewardLink_nwcId_fkey" FOREIGN KEY ("nwcId") REFERENCES "NWC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
