import { extractIp } from './ip.util';

describe('extractIp', () => {
  it('RED: should extract first IP from x-forwarded-for header', () => {
    const mockRequest = {
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1',
      },
      ip: '127.0.0.1',
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('192.168.1.100');
  });

  it('TRIANGULATE: should handle single IP in x-forwarded-for', () => {
    const mockRequest = {
      headers: {
        'x-forwarded-for': '10.0.0.50',
      },
      ip: '127.0.0.1',
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('10.0.0.50');
  });

  it('should fall back to req.ip when x-forwarded-for is absent', () => {
    const mockRequest = {
      headers: {},
      ip: '10.10.10.10',
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('10.10.10.10');
  });

  it('should fall back to req.ip when x-forwarded-for is empty string', () => {
    const mockRequest = {
      headers: { 'x-forwarded-for': '' },
      ip: '192.168.0.1',
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('192.168.0.1');
  });

  it('should return "unknown" when both are absent', () => {
    const mockRequest = {
      headers: {},
      ip: undefined,
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('unknown');
  });

  it('should trim whitespace from x-forwarded-for IP', () => {
    const mockRequest = {
      headers: {
        'x-forwarded-for': '  172.16.5.5 , 10.0.0.1',
      },
      ip: '127.0.0.1',
    };
    const result = extractIp(mockRequest);
    expect(result).toBe('172.16.5.5');
  });
});
