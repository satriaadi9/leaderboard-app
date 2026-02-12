// scripts/backfill_history.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling hasNegativeHistory...');
  
  // Find all ClassPointsTotals
  const totals = await prisma.classPointsTotal.findMany({
      select: { id: true, classId: true, studentId: true }
  });
  
  console.log(`Checking ${totals.length} records...`);

  let updated = 0;
  for (const t of totals) {
      // Check for negative delta in ledger
      const hasNegative = await prisma.pointsLedger.count({
          where: {
              classId: t.classId,
              studentId: t.studentId,
              delta: { lt: 0 }
          }
      });

      if (hasNegative > 0) {
          await prisma.classPointsTotal.update({
              where: { id: t.id },
              data: { hasNegativeHistory: true }
          });
          updated++;
      }
  }

  console.log(`Backfill complete. Updated ${updated} records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
