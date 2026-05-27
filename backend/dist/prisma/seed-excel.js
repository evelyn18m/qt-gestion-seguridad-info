"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const client_1 = require("@prisma/client");
const xlsx = __importStar(require("xlsx"));
const path = __importStar(require("path"));
const connectionString = process.env.DATABASE_URL;
const adapter = new adapter_mariadb_1.PrismaMariaDb(connectionString);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Loading Excel file...');
    const excelPath = path.join(__dirname, '../funcionarios.xlsx');
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    const areasSet = new Set();
    const funcionariosSet = new Set();
    for (const row of data) {
        const area = row['__EMPTY_2'];
        const funcionario = row['__EMPTY_1'];
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
//# sourceMappingURL=seed-excel.js.map