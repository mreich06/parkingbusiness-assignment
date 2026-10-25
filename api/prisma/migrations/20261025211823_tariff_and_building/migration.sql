-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" SERIAL NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "dailyCap" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- Tariffs 1 = residents (free), 2 = visitor cars, 3 = visitor motorcycles, matching zones 1 to 3
INSERT INTO "Building" ("id", "timezone") VALUES ('PB-AMS-2M8D', 'Europe/Amsterdam');
INSERT INTO "Tariff" ("hourlyRate", "dailyCap", "currency") VALUES (0, 0, 'EUR'), (500, 3000, 'EUR'), (300, 1800, 'EUR');

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN "tariffId" INTEGER;
UPDATE "Zone" SET "tariffId" = "id";
ALTER TABLE "Zone" ALTER COLUMN "tariffId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
