import { Injectable, HttpException } from '@nestjs/common';
import { UsuarioDto } from './dto/usuario.dto';

interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  realmRoles?: string[];
}

@Injectable()
export class UsuariosService {
  private adminToken: string | null = null;
  private tokenExpiry = 0;

  async getUsers(): Promise<UsuarioDto[]> {
    const token = await this.getAdminToken();
    const url = `${process.env.KEYCLOAK_ADMIN_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?briefRepresentation=false`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      this.adminToken = null;
      const newToken = await this.getAdminToken();
      const retryRes = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryRes.ok) {
        throw new HttpException(
          'Keycloak no disponible tras reintento',
          502,
        );
      }
      const users = (await retryRes.json()) as KeycloakUser[];
      return users.map(this.mapUser);
    }

    if (!res.ok) {
      throw new HttpException(
        `Keycloak error: ${res.status}`,
        502,
      );
    }

    const users = (await res.json()) as KeycloakUser[];
    return users.map(this.mapUser);
  }

  private async getAdminToken(): Promise<string> {
    if (this.adminToken && Date.now() < this.tokenExpiry) {
      return this.adminToken;
    }

    try {
      const res = await fetch(
        `${process.env.KEYCLOAK_ADMIN_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: process.env.KEYCLOAK_ADMIN_USER!,
            password: process.env.KEYCLOAK_ADMIN_PASSWORD!,
          }),
        },
      );

      if (!res.ok) {
        throw new HttpException(
          'Error de autenticación con Keycloak',
          500,
        );
      }

      const data = await res.json();
      this.adminToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 30) * 1000;
      return this.adminToken!;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException('Keycloak no disponible', 502);
    }
  }

  private mapUser(kcUser: KeycloakUser): UsuarioDto {
    return {
      id: kcUser.id,
      username: kcUser.username,
      email: kcUser.email ?? '',
      firstName: kcUser.firstName ?? '',
      lastName: kcUser.lastName ?? '',
      enabled: kcUser.enabled ?? false,
      roles: kcUser.realmRoles ?? [],
    };
  }
}
