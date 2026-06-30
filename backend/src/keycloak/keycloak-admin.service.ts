import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface TokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private tokenCache: TokenCache | null = null;
  private clientUuidCache: string | null = null;

  private readonly adminUrl: string;
  private readonly realm: string;
  private readonly adminUser: string;
  private readonly adminPassword: string;

  constructor(private readonly httpService: HttpService) {
    this.adminUrl = process.env['KEYCLOAK_ADMIN_URL'] || 'http://keycloak:8080';
    this.realm = process.env['KEYCLOAK_REALM'] || 'quito-turismo';
    this.adminUser = process.env['KEYCLOAK_ADMIN_USER'] || 'admin';
    this.adminPassword = process.env['KEYCLOAK_ADMIN_PASSWORD'] || 'admin';
  }

  // ── Token Management ─────────────────────────────────────────────────

  async getAdminToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      return this.tokenCache.token;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'admin-cli');
    params.append('username', this.adminUser);
    params.append('password', this.adminPassword);

    const response = await firstValueFrom(
      this.httpService.post<{ access_token: string; expires_in: number }>(
        `${this.adminUrl}/realms/master/protocol/openid-connect/token`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ),
    );

    const expiresIn = response.data.expires_in || 300;
    this.tokenCache = {
      token: response.data.access_token,
      expiresAt: now + (expiresIn - 30) * 1000, // 30s buffer
    };

    return this.tokenCache.token;
  }

  private clearTokenCache(): void {
    this.tokenCache = null;
  }

  // ── Generic 401-retry wrapper ────────────────────────────────────────

  private async executeWithAuth<T>(
    operation: (token: string) => Promise<T>,
  ): Promise<T> {
    const token = await this.getAdminToken();
    try {
      return await operation(token);
    } catch (error) {
      if (this.isAxios401(error)) {
        this.logger.warn('Keycloak returned 401, refreshing token and retrying');
        this.clearTokenCache();
        const newToken = await this.getAdminToken();
        return operation(newToken);
      }
      throw error;
    }
  }

  private isAxios401(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }
    return false;
  }

  // ── Headers helper ───────────────────────────────────────────────────

  private authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // ── User CRUD ────────────────────────────────────────────────────────

  async createUser(dto: {
    username: string;
    email: string;
    enabled: boolean;
    credentials: Array<{ type: string; value: string; temporary: boolean }>;
  }): Promise<string> {
    return this.executeWithAuth(async (token) => {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminUrl}/admin/realms/${this.realm}/users`,
          dto,
          { headers: this.authHeaders(token) },
        ),
      );

      // Extract UUID from Location header
      // Format: {adminUrl}/admin/realms/{realm}/users/{uuid}
      const location: string = response.headers['location'] || '';
      const parts = location.split('/');
      return parts[parts.length - 1] || '';
    });
  }

  async findUserByUsername(
    username: string,
  ): Promise<{ id: string; username: string; email: string } | null> {
    return this.executeWithAuth(async (token) => {
      const response = await firstValueFrom(
        this.httpService.get<
          Array<{ id: string; username: string; email: string }>
        >(`${this.adminUrl}/admin/realms/${this.realm}/users`, {
          params: { username, exact: true },
          headers: this.authHeaders(token),
        }),
      );

      return response.data.length > 0 ? response.data[0] : null;
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.executeWithAuth(async (token) => {
      await firstValueFrom(
        this.httpService.delete(
          `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}`,
          { headers: this.authHeaders(token) },
        ),
      );
    });
  }

  async updateUser(
    userId: string,
    dto: { email?: string; enabled?: boolean },
  ): Promise<void> {
    return this.executeWithAuth(async (token) => {
      const body: Record<string, unknown> = {};
      if (dto.email !== undefined) body['email'] = dto.email;
      if (dto.enabled !== undefined) body['enabled'] = dto.enabled;

      await firstValueFrom(
        this.httpService.put(
          `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}`,
          body,
          { headers: this.authHeaders(token) },
        ),
      );
    });
  }

  // ── Client UUID ──────────────────────────────────────────────────────

  async getClientUuid(): Promise<string> {
    if (this.clientUuidCache) {
      return this.clientUuidCache;
    }

    return this.executeWithAuth(async (token) => {
      const response = await firstValueFrom(
        this.httpService.get<Array<{ id: string; clientId: string }>>(
          `${this.adminUrl}/admin/realms/${this.realm}/clients`,
          {
            params: { clientId: 'sgsi-app' },
            headers: this.authHeaders(token),
          },
        ),
      );

      const client = response.data[0];
      if (!client) {
        throw new Error('Client sgsi-app not found in Keycloak');
      }

      this.clientUuidCache = client.id;
      return client.id;
    });
  }

  // ── Role Mapping ─────────────────────────────────────────────────────

  async assignClientRoles(userId: string, roles: string[]): Promise<void> {
    await this.executeWithAuth(async (token) => {
      const clientUuid = await this.getClientUuid();

      // 1. Get all client roles (to resolve names → ids)
      const allRolesResponse = await firstValueFrom(
        this.httpService.get<
          Array<{ id: string; name: string }>
        >(
          `${this.adminUrl}/admin/realms/${this.realm}/clients/${clientUuid}/roles`,
          { headers: this.authHeaders(token) },
        ),
      );
      const allRoles = allRolesResponse.data;

      // 2. Get existing user client roles
      const existingRolesResponse = await firstValueFrom(
        this.httpService.get<
          Array<{ id: string; name: string }>
        >(
          `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
          { headers: this.authHeaders(token) },
        ),
      );
      const existingRoles = existingRolesResponse.data;

      // 3. Delete existing roles (if any)
      if (existingRoles.length > 0) {
        await firstValueFrom(
          this.httpService.delete(
            `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
            {
              data: existingRoles,
              headers: this.authHeaders(token),
            },
          ),
        );
      }

      // 4. Assign new roles (if any specified)
      if (roles.length > 0) {
        const roleReps = allRoles.filter((r) => roles.includes(r.name));
        await firstValueFrom(
          this.httpService.post(
            `${this.adminUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
            roleReps,
            { headers: this.authHeaders(token) },
          ),
        );
      }
    });
  }
}
