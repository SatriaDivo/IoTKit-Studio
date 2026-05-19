/*
  Warnings:

  - A unique constraint covering the columns `[webhookToken]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "headers" TEXT,
ADD COLUMN     "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookToken" TEXT;

-- AlterTable
ALTER TABLE "Simulation" ADD COLUMN     "stages" TEXT,
ADD COLUMN     "swarmCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "swarmMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "projectId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "token" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "refreshEnabled" BOOLEAN NOT NULL DEFAULT false,
    "refreshUrl" TEXT,
    "refreshMethod" TEXT DEFAULT 'POST',
    "refreshBody" JSONB,
    "refreshHeaders" JSONB,
    "refreshTokenPath" TEXT,
    "refreshExpiryPath" TEXT,
    "customHeaders" JSONB,
    "headerKey" TEXT DEFAULT 'Authorization',
    "headerPrefix" TEXT DEFAULT 'Bearer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshLog" (
    "id" TEXT NOT NULL,
    "authConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "oldTokenHash" TEXT,
    "newTokenHash" TEXT,
    "errorMessage" TEXT,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthConfig_projectId_key" ON "AuthConfig"("projectId");

-- CreateIndex
CREATE INDEX "AuthConfig_projectId_idx" ON "AuthConfig"("projectId");

-- CreateIndex
CREATE INDEX "RefreshLog_authConfigId_createdAt_idx" ON "RefreshLog"("authConfigId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_webhookToken_key" ON "Project"("webhookToken");

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthConfig" ADD CONSTRAINT "AuthConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshLog" ADD CONSTRAINT "RefreshLog_authConfigId_fkey" FOREIGN KEY ("authConfigId") REFERENCES "AuthConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
