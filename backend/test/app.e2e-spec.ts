import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { CatalogosModule } from '../src/catalogos/catalogos.module';
import { ValoracionesModule } from '../src/valoraciones/valoraciones.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CatalogosModule, ValoracionesModule],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // ── Task 4.2: POST /valoraciones without tipoControlId → expect 400 (RED) ──
  it('RED: POST /valoraciones without tipoControlId in detallesRiesgo should return 400', async () => {
    const body = {
      nombreActivo: 'E2E Test Activo',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'E2E test descripcion',
      controlSeguridad: 'E2E controls',
      ubicacion: 'E2E ubicacion',
      confidencialidadId: 1,
      integridadId: 1,
      disponibilidadId: 1,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 1,
          amenazaIds: '[1]',
          // tipoControlId intentionally missing
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/valoraciones')
      .send(body)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  // ── Task 4.2: POST /valoraciones WITH tipoControlId → expect 201 (GREEN) ──
  it('GREEN: POST /valoraciones with tipoControlId should return 201', async () => {
    const body = {
      nombreActivo: 'E2E Valid Activo',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'E2E valid descripcion',
      controlSeguridad: 'E2E controls',
      ubicacion: 'E2E ubicacion',
      confidencialidadId: 1,
      integridadId: 1,
      disponibilidadId: 1,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 1,
          tipoControlId: 1,
          amenazaIds: '[1]',
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/valoraciones')
      .send(body)
      .expect(201);
  });

  // ── Task 4.3: Smoke test existing endpoints ──
  it('Smoke: GET /catalogos/tipos-control should return 200', () => {
    return request(app.getHttpServer())
      .get('/catalogos/tipos-control')
      .expect(200);
  });

  it('Smoke: GET /valoraciones should return 200', () => {
    return request(app.getHttpServer()).get('/valoraciones').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
