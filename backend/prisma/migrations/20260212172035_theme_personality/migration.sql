-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personality" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Personality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityAlias" (
    "id" TEXT NOT NULL,
    "personalityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "PersonalityAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityAttribute" (
    "id" TEXT NOT NULL,
    "personalityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PersonalityAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeAttributeConfig" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "groupId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ThemeAttributeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalityAlias_personalityId_idx" ON "PersonalityAlias"("personalityId");

-- CreateIndex
CREATE INDEX "PersonalityAttribute_key_idx" ON "PersonalityAttribute"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityAttribute_personalityId_key_key" ON "PersonalityAttribute"("personalityId", "key");

-- CreateIndex
CREATE INDEX "ThemeAttributeConfig_themeId_idx" ON "ThemeAttributeConfig"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeAttributeConfig_themeId_key_key" ON "ThemeAttributeConfig"("themeId", "key");

-- AddForeignKey
ALTER TABLE "Personality" ADD CONSTRAINT "Personality_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityAlias" ADD CONSTRAINT "PersonalityAlias_personalityId_fkey" FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityAttribute" ADD CONSTRAINT "PersonalityAttribute_personalityId_fkey" FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeAttributeConfig" ADD CONSTRAINT "ThemeAttributeConfig_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
