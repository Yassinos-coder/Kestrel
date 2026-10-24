import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class SessionOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.authMethod !== 'session') throw new ForbiddenException('API keys cannot manage API keys, sign in with your wallet');
    return true;
  }
}
