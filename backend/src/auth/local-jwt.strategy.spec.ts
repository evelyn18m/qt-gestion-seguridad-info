import { Test, TestingModule } from '@nestjs/testing';
import { LocalJwtStrategy } from './local-jwt.strategy';

describe('LocalJwtStrategy', () => {
  let strategy: LocalJwtStrategy;
  const JWT_SECRET = 'test-secret-key-for-testing-only';

  beforeAll(() => {
    process.env['JWT_SECRET'] = JWT_SECRET;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalJwtStrategy],
    }).compile();

    strategy = module.get<LocalJwtStrategy>(LocalJwtStrategy);
  });

  // ── RED: Validate payload with all fields ─────────────────────────────

  it('RED: should extract userId, username, email, roles, and source from JWT payload', async () => {
    const payload = {
      sub: 'user-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin', 'user'],
      source: 'local',
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin', 'user'],
      source: 'local',
    });
  });

  // ── TRIANGULATE: Minimal payload ──────────────────────────────────────

  it('TRIANGULATE: should handle minimal payload with only sub', async () => {
    const payload = {
      sub: 'minimal-user',
      source: 'local',
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'minimal-user',
      username: '',
      email: '',
      roles: [],
      source: 'local',
    });
  });

  // ── TRIANGULATE: Empty roles array ────────────────────────────────────

  it('TRIANGULATE: should handle payload with empty roles', async () => {
    const payload = {
      sub: 'no-roles',
      username: 'guest',
      email: 'guest@test.com',
      roles: [],
      source: 'local',
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'no-roles',
      username: 'guest',
      email: 'guest@test.com',
      roles: [],
      source: 'local',
    });
  });

  // ── TRIANGULATE: Validate is a pure function ──────────────────────────

  it('TRIANGULATE: should return same output for same input (pure function)', async () => {
    const payload = {
      sub: 'stable-user',
      username: 'stable',
      email: 'stable@test.com',
      roles: ['viewer'],
      source: 'local',
    };

    const result1 = await strategy.validate({ ...payload });
    const result2 = await strategy.validate({ ...payload });

    expect(result1).toEqual(result2);
  });
});
