import { PrismaClient } from '@prisma/client';

async function test() {
    const prisma = new PrismaClient();
    await prisma.gameSession.create({
        data: {
            userId: 'test',
            themeId: 'test',
            status: 'ACTIVE',
            mode: 'TEST',
            prompt: 'test',
        }
    });
}
