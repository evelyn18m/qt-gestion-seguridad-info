import { extractUserFromRequest } from './current-user.decorator';

describe('CurrentUser decorator — extractUserFromRequest', () => {
  it('RED: should return request.user when user is present', () => {
    const mockUser = {
      userId: 'abc-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['user'],
    };

    const mockRequest = { user: mockUser };
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;

    const result = extractUserFromRequest(null, mockCtx);
    expect(result).toEqual(mockUser);
    expect(result.userId).toBe('abc-123');
    expect(result.username).toBe('jdoe');
    expect(result.email).toBe('jdoe@test.com');
  });

  it('should return null when request.user is absent (undefined)', () => {
    const mockRequest = { user: undefined };
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;

    const result = extractUserFromRequest(null, mockCtx);
    expect(result).toBeNull();
  });

  it('TRIANGULATE: should return null when request.user is explicitly null', () => {
    const mockRequest = { user: null };
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;

    const result = extractUserFromRequest(null, mockCtx);
    expect(result).toBeNull();
  });

  it('TRIANGULATE: should return null when request has no user property at all', () => {
    const mockRequest = {};
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;

    const result = extractUserFromRequest(null, mockCtx);
    expect(result).toBeNull();
  });
});
