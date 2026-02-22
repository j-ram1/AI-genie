-- CreateTable
CREATE TABLE "AiQuestionText" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "attrKey" TEXT NOT NULL,
    "answerType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuestionText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiQuestionText_themeId_idx" ON "AiQuestionText"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuestionText_themeId_attrKey_answerType_key" ON "AiQuestionText"("themeId", "attrKey", "answerType");
