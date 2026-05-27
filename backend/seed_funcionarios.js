const XLSX = require('xlsx');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  const wb = XLSX.readFile(process.argv[2] || 'C:\\Users\\pasantetic\\Desktop\\qt-gestionseguridadinformacion\\documentos\\funcionarios.xlsx');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Hoja1']);

  const seenFunc = new Set();
  const seenArea = new Set();

  for (const row of rows) {
    const func = (row['__EMPTY_1'] || '').trim();
    const area = (row['__EMPTY_2'] || '').trim();

    if (func && func !== 'FUNCIONARIO' && !seenFunc.has(func)) {
      await prisma.funcionario.create({ data: { nombre: func } });
      seenFunc.add(func);
    }
    if (area && area !== 'ÁREA' && !seenArea.has(area)) {
      await prisma.area.create({ data: { nombre: area } });
      seenArea.add(area);
    }
  }

  console.log(`Seeded ${seenFunc.size} funcionarios and ${seenArea.size} areas`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
