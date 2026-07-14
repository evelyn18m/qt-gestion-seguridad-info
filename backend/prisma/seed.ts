/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { seedControlCatalogFromSql } from '../src/catalogos/control-catalog-seed';
import { parseRiesgoRows } from '../src/catalogos/riesgo-parser';
import {
  seedEstadosPlanTratamiento,
  seedOpcionesTratamiento,
  seedPlazosImplementacion,
} from './seed-plan-tratamiento';

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

  // --- Control Catalogs (source-of-truth SQL) ---
  console.log('Seeding Control Catalogs from SQL source...');
  const controlCatalogSqlPath = path.join(
    __dirname,
    '../documentos/controles_implementar.sql',
  );
  await seedControlCatalogFromSql(prisma, controlCatalogSqlPath);
  console.log('Control Catalogs seeding completed (idempotent upserts).');

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

  // --- MacroProcesos ---
  console.log('Seeding MacroProceso...');
  const macroProcesos = data['catalogo macroProceso'];
  const codigoToIdMap = new Map<string, number>();
  for (const m of macroProcesos) {
    if (m['Proceso Macro']) {
      const codigoMatch = m['Proceso Macro'].match(/\((\w+)\)$/);
      const codigo = codigoMatch ? codigoMatch[1] : '';
      const created = await prisma.macroProceso.create({
        data: { nombre: m['Proceso Macro'], codigo },
      });
      codigoToIdMap.set(codigo, created.id);
    }
  }

  // --- Subprocesos (depends on MacroProceso being seeded first) ---
  console.log('Seeding Subproceso...');
  const subprocesos = data['catalogo sunprocesos'];
  for (const s of subprocesos) {
    if (s['Subproceso']) {
      const codeMatch = s['Subproceso'].match(/^\((\w+)\)/);
      const codigo = codeMatch ? codeMatch[1] : '';
      const macroProcesoId = codigoToIdMap.get(codigo);
      if (!macroProcesoId) {
        console.warn(
          `[seed] WARNING: MacroProceso not found for code "${codigo}" in "${s['Subproceso']}" — skipping row`,
        );
        continue;
      }
      await prisma.subproceso.create({
        data: { nombre: s['Subproceso'], macroProcesoId },
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
  const parsedRiesgo = parseRiesgoRows(riesgoData);
  for (const r of parsedRiesgo) {
    await prisma.riesgo.create({
      data: { tipo: r.tipo, nivel: r.nivel, valor: r.valor },
    });
  }

  // --- Funcionarios & Areas (from Excel) ---
  console.log('Seeding Funcionarios & Areas from Excel...');
  const wb = XLSX.readFile(process.argv[2] || './documentos/Empleado.xlsx');
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], {
    raw: false,
    header: ['nombre', 'correo', 'area'],
    defval: '',
  });

  const seenFunc = new Set();
  const seenArea = new Set();

  for (const row of rows) {
    const func = row.nombre?.trim();
    const area = row.area?.trim();
    let areaDB;

    if (area && area !== 'Direccion' && !seenArea.has(area)) {
      areaDB = await prisma.area.create({ data: { nombre: area } });
      seenArea.add(area);
    } else {
      areaDB = await prisma.area.findFirst({ where: { nombre: area } });
    }

    if (func && func !== 'Nombre del empleado' && !seenFunc.has(func)) {
      await prisma.funcionario.create({
        data: {
          nombre: func,
          correo: row.correo?.trim() || null,
          areaId: areaDB?.id || null,
        },
      });
      seenFunc.add(func);
    }
  }

  console.log(
    `Seeded ${seenFunc.size} funcionarios and ${seenArea.size} areas`,
  );

  // --- Probabilidades ---
  console.log('Seeding Probabilidades...');
  const probabilidades = [
    { nombre: 'Bajo', valor: 1 },
    { nombre: 'Medio', valor: 2 },
    { nombre: 'Alto', valor: 3 },
  ];
  for (const p of probabilidades) {
    await prisma.probabilidad.create({ data: p });
  }

  // --- Plan de Tratamiento reference catalogs ---
  console.log('Seeding OpcionTratamiento...');
  await seedOpcionesTratamiento(prisma);
  console.log('Seeding EstadoPlanTratamiento...');
  await seedEstadosPlanTratamiento(prisma);
  console.log('Seeding PlazoImplementacion...');
  await seedPlazosImplementacion(prisma);

  // --- Usuario admin local ---
  console.log('Seeding local admin user...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      roles: JSON.stringify(['administrador']),
      primerInicio: false,
      habilitado: true,
    },
    update: {
      passwordHash,
      roles: JSON.stringify(['administrador']),
      primerInicio: false,
      habilitado: true,
    },
  });
  console.log(`Admin user seeded: ${admin.username} (id: ${admin.id})`);
  // Seed tipos de datos personales
  const tiposDatosPersonales = [
    { nombre: 'Publica' },
    { nombre: 'Uso interno' },
    { nombre: 'Confidencial' },
  ];
  for (const tipoDatosPersonal of tiposDatosPersonales) {
    await prisma.tipoDatosPersonales.create({ data: tipoDatosPersonal });
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
