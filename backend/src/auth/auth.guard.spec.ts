import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return the user when authentication is successful', () => {
      const user = { userId: 'user-123', username: 'jdoe' };
      const result = guard.handleRequest(null, user);
      expect(result).toEqual(user);
    });

    it('should throw 401 when user is null', () => {
      const throws = () =>
        guard.handleRequest(null, null as unknown as undefined);
      expect(throws).toThrow('Unauthorized');
    });

    it('should throw 401 when user is undefined', () => {
      const throws = () => guard.handleRequest(null, undefined);
      expect(throws).toThrow('Unauthorized');
    });

    it('should throw 401 when there is an error', () => {
      const throws = () =>
        guard.handleRequest(
          new Error('Token expired'),
          {} as unknown as undefined,
        );
      expect(throws).toThrow('Unauthorized');
    });
  });
});
