import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL as string;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Loading Excel file...');
    const excelPath = path.join(__dirname, '../funcionarios.xlsx');
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    const areasSet = new Set<string>();
    const funcionariosSet = new Set<string>();

    for (const row of data) {
        const area = row['__EMPTY_2'];
        const funcionario = row['__EMPTY_1'];

        // Skip the header row and invalid rows
        if (funcionario === 'FUNCIONARIO' || !funcionario) {
            continue;
        }

        if (area && typeof area === 'string') {
            areasSet.add(area.trim());
        }

        if (funcionario && typeof funcionario === 'string') {
            funcionariosSet.add(funcionario.trim());
        }
    }

    const uniqueAreas = Array.from(areasSet);
    const uniqueFuncionarios = Array.from(funcionariosSet);

    console.log(`Found ${uniqueAreas.length} Areas and ${uniqueFuncionarios.length} Funcionarios.`);

    console.log('Clearing existing dummy data...');
    // Clear existing data (since no foreign keys are strictly enforced yet, or we cascade if needed)
    // We should be careful about foreign key constraints, but for now we just added dummy data.
    // Let's delete them.
    await prisma.area.deleteMany({});
    await prisma.funcionario.deleteMany({});

    console.log('Seeding Areas...');
    for (const a of uniqueAreas) {
        await prisma.area.create({ data: { nombre: a } });
    }

    console.log('Seeding Funcionarios...');
    for (const f of uniqueFuncionarios) {
        await prisma.funcionario.create({ data: { nombre: f } });
    }

    console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
