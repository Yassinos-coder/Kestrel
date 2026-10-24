import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import type { ApiKeyView, CreatedApiKey } from '@kestrel/shared';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateApiKeyDto } from '../dto/api-key.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionOnlyGuard } from '../guards/session-only.guard';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ApiKeyService } from '../services/api-key.service';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, SessionOnlyGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ApiKeyView[]> {
    return this.apiKeys.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto): Promise<CreatedApiKey> {
    return this.apiKeys.create(user.userId, dto.name.trim());
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ revoked: true }> {
    await this.apiKeys.revoke(user.userId, id);
    return { revoked: true };
  }
}
