"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const client_1 = require("@prisma/client");
const connectionString = process.env.DATABASE_URL;
const adapter = new adapter_mariadb_1.PrismaMariaDb(connectionString);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding Funcionarios...');
    const funcionarios = ['Administrador de Sistemas', 'Auditor de Seguridad', 'Analista de Riesgos', 'Gerente de TI', 'Especialista en Redes', 'Usuario Final'];
    for (const f of funcionarios) {
        await prisma.funcionario.create({ data: { nombre: f } });
    }
    console.log('Seeding Areas...');
    const areas = ['Tecnologías de la Información', 'Seguridad de la Información', 'Recursos Humanos', 'Dirección General', 'Operaciones', 'Atención al Cliente'];
    for (const a of areas) {
        await prisma.area.create({ data: { nombre: a } });
    }
    console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-extras.js.map