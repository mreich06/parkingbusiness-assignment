-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTOR');

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "buildingId" TEXT NOT NULL,
    "isResident" BOOLEAN NOT NULL,
    "vehicleType" "VehicleType",

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Space" (
    "id" SERIAL NOT NULL,
    "buildingId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "zoneId" INTEGER NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "checkedInAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMPTZ,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Space_buildingId_number_key" ON "Space"("buildingId", "number");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express partial unique indexes: one session in progress per space and per plate
CREATE UNIQUE INDEX "Session_spaceId_active_key" ON "Session"("spaceId") WHERE "checkedOutAt" IS NULL;
CREATE UNIQUE INDEX "Session_licensePlate_active_key" ON "Session"("licensePlate") WHERE "checkedOutAt" IS NULL;

-- Layout of building PB-AMS-2M8D: zones 1 = residents, 2 = visitor cars, 3 = visitor motorcycles
INSERT INTO "Zone" ("buildingId", "isResident", "vehicleType") VALUES
  ('PB-AMS-2M8D', true, NULL),
  ('PB-AMS-2M8D', false, 'CAR'),
  ('PB-AMS-2M8D', false, 'MOTOR');
INSERT INTO "Space" ("buildingId", "number", "zoneId")
SELECT 'PB-AMS-2M8D', n, CASE WHEN n <= 50 THEN 1 WHEN n <= 130 THEN 2 ELSE 3 END
FROM generate_series(1, 150) AS n ORDER BY n;
