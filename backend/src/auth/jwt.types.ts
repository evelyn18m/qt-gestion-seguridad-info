// Pure function for claim extraction — no JWT validation, no jwks-rsa imports
export interface JwtPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  realm_access?: {
    roles: string[];
  };
}

export function extractJwtPayload(payload: JwtPayload) {
  return {
    userId: payload.sub,
    username: payload.preferred_username ?? '',
    email: payload.email ?? '',
    roles: payload.realm_access?.roles ?? [],
  };
}
