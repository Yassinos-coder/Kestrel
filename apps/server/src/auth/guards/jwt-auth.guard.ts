import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKeyUtil } from '../utils/api-key.util';

interface JwtPayload {
  sub: string;
  wallet: string;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser; authMethod: 'session' | 'api-key' };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly apiKeys: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (ApiKeyUtil.isApiKey(token)) {
      const user = await this.apiKeys.authenticate(token);
      if (!user) throw new UnauthorizedException('Invalid or revoked API key');
      request.user = user;
      request.authMethod = 'api-key';
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { userId: payload.sub, walletAddress: payload.wallet };
      request.authMethod = 'session';
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice('Bearer '.length);
  }
}
