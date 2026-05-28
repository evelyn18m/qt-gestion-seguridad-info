/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const connectionString = process.env.DATABASE_URL as string;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  const jsonPath = path.join(__dirname, '../catalogos.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('catalogos.json not found. Run analysis first.');
    return;
  }

  let content = fs.readFileSync(jsonPath, 'utf8');
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const data = JSON.parse(content);

  // --- Formato ---
  console.log('Seeding Formato...');
  const formatos = data['catalogo formato'];
  for (const f of formatos) {
    if (f['Formato']) {
      await prisma.formato.create({
        data: { nombre: f['Formato'] },
      });
    }
  }

  // --- Subprocesos ---
  console.log('Seeding Subproceso...');
  const subprocesos = data['catalogo sunprocesos'];
  for (const s of subprocesos) {
    if (s['Subproceso']) {
      await prisma.subproceso.create({
        data: { nombre: s['Subproceso'] },
      });
    }
  }

  // --- MacroProcesos ---
  console.log('Seeding MacroProceso...');
  const macroProcesos = data['catalogo macroProceso'];
  for (const m of macroProcesos) {
    if (m['Proceso Macro']) {
      await prisma.macroProceso.create({
        data: { nombre: m['Proceso Macro'] },
      });
    }
  }

  // --- TipoActivo ---
  console.log('Seeding TipoActivo...');
  const tiposActivo = data['catalogo tipo deactivo'];
  for (const t of tiposActivo) {
    if (t['tipo de activo']) {
      await prisma.tipoActivo.create({
        data: {
          nombre: t['tipo de activo'],
          detalle: t['detalle'] || '',
        },
      });
    }
  }

  // --- Valoracion ---
  console.log('Seeding Valoracion...');
  const valoraciones = data['catalogo de valoracion'];
  for (const v of valoraciones) {
    if (v['valoracion']) {
      await prisma.valoracion.create({
        data: { nombre: v['valoracion'] },
      });
    }
  }

  // --- Vulnerabilidades ---
  console.log('Seeding Vulnerabilidades...');
  const vulnData = data['catalogo de vulnerabilidades'];
  const knownVulnCategories = new Set([
    'Hardware',
    'Software',
    'Red',
    'Personal',
    'Sitio',
    'Organización',
  ]);
  let currentVulnCat = '';
  for (const v of vulnData) {
    const catField =
      v['CATÁLOGO DE VULNERABILIDADES TÍPICAS\r\nFuente: ISO/IEC 27005:2022'];
    const descField = v['__EMPTY'];

    if (!catField && !descField) continue;
    if (catField === 'CATEGORIA' || descField === 'VULNERABILIDAD') continue;

    // Row with both fields: first data row of a group
    if (catField && descField) {
      currentVulnCat = catField;
      await prisma.vulnerabilidad.create({
        data: { categoria: catField, descripcion: descField },
      });
      continue;
    }

    // Row with only catField: category header (rare)
    if (catField && !descField) {
      currentVulnCat = catField;
      continue;
    }

    // Row with only descField: use known categories to avoid heuristics like wordCount
    if (!catField && descField) {
      if (knownVulnCategories.has(descField)) {
        currentVulnCat = descField;
      } else {
        await prisma.vulnerabilidad.create({
          data: { categoria: currentVulnCat, descripcion: descField },
        });
      }
    }
  }

  // --- Amenazas ---
  console.log('Seeding Amenazas...');
  const amenazaData = data['catalogo amenazas'];
  let currentAmenazaCat = '';
  for (const a of amenazaData) {
    const field0 = a['__EMPTY'];
    const field1 = a['__EMPTY_1'];
    const field2 = a['__EMPTY_2'];

    if (field0 === 'CATEGORIA' || field1 === 'AMENAZA') continue;
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
          tipoFuente: field2 || null,
        },
      });
    } else if (field1 && currentAmenazaCat) {
      await prisma.amenaza.create({
        data: {
          categoria: currentAmenazaCat,
          nombre: field1,
          tipoFuente: field2 || null,
        },
      });
    }
  }

  // --- Impacto ---
  console.log('Seeding Impacto...');
  const impactoData = data['catalogo de impacto'];
  let currentImpactType = '';
  for (const i of impactoData) {
    const val =
      i['Tabla de valoración de Impacto en los activos de la información'];
    const criterio = i['__EMPTY'];

    if (val && val.includes('perdida de ')) {
      const parts = val.split('perdida de la ');
      if (parts.length > 1) {
        currentImpactType = parts[1].trim();
      } else {
        const parts2 = val.split('perdida de ');
        if (parts2.length > 1) currentImpactType = parts2[1].trim();
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
            criterio: criterio || '',
          },
        });
      }
    }
  }

  // --- TipoControl ---
  console.log('Seeding TipoControl...');
  const tipoControlData = data['Catalo Tipo de Control'];
  for (const tc of tipoControlData) {
    if (tc['Tipo de Control']) {
      await prisma.tipoControl.create({
        data: { nombre: tc['Tipo de Control'] },
      });
    }
  }

  // --- Riesgo ---
  console.log('Seeding Riesgo...');
  const riesgoData = data['Catalogo de Riesgo'];
  for (const r of riesgoData) {
    const evalText = r['Tabla de evaluacion del Riesgo'];
    if (!evalText) continue;
    const valMatch = evalText.match(/\((\d)\)/);
    await prisma.riesgo.create({
      data: {
        evaluacion: evalText,
        valor: valMatch ? parseInt(valMatch[1]) : null,
      },
    });
  }

  // --- Funcionarios & Areas (from Excel) ---
  console.log('Seeding Funcionarios & Areas from Excel...');
  const wb = XLSX.readFile(process.argv[2] || './documentos/funcionarios.xlsx');
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

  console.log(
    `Seeded ${seenFunc.size} funcionarios and ${seenArea.size} areas`,
  );

  // --- Probabilidades ---
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
