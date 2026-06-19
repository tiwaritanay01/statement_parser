import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(txs.map(t => ({ id: t.id, desc: t.description, confidence: t.confidence })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
