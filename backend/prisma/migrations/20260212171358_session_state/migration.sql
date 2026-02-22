-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "disabledGroupIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "pendingGuessCandidateId" TEXT,
ADD COLUMN     "pendingQuestionSet" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "qaHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "selectedPersonalityId" TEXT,
ADD COLUMN     "usedAttrKeys" JSONB NOT NULL DEFAULT '[]';
