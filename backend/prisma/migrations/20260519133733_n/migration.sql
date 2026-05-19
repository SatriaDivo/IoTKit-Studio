/*
  Warnings:

  - You are about to drop the column `authType` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `headerKey` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `headerPrefix` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshBody` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshExpiryPath` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshHeaders` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshMethod` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenPath` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `refreshUrl` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `AuthConfig` table. All the data in the column will be lost.
  - You are about to drop the column `newTokenHash` on the `RefreshLog` table. All the data in the column will be lost.
  - You are about to drop the column `oldTokenHash` on the `RefreshLog` table. All the data in the column will be lost.
  - You are about to drop the column `responseTime` on the `RefreshLog` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `RefreshLog` table. All the data in the column will be lost.
  - Added the required column `clientId` to the `AuthConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `AuthConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `AuthConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenEndpoint` to the `AuthConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `success` to the `RefreshLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthConfig" DROP COLUMN "authType",
DROP COLUMN "headerKey",
DROP COLUMN "headerPrefix",
DROP COLUMN "refreshBody",
DROP COLUMN "refreshExpiryPath",
DROP COLUMN "refreshHeaders",
DROP COLUMN "refreshMethod",
DROP COLUMN "refreshTokenPath",
DROP COLUMN "refreshUrl",
DROP COLUMN "token",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientSecret" TEXT NOT NULL,
ADD COLUMN     "currentToken" TEXT,
ADD COLUMN     "customBody" JSONB,
ADD COLUMN     "grantType" TEXT NOT NULL DEFAULT 'client_credentials',
ADD COLUMN     "provider" TEXT NOT NULL,
ADD COLUMN     "refreshBeforeExpiry" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "scope" TEXT,
ADD COLUMN     "tokenEndpoint" TEXT NOT NULL,
ALTER COLUMN "refreshEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "RefreshLog" DROP COLUMN "newTokenHash",
DROP COLUMN "oldTokenHash",
DROP COLUMN "responseTime",
DROP COLUMN "status",
ADD COLUMN     "newTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "oldTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "success" BOOLEAN NOT NULL;

-- CreateIndex
CREATE INDEX "AuthConfig_active_idx" ON "AuthConfig"("active");
