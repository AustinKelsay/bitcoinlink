-- CreateTable
CREATE TABLE "NWC" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxAmount" INTEGER NOT NULL,
    "numLinks" INTEGER NOT NULL,

    CONSTRAINT "NWC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "linkIndex" TEXT NOT NULL,
    "nwcId" TEXT NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_linkIndex_key" ON "Link"("linkIndex");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_nwcId_fkey" FOREIGN KEY ("nwcId") REFERENCES "NWC"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
