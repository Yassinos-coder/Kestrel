import type { AuthSession, UserProfile } from '@kestrel/shared';
import { BaseApiClient } from '@/services/BaseApiClient';

export interface Challenge {
  nonce: string;
  message: string;
}

class AuthService extends BaseApiClient {
  challenge(walletAddress: string): Promise<Challenge> {
    return this.request('/auth/challenge', { method: 'POST', body: { walletAddress }, authenticated: false });
  }

  verify(walletAddress: string, nonce: string, signature: string): Promise<AuthSession> {
    return this.request('/auth/verify', { method: 'POST', body: { walletAddress, nonce, signature }, authenticated: false });
  }

  me(): Promise<UserProfile> {
    return this.request('/auth/me');
  }

  completeOnboarding(displayName: string, startingPaperBalanceSol: number): Promise<UserProfile> {
    return this.request('/users/me/onboarding', { method: 'POST', body: { displayName, startingPaperBalanceSol } });
  }
}

export const authService = new AuthService();
