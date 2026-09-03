-- CreateTable
CREATE TABLE "AnimeCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "staleAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AnimeCache_staleAt_idx" ON "AnimeCache"("staleAt");

-- CreateIndex
CREATE INDEX "AnimeCache_expiresAt_idx" ON "AnimeCache"("expiresAt");
