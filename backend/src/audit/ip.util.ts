export function extractIp(request: any): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (forwarded && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}
