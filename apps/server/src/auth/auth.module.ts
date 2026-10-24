import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { ApiKeysController } from './controllers/api-keys.controller';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionOnlyGuard } from './guards/session-only.guard';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { AuthNonceRepository } from './repositories/auth-nonce.repository';
import { ApiKeyService } from './services/api-key.service';
import { AuthService } from './services/auth.service';

@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: { expiresIn: configService.getOrThrow<string>('auth.jwtExpiresIn') as never },
      }),
    }),
  ],
  controllers: [AuthController, ApiKeysController],
  providers: [AuthService, AuthNonceRepository, ApiKeyRepository, ApiKeyService, JwtAuthGuard, SessionOnlyGuard],
  exports: [JwtAuthGuard, JwtModule, ApiKeyService],
})
export class AuthModule {}
