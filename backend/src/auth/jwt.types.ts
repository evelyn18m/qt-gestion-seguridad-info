export interface JwtPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
}

export function extractJwtPayload(payload: JwtPayload) {
  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = payload.resource_access
    ? Object.values(payload.resource_access).flatMap((c) => c.roles)
    : [];

  return {
    userId: payload.sub,
    username: payload.preferred_username ?? '',
    email: payload.email ?? '',
    roles: [...realmRoles, ...clientRoles],
  };
}
