import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL as string;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Backfilling Activo catalog from existing ValoracionActivo records...');

  const valoraciones = await prisma.valoracionActivo.findMany({
    select: { nombreActivo: true },
    distinct: ['nombreActivo'],
  });

  let created = 0;
  let skipped = 0;

  for (const v of valoraciones) {
    const nombre = v.nombreActivo?.trim();
    if (!nombre) {
      skipped++;
      continue;
    }
    const existing = await prisma.activo.findUnique({ where: { nombre } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.activo.create({ data: { nombre } });
    created++;
  }

  console.log(`Backfill complete: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
