import type { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

export interface ControlCategorySeedRow {
  id: number;
  nombre: string;
}

export interface ControlSeedRow {
  seccion: string;
  descripcion: string;
  categoriaId: number;
}

export interface ParsedControlCatalog {
  categories: ControlCategorySeedRow[];
  controls: ControlSeedRow[];
}

interface SeedControlCatalogOptions {
  readFile?: (filePath: string) => string;
}

function extractInsertValuesBlock(sql: string, tableName: string): string {
  const insertRegex = new RegExp(
    `INSERT\\s+INTO\\s+${tableName}\\s*\\([^)]*\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    'i',
  );
  const match = sql.match(insertRegex);
  if (!match || !match[1]?.trim()) {
    throw new Error(
      `CONTROL_SQL_PARSE_ERROR: Missing or empty INSERT VALUES block for ${tableName}`,
    );
  }

  return match[1];
}

function parseQuotedSqlString(raw: string): string {
  return raw.replace(/''/g, "'");
}

export function parseControlCatalogSql(sql: string): ParsedControlCatalog {
  const categoryValuesBlock = extractInsertValuesBlock(
    sql,
    'CategoriaControlesImplementar',
  );
  const controlValuesBlock = extractInsertValuesBlock(
    sql,
    'ControlesImplementar',
  );

  const categories: ControlCategorySeedRow[] = [];
  const categoryRegex = /\(\s*(\d+)\s*,\s*'((?:''|[^'])*)'\s*\)/g;
  for (const match of categoryValuesBlock.matchAll(categoryRegex)) {
    categories.push({
      id: parseInt(match[1], 10),
      nombre: parseQuotedSqlString(match[2]),
    });
  }

  const controls: ControlSeedRow[] = [];
  const controlRegex =
    /\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*(\d+)\s*\)/g;
  for (const match of controlValuesBlock.matchAll(controlRegex)) {
    controls.push({
      seccion: parseQuotedSqlString(match[1]),
      descripcion: parseQuotedSqlString(match[2]),
      categoriaId: parseInt(match[3], 10),
    });
  }

  return { categories, controls };
}

export function validateControlCatalog(parsed: ParsedControlCatalog): void {
  if (parsed.categories.length === 0) {
    throw new Error(
      'CONTROL_SQL_VALIDATION_ERROR: Category INSERT block yielded zero tuples',
    );
  }

  if (parsed.controls.length === 0) {
    throw new Error(
      'CONTROL_SQL_VALIDATION_ERROR: Control INSERT block yielded zero tuples',
    );
  }

  const seenSections = new Set<string>();
  for (const control of parsed.controls) {
    if (seenSections.has(control.seccion)) {
      throw new Error(
        `CONTROL_SQL_VALIDATION_ERROR: Found duplicate seccion '${control.seccion}'`,
      );
    }
    seenSections.add(control.seccion);
  }

  const categoryIds = new Set(parsed.categories.map((category) => category.id));
  for (const control of parsed.controls) {
    if (!categoryIds.has(control.categoriaId)) {
      throw new Error(
        `CONTROL_SQL_VALIDATION_ERROR: Control section '${control.seccion}' references missing category '${control.categoriaId}'`,
      );
    }
  }
}

export async function seedControlCatalogFromSql(
  prisma: PrismaClient,
  sqlFilePath: string,
  options: SeedControlCatalogOptions = {},
): Promise<void> {
  // Source-of-truth for this capability is the canonical SQL document.
  const readFile =
    options.readFile ??
    ((filePath: string) => fs.readFileSync(filePath, 'utf8'));

  const sqlContent = readFile(sqlFilePath);
  const parsed = parseControlCatalogSql(sqlContent);
  validateControlCatalog(parsed);

  // Idempotent reconciliation: upsert categories by canonical id.
  for (const category of parsed.categories) {
    await prisma.categoriaControlesImplementar.upsert({
      where: { id: category.id },
      create: {
        id: category.id,
        nombre: category.nombre,
      },
      update: {
        nombre: category.nombre,
      },
    });
  }

  // Idempotent reconciliation: upsert controls by unique seccion.
  for (const control of parsed.controls) {
    await prisma.controlesImplementar.upsert({
      where: { seccion: control.seccion },
      create: {
        seccion: control.seccion,
        descripcion: control.descripcion,
        categoriaId: control.categoriaId,
      },
      update: {
        descripcion: control.descripcion,
        categoriaId: control.categoriaId,
      },
    });
  }
}
