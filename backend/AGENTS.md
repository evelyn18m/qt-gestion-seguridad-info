# backend — NestJS + Prisma + MySQL

## Stack

- **Framework**: NestJS 11, TypeScript 5.7, Express adapter
- **ORM**: Prisma 7.8 with `@prisma/adapter-mariadb` (uses MariaDB driver, not the default Prisma client adapter)
- **DB**: MySQL (MariaDB) — connection string in `.env` (`DATABASE_URL`)
- **Testing**: Jest 30 + ts-jest, Supertest for e2e
- **Lint/Format**: ESLint 9 + Prettier 3

## Quick commands

| Command                  | What                                               |
|--------------------------|----------------------------------------------------|
| `npm run start:dev`      | Dev server with watch (port **3001**, not 3000)    |
| `npm run build`          | Build to `dist/`                                   |
| `npm run test`           | Unit tests — files matching `src/**/*.spec.ts`     |
| `npm run test:e2e`       | E2E tests — files matching `test/**/*.e2e-spec.ts` |
| `npm run lint`           | ESLint with `--fix`                                |
| `npm run format`         | Prettier (`src/` and `test/`)                      |
| `npx prisma generate`    | Generate Prisma client                             |
| `npx prisma migrate dev` | Create/apply migrations                            |
| `npx prisma db push`     | Sync schema without migration                      |
| `ts-node prisma/seed.ts` | Seed DB from `catalogos.json`                      |

## Project structure

```
src/                     # NestJS app source
  main.ts               # Entry point, port from PORT env or 3001
  app.module.ts         # Root module (add new modules here)
  app.controller.ts
  app.service.ts
prisma/
  schema.prisma         # Catalog tables: Amenaza, Vulnerabilidad, Impacto, Formato, Subproceso, MacroProceso, TipoActivo, Activo, Valoracion
  seed.ts               # Reads catalogos.json, uses PrismaMariaDb adapter
  migrations/           # Prisma migration history
test/
  app.e2e-spec.ts       # E2E test example ({module}.e2e-spec.ts)
  jest-e2e.json         # E2E jest config
```

## Data pipeline

1. `read_excel.js` — reads `catalogos.xlsx`, writes `catalogos.json`
2. `ts-node prisma/seed.ts` — reads `catalogos.json`, seeds MySQL via PrismaMariaDb adapter

## Config quirks

- **Prisma adapter**: Seed and app use `@prisma/adapter-mariadb` explicitly (not default client). New PrismaClient calls
  must pass `{ adapter }`.
- **ESLint**: `no-explicit-any` is **off**, `no-floating-promises` and `no-unsafe-argument` are **warn**;
  `sourceType: 'commonjs'` in config
- **Jest config**: Defined inline in `package.json` (not a separate file), `rootDir: "src"` for unit tests, E2E config
  in `test/jest-e2e.json`
- **Prettier**: `singleQuote: true`, `trailingComma: "all"`, `endOfLine: "auto"`
- **tsconfig**: `module: nodenext`, `target: ES2023`, decorators enabled
- **`.gitignore`**: ignores `.env` and `/generated/prisma`

## New NestJS modules

Generate via `nest g resource <name>` (or `npx @nestjs/cli g resource <name>`). Add generated module to `imports` in
`app.module.ts`.

## Required services

- MySQL/MariaDB instance at `localhost:3306`, database `sgsi_db`, user `sgsi_user`/`sgsi_password`
- `grant_perms.js` helper grants all privileges to `sgsi_user` (run once after DB setup)
