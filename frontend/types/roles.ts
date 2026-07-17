export const ROLES_DISPONIBLES = ['administrador', 'usuario'] as const;
export type Rol = (typeof ROLES_DISPONIBLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  usuario: 'Usuario',
};

export const FRONTEND_ROLE_MAP: Record<string, string> = {
  admin: 'administrador',
  administradoregsi: 'administrador',
  usuarioegsi: 'usuario',
};
