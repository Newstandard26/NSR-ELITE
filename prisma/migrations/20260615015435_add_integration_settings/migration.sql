-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "acculynxLeadSourceId" TEXT,
    "triggerStatusIds" JSONB,
    "milestoneMap" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);
