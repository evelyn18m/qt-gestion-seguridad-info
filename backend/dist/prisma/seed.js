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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const xlsx = __importStar(require("xlsx"));
const connectionString = process.env.DATABASE_URL;
const adapter = new adapter_mariadb_1.PrismaMariaDb(connectionString);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const jsonPath = path.join(__dirname, '../catalogos.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('catalogos.json not found. Run analysis first.');
        return;
    }
    let content = fs.readFileSync(jsonPath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF)
        content = content.slice(1);
    const data = JSON.parse(content);
    console.log('Seeding Formato...');
    const formatos = data['catalogo formato'];
    for (const f of formatos) {
        if (f['Formato']) {
            await prisma.formato.create({
                data: { nombre: f['Formato'] }
            });
        }
    }
    console.log('Seeding Subproceso...');
    const subprocesos = data['catalogo sunprocesos'];
    for (const s of subprocesos) {
        if (s['Subproceso']) {
            await prisma.subproceso.create({
                data: { nombre: s['Subproceso'] }
            });
        }
    }
    console.log('Seeding MacroProceso...');
    const macroProcesos = data['catalogo macroProceso'];
    for (const m of macroProcesos) {
        if (m['Proceso Macro']) {
            await prisma.macroProceso.create({
                data: { nombre: m['Proceso Macro'] }
            });
        }
    }
    console.log('Seeding TipoActivo...');
    const tiposActivo = data['catalogo tipo deactivo'];
    for (const t of tiposActivo) {
        if (t['tipo de activo']) {
            await prisma.tipoActivo.create({
                data: {
                    nombre: t['tipo de activo'],
                    detalle: t['detalle'] || ''
                }
            });
        }
    }
    console.log('Seeding Valoracion...');
    const valoraciones = data['catalogo de valoracion'];
    for (const v of valoraciones) {
        if (v['valoracion']) {
            await prisma.valoracion.create({
                data: { nombre: v['valoracion'] }
            });
        }
    }
    console.log('Seeding Vulnerabilidades...');
    const vulnData = data['catalogo de vulnerabilidades'];
    const knownVulnCategories = new Set(['Hardware', 'Software', 'Red', 'Personal', 'Sitio', 'Organización']);
    let currentVulnCat = '';
    for (const v of vulnData) {
        const catField = v['CATÁLOGO DE VULNERABILIDADES TÍPICAS\r\nFuente: ISO/IEC 27005:2022'];
        const descField = v['__EMPTY'];
        if (!catField && !descField)
            continue;
        if (catField === 'CATEGORIA' || descField === 'VULNERABILIDAD')
            continue;
        if (catField && descField) {
            currentVulnCat = catField;
            await prisma.vulnerabilidad.create({
                data: { categoria: catField, descripcion: descField }
            });
            continue;
        }
        if (catField && !descField) {
            currentVulnCat = catField;
            continue;
        }
        if (!catField && descField) {
            if (knownVulnCategories.has(descField)) {
                currentVulnCat = descField;
            }
            else {
                await prisma.vulnerabilidad.create({
                    data: { categoria: currentVulnCat, descripcion: descField }
                });
            }
        }
    }
    console.log('Seeding Amenazas...');
    const amenazaData = data['catalogo amenazas'];
    let currentAmenazaCat = '';
    for (const a of amenazaData) {
        const field0 = a['__EMPTY'];
        const field1 = a['__EMPTY_1'];
        const field2 = a['__EMPTY_2'];
        if (field0 === 'CATEGORIA' || field1 === 'AMENAZA')
            continue;
        if (field0 === 'CATALOGO DE AMENAZAS TÍPICAS\r\nFuente: ISO/IEC 27005:2022')
            continue;
        if (field1 && !field0 && !field2) {
            currentAmenazaCat = field1;
            continue;
        }
        if (field1 && field0) {
            await prisma.amenaza.create({
                data: {
                    categoria: field0,
                    nombre: field1,
                    tipoFuente: field2 || null
                }
            });
        }
        else if (field1 && currentAmenazaCat) {
            await prisma.amenaza.create({
                data: {
                    categoria: currentAmenazaCat,
                    nombre: field1,
                    tipoFuente: field2 || null
                }
            });
        }
    }
    console.log('Seeding Impacto...');
    const impactoData = data['catalogo de impacto'];
    let currentImpactType = '';
    for (const i of impactoData) {
        const val = i['Tabla de valoración de Impacto en los activos de la información'];
        const criterio = i['__EMPTY'];
        if (val && val.includes('perdida de ')) {
            const parts = val.split('perdida de la ');
            if (parts.length > 1) {
                currentImpactType = parts[1].trim();
            }
            else {
                const parts2 = val.split('perdida de ');
                if (parts2.length > 1)
                    currentImpactType = parts2[1].trim();
            }
            continue;
        }
        if (val && val.includes('(')) {
            const nivelMatch = val.match(/(.*)\((\d)\)/);
            if (nivelMatch) {
                await prisma.impacto.create({
                    data: {
                        tipo: currentImpactType,
                        nivel: nivelMatch[1].trim(),
                        valor: parseInt(nivelMatch[2]),
                        criterio: criterio || ''
                    }
                });
            }
        }
    }
    console.log('Seeding TipoControl...');
    const tipoControlData = data['Catalo Tipo de Control'];
    for (const tc of tipoControlData) {
        if (tc['Tipo de Control']) {
            await prisma.tipoControl.create({
                data: { nombre: tc['Tipo de Control'] }
            });
        }
    }
    console.log('Seeding Riesgo...');
    const riesgoData = data['Catalogo de Riesgo'];
    for (const r of riesgoData) {
        const evalText = r['Tabla de evaluacion del Riesgo'];
        if (!evalText)
            continue;
        const valMatch = evalText.match(/\((\d)\)/);
        await prisma.riesgo.create({
            data: {
                evaluacion: evalText,
                valor: valMatch ? parseInt(valMatch[1]) : null,
            }
        });
    }
    console.log('Seeding Funcionarios & Areas from Excel...');
    const excelPath = path.join(__dirname, '../../documentos/funcionarios.xlsx');
    if (fs.existsSync(excelPath)) {
        const wb = xlsx.readFile(excelPath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        const areasSet = new Set();
        const funcionariosSet = new Set();
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 4)
                continue;
            const funcionario = row[2];
            const area = row[3];
            if (funcionario && typeof funcionario === 'string' && funcionario !== 'FUNCIONARIO') {
                funcionariosSet.add(funcionario.trim());
            }
            if (area && typeof area === 'string') {
                areasSet.add(area.trim());
            }
        }
        for (const a of Array.from(areasSet).sort()) {
            await prisma.area.create({ data: { nombre: a } });
        }
        for (const f of Array.from(funcionariosSet).sort()) {
            await prisma.funcionario.create({ data: { nombre: f } });
        }
        console.log(`Seeded ${areasSet.size} Areas and ${funcionariosSet.size} Funcionarios.`);
    }
    else {
        console.warn('funcionarios.xlsx not found, skipping Funcionario/Area seed.');
    }
    console.log('Seeding Probabilidades...');
    const probabilidades = ['Bajo', 'Medio', 'Alto'];
    for (const p of probabilidades) {
        await prisma.probabilidad.create({ data: { nombre: p } });
    }
    console.log('Seeding completed!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map