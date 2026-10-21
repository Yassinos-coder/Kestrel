import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthSession } from '@kestrel/shared';
import { UserMapper } from '../../users/mappers/user.mapper';
import { UsersService } from '../../users/services/users.service';
import { ChallengeRequestDto, VerifyRequestDto } from '../dto/auth.dto';
import type { AuthChallenge } from '../interfaces/authenticated-user.interface';
import { AuthNonceRepository } from '../repositories/auth-nonce.repository';
import { WalletSignatureValidator } from '../validators/wallet-signature.validator';

const NONCE_BYTES = 16;
const NONCE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly nonces: AuthNonceRepository,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async createChallenge(dto: ChallengeRequestDto): Promise<AuthChallenge> {
    if (!WalletSignatureValidator.isValidAddress(dto.walletAddress)) {
      throw new BadRequestException('Not a valid Solana wallet address');
    }

    await this.nonces.deleteExpired();
    const nonce = randomBytes(NONCE_BYTES).toString('hex');
    const row = await this.nonces.create(dto.walletAddress, nonce, new Date(Date.now() + NONCE_TTL_MS));
    const message = WalletSignatureValidator.buildMessage(dto.walletAddress, nonce, row.createdAt.toISOString());
    return { nonce, message };
  }

  async verify(dto: VerifyRequestDto): Promise<AuthSession> {
    const row = await this.nonces.findByNonce(dto.nonce);
    if (!row || row.walletAddress !== dto.walletAddress || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Sign-in request expired, try again');
    }

    const message = WalletSignatureValidator.buildMessage(row.walletAddress, row.nonce, row.createdAt.toISOString());
    if (!WalletSignatureValidator.verify(dto.walletAddress, message, dto.signature)) {
      throw new UnauthorizedException('Signature does not match this wallet');
    }

    await this.nonces.deleteByNonce(dto.nonce);
    const user = await this.users.upsertOnLogin(dto.walletAddress);
    const token = await this.jwt.signAsync({ sub: user.id, wallet: user.walletAddress });
    return { token, user: UserMapper.toProfile(user) };
  }
}
