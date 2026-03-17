import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPresets = [
  { name: 'Attendance', points: 5 },
  { name: 'Answered question', points: 3 },
  { name: 'Presented solution', points: 7 },
  { name: 'Late to class', points: -2 },
  { name: 'Disturbing class', points: -3 },
  { name: 'Quiz winner', points: 10 },
];

async function main() {
  const classes = await prisma.class.findMany({
    include: {
      scoringPresets: true
    }
  });

  console.log(`Found ${classes.length} classes.`);

  let backfilled = 0;
  for (const cls of classes) {
    if (cls.scoringPresets.length === 0) {
      console.log(`Adding default presets to class: ${cls.name} (${cls.id})`);
      await prisma.scoringPreset.createMany({
        data: defaultPresets.map(p => ({
          ...p,
          classId: cls.id
        }))
      });
      backfilled++;
    } else {
      console.log(`Class ${cls.name} already has presets. Skipping.`);
    }
  }

  console.log(`Backfill finished. Processed ${backfilled} classes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });