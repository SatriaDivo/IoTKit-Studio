/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `Simulation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Simulation" ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastPayload" TEXT,
ADD COLUMN     "lastResponse" TEXT,
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'interval',
ADD COLUMN     "moduleName" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN     "payloadKind" TEXT,
ADD COLUMN     "payloadOptions" TEXT,
ADD COLUMN     "targetCount" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'idle',
ALTER COLUMN "interval" SET DEFAULT 5000;

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "filePathRelative" TEXT,
    "fileSizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "delimiter" TEXT NOT NULL DEFAULT ',',
    "loadedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastLoadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dataset_moduleName_isActive_idx" ON "Dataset"("moduleName", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_moduleName_fileName_key" ON "Dataset"("moduleName", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_jobId_key" ON "Simulation"("jobId");

-- CreateIndex
CREATE INDEX "Simulation_moduleName_status_idx" ON "Simulation"("moduleName", "status");

-- CreateIndex
CREATE INDEX "Simulation_projectId_status_idx" ON "Simulation"("projectId", "status");
