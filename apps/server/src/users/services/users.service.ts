import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserProfile } from '@kestrel/shared';
import type { User } from '../../generated/prisma/client';
import { OnboardingDto } from '../dto/onboarding.dto';
import { UserMapper } from '../mappers/user.mapper';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return UserMapper.toProfile(user);
  }

  upsertOnLogin(walletAddress: string): Promise<User> {
    return this.users.upsertByWallet(walletAddress);
  }

  async completeOnboarding(userId: string, dto: OnboardingDto): Promise<UserProfile> {
    const hasPaperHistory = (await this.users.countPaperPositions(userId)) > 0;
    if (!hasPaperHistory) await this.users.setStartingPaperBalance(userId, dto.startingPaperBalanceSol);

    const user = await this.users.completeOnboarding(userId, dto.displayName.trim());
    return UserMapper.toProfile(user);
  }
}
