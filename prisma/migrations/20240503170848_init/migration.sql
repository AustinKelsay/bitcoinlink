-- CreateTable
CREATE TABLE "NWC" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxAmount" INTEGER NOT NULL,
    "numLinks" INTEGER NOT NULL,

    CONSTRAINT "NWC_pkey" PRIMARY KEY ("id")
);
