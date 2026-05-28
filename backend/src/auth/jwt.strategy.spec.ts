import { extractJwtPayload, JwtPayload } from './jwt.types';

describe('extractJwtPayload (pure function)', () => {
  it('should extract sub, preferred_username, email, and roles from JWT payload', () => {
    const payload: JwtPayload = {
      sub: 'user-123',
      preferred_username: 'jdoe',
      email: 'jdoe@quito-turismo.gob.ec',
      realm_access: {
        roles: ['admin', 'user'],
      },
    };

    const result = extractJwtPayload(payload);

    expect(result).toEqual({
      userId: 'user-123',
      username: 'jdoe',
      email: 'jdoe@quito-turismo.gob.ec',
      roles: ['admin', 'user'],
    });
  });

  it('should handle missing optional roles field', () => {
    const payload: JwtPayload = {
      sub: 'user-456',
      preferred_username: 'visitor',
      email: 'visitor@quito-turismo.gob.ec',
      realm_access: {},
    };

    const result = extractJwtPayload(payload);

    expect(result).toEqual({
      userId: 'user-456',
      username: 'visitor',
      email: 'visitor@quito-turismo.gob.ec',
      roles: [],
    });
  });

  it('should handle minimal payload with only sub', () => {
    const payload: JwtPayload = {
      sub: 'user-789',
    };

    const result = extractJwtPayload(payload);

    expect(result).toEqual({
      userId: 'user-789',
      username: '',
      email: '',
      roles: [],
    });
  });

  it('should handle completely empty realm_access', () => {
    const payload: JwtPayload = {
      sub: 'user-999',
      preferred_username: 'alice',
      realm_access: undefined,
    };

    const result = extractJwtPayload(payload);

    expect(result).toEqual({
      userId: 'user-999',
      username: 'alice',
      email: '',
      roles: [],
    });
  });
});
