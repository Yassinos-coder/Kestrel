import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthSession, UserProfile } from '@kestrel/shared';
import { UsersService } from '../../users/services/users.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ChallengeRequestDto, VerifyRequestDto } from '../dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { AuthChallenge, AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.users.getProfile(user.userId);
  }

  @Post('challenge')
  challenge(@Body() dto: ChallengeRequestDto): Promise<AuthChallenge> {
    return this.auth.createChallenge(dto);
  }

  @Post('verify')
  verify(@Body() dto: VerifyRequestDto): Promise<AuthSession> {
    return this.auth.verify(dto);
  }
}
