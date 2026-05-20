-- CreateTable
CREATE TABLE "WebhookMap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mappings" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookMap_projectId_key" ON "WebhookMap"("projectId");

-- AddForeignKey
ALTER TABLE "WebhookMap" ADD CONSTRAINT "WebhookMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
