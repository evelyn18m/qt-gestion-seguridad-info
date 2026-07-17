import { Test, TestingModule } from '@nestjs/testing';
import { KeycloakAdminService } from './keycloak-admin.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Helper to build a realistic AxiosResponse
function axiosRes<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: headers,
    config: {} as InternalAxiosRequestConfig,
  };
}

// Helper to build an AxiosError with a response
function axiosErr(status: number, data?: unknown): AxiosError {
  const request = {} as any;
  const config = {} as InternalAxiosRequestConfig;
  const response = axiosRes(data ?? { error: 'unauthorized' }, status);
  const err = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    request,
    response,
  );
  return err;
}

// Admin URL from env (process.env) — set before tests
const ADMIN_URL = 'http://keycloak:8080';
const REALM = 'quito-turismo';

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;
  let mockHttpService: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    process.env['KEYCLOAK_ADMIN_URL'] = ADMIN_URL;
    process.env['KEYCLOAK_REALM'] = REALM;
    process.env['KEYCLOAK_ADMIN_USER'] = 'superadmin';
    process.env['KEYCLOAK_ADMIN_PASSWORD'] = 'admin';

    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: getAdminToken — token obtained and cached
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should obtain admin token via password grant and cache it', async () => {
    mockHttpService.post.mockReturnValue(
      of(axiosRes({ access_token: 'admin-token-abc', expires_in: 300 })),
    );

    const token1 = await service.getAdminToken();

    expect(token1).toBe('admin-token-abc');
    expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    expect(mockHttpService.post).toHaveBeenCalledWith(
      `${ADMIN_URL}/realms/master/protocol/openid-connect/token`,
      expect.stringContaining('grant_type=password'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );

    // Second call should use cache — no additional HTTP call
    const token2 = await service.getAdminToken();
    expect(token2).toBe('admin-token-abc');
    expect(mockHttpService.post).toHaveBeenCalledTimes(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TRIANGULATE: getAdminToken — refreshes on 401
  // ═══════════════════════════════════════════════════════════════════════

  it('TRIANGULATE: should clear cache and re-authenticate when a 401 is detected', async () => {
    // First token request succeeds
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'expired-token', expires_in: 0 })),
    );
    await service.getAdminToken();

    // Simulate: API call returns 401 → service clears cache, re-authenticates
    // We force-clear the cache by calling a private clear (via 401 detection)
    // The actual 401 retry is triggered inside other methods.
    // For now, verify the token fetch can be called again after cache reset.
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'fresh-token', expires_in: 300 })),
    );
    // Clear token cache manually to simulate 401-triggered refresh
    (service as any).tokenCache = undefined;
    (service as any).tokenExpiry = 0;

    const freshToken = await service.getAdminToken();
    expect(freshToken).toBe('fresh-token');
    expect(mockHttpService.post).toHaveBeenCalledTimes(2);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: createUser — returns user UUID from Location header
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should create a Keycloak user and return the UUID', async () => {
    // Token
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    // Create user: 201 with Location header
    const locationUrl = `${ADMIN_URL}/admin/realms/${REALM}/users/kc-uuid-123`;
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes(undefined, 201, { location: locationUrl })),
    );

    const uuid = await service.createUser({
      username: 'newuser',
      email: 'new@test.com',
      enabled: true,
      credentials: [{ type: 'password', value: 'secret123', temporary: false }],
    });

    expect(uuid).toBe('kc-uuid-123');
    // Verify POST to users endpoint
    expect(mockHttpService.post).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users`,
      {
        username: 'newuser',
        email: 'new@test.com',
        enabled: true,
        credentials: [
          { type: 'password', value: 'secret123', temporary: false },
        ],
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tk',
        }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: findUserByUsername — returns user or null
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should find existing user by username', async () => {
    // Token
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'kc-1', username: 'jdoe', email: 'jdoe@test.com' }])),
    );

    const user = await service.findUserByUsername('jdoe');
    expect(user).toEqual({
      id: 'kc-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
    });
    expect(mockHttpService.get).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users`,
      expect.objectContaining({
        params: { username: 'jdoe', exact: true },
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TRIANGULATE: findUserByUsername — returns null when not found
  // ═══════════════════════════════════════════════════════════════════════

  it('TRIANGULATE: should return null when username not found', async () => {
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.get.mockReturnValueOnce(of(axiosRes([])));

    const user = await service.findUserByUsername('nonexistent');
    expect(user).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: deleteUser — calls DELETE endpoint
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should delete user from Keycloak by userId', async () => {
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.delete.mockReturnValueOnce(of(axiosRes(undefined, 204)));

    await service.deleteUser('kc-uuid-delete');

    expect(mockHttpService.delete).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users/kc-uuid-delete`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: getClientUuid — resolves and caches sgsi-app client UUID
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should resolve sgsi-app client UUID and cache it', async () => {
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'client-uuid-sgsi', clientId: 'sgsi-app' }])),
    );

    const clientUuid1 = await service.getClientUuid();
    expect(clientUuid1).toBe('client-uuid-sgsi');
    expect(mockHttpService.get).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/clients`,
      expect.objectContaining({
        params: { clientId: 'sgsi-app' },
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );

    // Second call uses cache — no additional HTTP
    const clientUuid2 = await service.getClientUuid();
    expect(clientUuid2).toBe('client-uuid-sgsi');
    expect(mockHttpService.get).toHaveBeenCalledTimes(1); // only the original client lookup
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: assignClientRoles — assigns specified roles, replaces existing
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should assign client roles (replacing existing)', async () => {
    // 1. Token
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    // 2. Get client UUID (cached via previous test or fresh)
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'client-uuid-sgsi', clientId: 'sgsi-app' }])),
    );
    // 3. Get all client roles
    mockHttpService.get.mockReturnValueOnce(
      of(
        axiosRes([
          { id: 'role-id-admin', name: 'administradoregsi' },
          { id: 'role-id-user', name: 'usuarioegsi' },
        ]),
      ),
    );
    // 4. Get existing user client roles (currently has 'usuarioegsi')
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'role-id-user', name: 'usuarioegsi' }])),
    );
    // 5. Delete existing roles
    mockHttpService.delete.mockReturnValueOnce(of(axiosRes(undefined, 204)));
    // 6. Assign new roles
    mockHttpService.post.mockReturnValueOnce(of(axiosRes(undefined, 204)));

    await service.assignClientRoles('user-uuid-1', ['administradoregsi']);

    // Verify existing roles were removed
    expect(mockHttpService.delete).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users/user-uuid-1/role-mappings/clients/client-uuid-sgsi`,
      expect.objectContaining({
        data: [{ id: 'role-id-user', name: 'usuarioegsi' }],
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
    // Verify new roles were assigned
    expect(mockHttpService.post).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users/user-uuid-1/role-mappings/clients/client-uuid-sgsi`,
      [{ id: 'role-id-admin', name: 'administradoregsi' }],
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TRIANGULATE: assignClientRoles — empty roles removes all assignments
  // ═══════════════════════════════════════════════════════════════════════

  it('TRIANGULATE: should remove all roles when empty array provided', async () => {
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'client-uuid-sgsi', clientId: 'sgsi-app' }])),
    );
    // Get all client roles (needed even when just removing)
    mockHttpService.get.mockReturnValueOnce(
      of(
        axiosRes([
          { id: 'role-id-admin', name: 'administradoregsi' },
          { id: 'role-id-user', name: 'usuarioegsi' },
        ]),
      ),
    );
    // Get existing user client roles
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'role-id-admin', name: 'administradoregsi' }])),
    );
    // Delete existing roles
    mockHttpService.delete.mockReturnValueOnce(of(axiosRes(undefined, 204)));

    await service.assignClientRoles('user-uuid-2', []);

    // Verify delete was called with existing roles
    expect(mockHttpService.delete).toHaveBeenCalledWith(
      expect.stringContaining('/role-mappings/clients/client-uuid-sgsi'),
      expect.objectContaining({
        data: [{ id: 'role-id-admin', name: 'administradoregsi' }],
      }),
    );
    // No POST should happen for role assignment when roles is empty
    const assignCalls = mockHttpService.post.mock.calls.filter((call: any[]) =>
      call[0]?.includes('role-mappings'),
    );
    expect(assignCalls).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RED: updateUser — updates email and enabled fields
  // ═══════════════════════════════════════════════════════════════════════

  it('RED: should update user email and enabled in Keycloak', async () => {
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'tk', expires_in: 300 })),
    );
    mockHttpService.put.mockReturnValueOnce(of(axiosRes(undefined, 204)));

    await service.updateUser('kc-uuid-x', {
      email: 'updated@test.com',
      enabled: false,
    });

    expect(mockHttpService.put).toHaveBeenCalledWith(
      `${ADMIN_URL}/admin/realms/${REALM}/users/kc-uuid-x`,
      { email: 'updated@test.com', enabled: false },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TRIANGULATE: Token auto-refresh on 401 in API call
  // ═══════════════════════════════════════════════════════════════════════

  it('TRIANGULATE: should auto-refresh token on 401 and retry the operation', async () => {
    // First token succeeds
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'expired-tk', expires_in: 0 })),
    );
    // GET user returns 401 (expired token)
    mockHttpService.get.mockReturnValueOnce(throwError(() => axiosErr(401)));
    // Token refresh
    mockHttpService.post.mockReturnValueOnce(
      of(axiosRes({ access_token: 'fresh-tk', expires_in: 300 })),
    );
    // Retry GET succeeds
    mockHttpService.get.mockReturnValueOnce(
      of(axiosRes([{ id: 'kc-1', username: 'jdoe', email: 'jdoe@test.com' }])),
    );

    const user = await service.findUserByUsername('jdoe');

    expect(user).toEqual({
      id: 'kc-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
    });
    // Two token requests: initial + refresh
    expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    // Two GET calls: first failed with 401, second succeeded
    expect(mockHttpService.get).toHaveBeenCalledTimes(2);
  });
});
