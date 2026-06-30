import { ROLES_KEY, Roles } from './roles.decorator';
import { Reflector } from '@nestjs/core';

describe('@Roles() decorator', () => {
  let reflector: Reflector;

  // Helper class with decorated methods for metadata extraction
  class TestController {
    @Roles('administrador')
    adminOnly() {
      return 'admin';
    }

    @Roles('administrador', 'usuario')
    multiRole() {
      return 'multi';
    }

    noDecorator() {
      return 'none';
    }
  }

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('RED: should set ROLES_KEY metadata with single role', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.adminOnly,
    );
    expect(roles).toEqual(['administrador']);
    expect(roles).toHaveLength(1);
  });

  it('RED: should set ROLES_KEY metadata with multiple roles', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.multiRole,
    );
    expect(roles).toEqual(['administrador', 'usuario']);
    expect(roles).toHaveLength(2);
  });

  it('TRIANGULATE: should return undefined when no @Roles() decorator is present', () => {
    const roles = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.noDecorator,
    );
    expect(roles).toBeUndefined();
  });

  it('TRIANGULATE: ROLES_KEY should be a distinct symbol/string not colliding with other metadata keys', () => {
    expect(ROLES_KEY).toBeDefined();
    expect(typeof ROLES_KEY).toBe('string');
    // Should NOT equal the public key
    // This verifies we use a unique metadata key
    expect(ROLES_KEY).not.toBe('isPublic');
  });
});
