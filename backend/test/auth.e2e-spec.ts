import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { UsuariosModule } from '../src/usuarios/usuarios.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthGuard } from '../src/auth/auth.guard';
import * as bcrypt from 'bcrypt';

describe('Auth + Usuarios Integration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testUserId: string;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, UsuariosModule],
      providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);
    await app.init();

    // Seed a test user for login tests
    const passwordHash = await bcrypt.hash('testpass123', 10);
    const uniqueSuffix = Date.now().toString(36);
    const user = await prisma.usuario.create({
      data: {
        username: `e2e_${uniqueSuffix}`,
        email: `e2e_${uniqueSuffix}@test.com`,
        passwordHash,
        primerInicio: false,
        habilitado: true,
        roles: '["user"]',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.usuario
        .delete({ where: { id: testUserId } })
        .catch(() => {});
    }
    await app.close();
  });

  // ── Login happy path ─────────────────────────────────────────────────

  it('POST /auth/login with valid credentials → 200 + JWT + usuario', async () => {
    const user = await prisma.usuario.findUnique({
      where: { id: testUserId },
    });
    expect(user).not.toBeNull();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user!.username, password: 'testpass123' })
      .expect(200);

    expect(res.body.access_token).toBeDefined();
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.usuario).toBeDefined();
    expect(res.body.usuario.username).toBe(user!.username);
    expect(Array.isArray(res.body.usuario.roles)).toBe(true);
  });

  it('POST /auth/login invalid credentials → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nonexistent', password: 'wrong' })
      .expect(401);
  });

  // ── Usuarios CRUD (unit tests cover full behavior) ───────────────────

  it('GET /usuarios without auth → 401 (guard blocks)', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(401);
  });

  it('GET /usuarios with valid local JWT → 200', async () => {
    const user = await prisma.usuario.findUnique({
      where: { id: testUserId },
    });

    // Login to get a valid JWT
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user!.username, password: 'testpass123' })
      .expect(200);

    const token = loginRes.body.access_token;

    // Use the JWT to access protected endpoint
    const res = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // passwordHash should not be in any response
    for (const u of res.body) {
      expect(u).not.toHaveProperty('passwordHash');
    }
  });

  it('POST /usuarios with valid JWT → creates user', async () => {
    const user = await prisma.usuario.findUnique({
      where: { id: testUserId },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user!.username, password: 'testpass123' })
      .expect(200);
    const token = loginRes.body.access_token;

    const uniqueSuffix = Date.now().toString(36);
    const res = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: `crud_${uniqueSuffix}`, email: 'crud@test.com' })
      .expect(201);

    expect(res.body.username).toBe(`crud_${uniqueSuffix}`);
    expect(res.body).not.toHaveProperty('passwordHash');

    // Cleanup
    await prisma.usuario.delete({ where: { id: res.body.id } }).catch(() => {});
  });

  it('PATCH /usuarios/:id with valid JWT → updates user', async () => {
    const user = await prisma.usuario.findUnique({
      where: { id: testUserId },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user!.username, password: 'testpass123' })
      .expect(200);
    const token = loginRes.body.access_token;

    // Create temp user to update
    const temp = await prisma.usuario.create({
      data: {
        username: `patch_${Date.now().toString(36)}`,
        email: 'patch@test.com',
        passwordHash: 'dummy',
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/usuarios/${temp.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'updated@test.com' })
      .expect(200);

    expect(res.body.email).toBe('updated@test.com');

    // Cleanup
    await prisma.usuario.delete({ where: { id: temp.id } }).catch(() => {});
  });

  it('DELETE /usuarios/:id with valid JWT → 204', async () => {
    const user = await prisma.usuario.findUnique({
      where: { id: testUserId },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user!.username, password: 'testpass123' })
      .expect(200);
    const token = loginRes.body.access_token;

    // Create temp user to delete
    const temp = await prisma.usuario.create({
      data: {
        username: `del_${Date.now().toString(36)}`,
        email: 'del@test.com',
        passwordHash: 'dummy',
      },
    });

    await request(app.getHttpServer())
      .delete(`/usuarios/${temp.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
