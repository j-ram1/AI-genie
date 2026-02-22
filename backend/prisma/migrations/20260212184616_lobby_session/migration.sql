-- CreateTable
CREATE TABLE "LobbySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "selectedThemeId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LobbySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LobbySession_userId_key" ON "LobbySession"("userId");

-- CreateIndex
CREATE INDEX "LobbySession_userId_status_idx" ON "LobbySession"("userId", "status");

-- AddForeignKey
ALTER TABLE "LobbySession" ADD CONSTRAINT "LobbySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
