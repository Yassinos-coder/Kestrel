import type { UserProfile } from '@kestrel/shared';
import type { User } from '../../generated/prisma/client';

export class UserMapper {
  static toProfile(user: User): UserProfile {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      onboarded: user.onboardedAt !== null,
    };
  }
}
