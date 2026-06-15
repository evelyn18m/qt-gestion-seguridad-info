/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * seed-dummy.ts
 *
 * Carga datos dummy desde prisma/dummy-data.json para poblar la matriz
 * de calor 3×3 de riesgos (ISO 27005).
 *
 * Los activos se referencian por valores lógicos (1=Bajo, 2=Medio, 3=Alto),
 * no por IDs de BD. Este script resuelve los IDs en tiempo de ejecución,
 * por lo que es portable entre entornos.
 *
 * Uso:
 *   docker compose exec backend npx ts-node prisma/seed-dummy.ts
 *
 * Requisito previo: haber corrido el seed principal (prisma/seed.ts)
 * para tener los catálogos poblados.
 */

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ─── Tipos para el JSON ───────────────────────────────────────────────

interface DummyAsset {
  nombre: string;
  confidencialidad: number;
  integridad: number;
  disponibilidad: number;
  probabilidad: number | null;
}

interface CatalogoImpacto {
  [tipo: string]: Record<string, string>; // tipo -> { "1": "Bajo", ... }
}

interface CatalogoProbabilidad {
  [valor: string]: string; // "1": "Bajo", ...
}

interface DummyData {
  description: string;
  catalogos: {
    impacto: CatalogoImpacto;
    probabilidad: CatalogoProbabilidad;
  };
  activos: DummyAsset[];
  matrizEsperada: {
    celdas: Record<string, number>;
    sinProbabilidad: number;
    totalActivos: number;
  };
}

// ─── Constantes ───────────────────────────────────────────────────────

const PROBABILIDAD_LABELS: Record<number, string> = {
  1: 'Bajo',
  2: 'Medio',
  3: 'Alto',
};

const JSON_PATH = path.join(__dirname, 'dummy-data.json');

// ─── Helpers ──────────────────────────────────────────────────────────

function loadDummyData(): DummyData {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`dummy-data.json no encontrado en ${JSON_PATH}`);
  }

  let content = fs.readFileSync(JSON_PATH, 'utf8');
  // Remover BOM si existe
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  return JSON.parse(content) as DummyData;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL as string;
  const adapter = new PrismaMariaDb(connectionString);
  const prisma = new PrismaClient({ adapter });

  // 1. Cargar datos dummy del JSON
  console.log('📂 Cargando dummy-data.json...');
  const dummyData = loadDummyData();
  console.log(`   ${dummyData.activos.length} activos definidos en JSON.`);

  // 2. Resolver catálogos desde la BD
  console.log('\n🔍 Resolviendo catálogos desde la BD...');

  // Impacto: buscar por tipo + valor. Tomar el registro más reciente por tipo.
  const tipoImpactos = Object.keys(dummyData.catalogos.impacto);
  const impMap: Record<string, Record<number, number>> = {};

  for (const tipo of tipoImpactos) {
    const rows = await prisma.impacto.findMany({
      where: { tipo },
      orderBy: { id: 'desc' },
      take: 3,
    });

    if (rows.length === 0) {
      throw new Error(
        `No se encontraron registros de Impacto con tipo="${tipo}". ` +
          'Corré el seed principal primero.',
      );
    }

    impMap[tipo] = {};
    for (const row of rows) {
      impMap[tipo][row.valor] = row.id;
    }

    console.log(
      `   Impacto ${tipo}: Bajo(id=${impMap[tipo][1]}), ` +
        `Medio(id=${impMap[tipo][2]}), Alto(id=${impMap[tipo][3]})`,
    );
  }

  // Probabilidad: buscar por valor
  const probById: Record<number, number> = {};

  for (const [valorStr, nombre] of Object.entries(dummyData.catalogos.probabilidad)) {
    const valor = Number(valorStr);
    const prob = await prisma.probabilidad.findFirst({
      where: { nombre, valor },
      orderBy: { id: 'desc' },
    });

    if (!prob) {
      throw new Error(
        `No se encontró Probabilidad con nombre="${nombre}" y valor=${valor}. ` +
          'Corré el seed principal primero.',
      );
    }

    probById[valor] = prob.id;
    console.log(`   Probabilidad ${nombre}: id=${prob.id}`);
  }

  // FK defaults: tomar el primer registro de cada catálogo
  const [tipoActivo] = await prisma.tipoActivo.findMany({ take: 1 });
  const [formato] = await prisma.formato.findMany({ take: 1 });
  const [macroProceso] = await prisma.macroProceso.findMany({ take: 1 });
  const [subProceso] = await prisma.subproceso.findMany({ take: 1 });
  const [funcionario] = await prisma.funcionario.findMany({ take: 1 });

  if (!tipoActivo) {
    throw new Error('No hay TipoActivo en la BD. Corré el seed principal primero.');
  }

  const defaults = {
    tipoActivoId: tipoActivo.id,
    formatoId: formato?.id ?? 1,
    macroProcesoId: macroProceso?.id ?? 1,
    subProcesoId: subProceso?.id ?? 1,
    propietarioId: funcionario?.id ?? 1,
    custodioId: funcionario?.id ?? 1,
    descripcion: 'Activo dummy generado para verificar heatmap',
    controlSeguridad: 'Control dummy',
    ubicacion: 'Oficina central',
  };

  // 3. Limpiar datos dummy anteriores
  console.log('\n🧹 Limpiando activos dummy anteriores...');
  const deleted = await prisma.valoracionActivo.deleteMany({
    where: { nombreActivo: { startsWith: 'Activo-' } },
  });
  console.log(`   ${deleted.count} activos eliminados.`);

  // 4. Crear activos desde el JSON
  console.log('\n🧪 Creando activos dummy...');
  let creados = 0;
  let errores = 0;

  for (const asset of dummyData.activos) {
    const cId = impMap['confidencialidad']?.[asset.confidencialidad];
    const iId = impMap['integridad']?.[asset.integridad];
    const dId = impMap['disponibilidad']?.[asset.disponibilidad];

    if (!cId || !iId || !dId) {
      console.warn(
        `   ⚠️  Saltando "${asset.nombre}": falta ID para ` +
          `C=${asset.confidencialidad}, I=${asset.integridad}, D=${asset.disponibilidad}`,
      );
      errores++;
      continue;
    }

    const probId = asset.probabilidad !== null ? probById[asset.probabilidad] : null;
    if (asset.probabilidad !== null && !probId) {
      console.warn(
        `   ⚠️  Saltando "${asset.nombre}": falta ID para probabilidad=${asset.probabilidad}`,
      );
      errores++;
      continue;
    }

    try {
      await prisma.valoracionActivo.create({
        data: {
          nombreActivo: asset.nombre,
          confidencialidadId: cId,
          integridadId: iId,
          disponibilidadId: dId,
          probabilidadId: probId,
          ...defaults,
        },
      });
      creados++;
    } catch (e) {
      console.error(`   ❌ Error creando "${asset.nombre}":`, (e as Error).message);
      errores++;
    }
  }

  // 5. Resumen final
  console.log(`\n✅ ${creados} activos dummy creados, ${errores} errores.`);

  if (dummyData.matrizEsperada) {
    console.log('\n📊 Matriz esperada (Impacto ↓, Probabilidad →):');
    console.log('             1.Bajo  2.Medio  3.Alto');
    console.log('   3.Alto        ' +
      `${dummyData.matrizEsperada.celdas['3_1'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['3_2'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['3_3'] ?? 0}`);
    console.log('   2.Medio       ' +
      `${dummyData.matrizEsperada.celdas['2_1'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['2_2'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['2_3'] ?? 0}`);
    console.log('   1.Bajo        ' +
      `${dummyData.matrizEsperada.celdas['1_1'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['1_2'] ?? 0}        ` +
      `${dummyData.matrizEsperada.celdas['1_3'] ?? 0}`);
    console.log(`   + ${dummyData.matrizEsperada.sinProbabilidad} activos sin probabilidad (omitidos)`);
  }

  console.log('\n📊 Verificá: GET /reportes/heatmap');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
