import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function checkAiQuestions() {
    try {
        const questions = await prisma.aiQuestionText.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        console.log('--- Latest AI Questions ---');
        if (questions.length === 0) {
            console.log('No AI questions found in database.');
        } else {
            questions.forEach((q, i) => {
                console.log(`${i + 1}. [${q.themeId} / ${q.attrKey}]: "${q.text}" (Created: ${q.createdAt})`);
            });
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkAiQuestions(); // NOSONAR

