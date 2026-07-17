import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Pure function: extracts user from request.
 * Exported for unit testing — no NestJS magic needed.
 */
export function extractUserFromRequest(_data: unknown, ctx: ExecutionContext) {
  return ctx.switchToHttp().getRequest().user ?? null;
}

export const CurrentUser = createParamDecorator(extractUserFromRequest);
