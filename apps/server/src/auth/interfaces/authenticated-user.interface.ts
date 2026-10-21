export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
}

export interface AuthChallenge {
  nonce: string;
  message: string;
}
