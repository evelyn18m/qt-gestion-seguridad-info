import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { HttpException } from '@nestjs/common';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let fetchMock: jest.Mock;

  const mockKeycloakUsers = [
    {
      id: 'a1b2c3d4',
      username: 'jdoe',
      email: 'jdoe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      enabled: true,
      realmRoles: ['admin', 'user'],
    },
    {
      id: 'e5f6g7h8',
      username: 'asmith',
      email: 'asmith@example.com',
      firstName: 'Anna',
      lastName: 'Smith',
      enabled: false,
      realmRoles: [],
    },
  ];

  const mockTokenResponse = {
    access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock',
    refresh_token: 'refresh-mock',
    expires_in: 300,
    token_type: 'Bearer',
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosService],
    }).compile();
    service = module.get<UsuariosService>(UsuariosService);

    // Reset internal state between tests
    (service as any).adminToken = null;
    (service as any).tokenExpiry = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUsers()', () => {
    // ── RED: Successful fetch ──────────────────────────────────────────

    it('RED: should fetch users from Keycloak and map to UsuarioDto[]', async () => {
      // Token auth response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      // Users fetch response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKeycloakUsers,
      } as Response);

      const result = await service.getUsers();

      // First call: auth
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/protocol/openid-connect/token'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Second call: users fetch with token
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/users?briefRepresentation=false'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock' },
        }),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'a1b2c3d4',
        username: 'jdoe',
        email: 'jdoe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        enabled: true,
        roles: ['admin', 'user'],
      });
      expect(result[1].username).toBe('asmith');
      expect(result[1].enabled).toBe(false);
      expect(result[1].roles).toEqual([]);
    });

    // ── TRIANGULATE: 401 retry succeeds ─────────────────────────────────

    it('TRIANGULATE: should retry on 401 by re-authenticating and re-fetching', async () => {
      // Initial auth
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      // Users fetch → 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);
      // Re-auth after 401
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockTokenResponse,
          access_token: 'retry-token-xyz',
        }),
      } as Response);
      // Retry users fetch → success
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockKeycloakUsers[0]],
      } as Response);

      const result = await service.getUsers();

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('jdoe');
    });

    // ── TRIANGULATE: 401 retry also fails ───────────────────────────────

    it('TRIANGULATE: should throw when retry after 401 also fails', async () => {
      // Initial auth
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      // Users fetch → 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);
      // Re-auth OK
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      // Retry → 401 again
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      const promise = service.getUsers();
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: 502,
      });
    });

    // ── TRIANGULATE: Auth failure → 500 ─────────────────────────────────

    it('TRIANGULATE: should throw 500 when admin auth fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'invalid_grant' }),
      } as Response);

      const promise = service.getUsers();
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: 500,
      });
    });

    // ── TRIANGULATE: Network error → 502 ───────────────────────────────

    it('TRIANGULATE: should throw 502 when Keycloak is unreachable (network error)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('fetch failed'));

      await expect(service.getUsers()).rejects.toThrow(HttpException);
      await expect(service.getUsers()).rejects.toMatchObject({
        status: 502,
      });
    });

    // ── TRIANGULATE: Empty realm → 200 + [] ─────────────────────────────

    it('TRIANGULATE: should return empty array when realm has no users', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const result = await service.getUsers();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    // ── TRIANGULATE: Token reuse within expiry ──────────────────────────

    it('TRIANGULATE: should reuse cached token when not expired', async () => {
      // First call: auth + users
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKeycloakUsers,
      } as Response);

      await service.getUsers();
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Second call: should reuse token, only one more fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockKeycloakUsers[0]],
      } as Response);

      await service.getUsers();

      // Should be 3 calls total (no auth call on second getUsers)
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    // ── TRIANGULATE: Map users with missing optional fields ─────────────

    it('TRIANGULATE: should handle users with missing email/firstName/lastName', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'minimal',
            username: 'min',
            enabled: true,
            realmRoles: null,
          },
        ],
      } as Response);

      const result = await service.getUsers();

      expect(result[0]).toEqual({
        id: 'minimal',
        username: 'min',
        email: '',
        firstName: '',
        lastName: '',
        enabled: true,
        roles: [],
      });
    });

    // ── TRIANGULATE: Non-401 HTTP errors on users fetch ─────────────────

    it('TRIANGULATE: should throw on non-401 HTTP errors from Keycloak', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'unknown_error' }),
      } as Response);

      const promise = service.getUsers();
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: 502,
      });
    });
  });
});
