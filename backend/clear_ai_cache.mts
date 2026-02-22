
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL missing");

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Clearing AI Question Cache...');
    const deleted = await prisma.aiQuestionText.deleteMany({});
    console.log(`Deleted ${deleted.count} cached AI questions.`);
}

try {
    await main();
    await prisma.$disconnect();
    await pool.end();
} catch (e) {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
}
