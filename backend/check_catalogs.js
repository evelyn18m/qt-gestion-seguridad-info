const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL || 'mysql://sgsi_user:sgsi_password@localhost:3306/sgsi_db';
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  const prob = await prisma.probabilidad.findMany();
  console.log('PROBABILIDADES:', JSON.stringify(prob, null, 2));
  const ries = await prisma.riesgo.findMany();
  console.log('RIESGOS:', JSON.stringify(ries, null, 2));
}

main().finally(() => prisma.$disconnect());
