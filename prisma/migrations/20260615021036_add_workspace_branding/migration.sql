-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brandColor" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);
