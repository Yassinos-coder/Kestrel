import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { UserProfile } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { OnboardingDto } from '../dto/onboarding.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('me/onboarding')
  completeOnboarding(@CurrentUser() user: AuthenticatedUser, @Body() dto: OnboardingDto): Promise<UserProfile> {
    return this.users.completeOnboarding(user.userId, dto);
  }
}
