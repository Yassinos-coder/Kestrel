import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { WalletView } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { WithdrawDto } from '../dto/withdraw.dto';
import { WalletService } from '../services/wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<WalletView> {
    return this.wallet.getView(user.userId, user.walletAddress);
  }

  @Post('create')
  create(@CurrentUser() user: AuthenticatedUser): Promise<WalletView> {
    return this.wallet.createBotWallet(user.userId, user.walletAddress);
  }

  @Post('withdraw')
  async withdraw(@CurrentUser() user: AuthenticatedUser, @Body() dto: WithdrawDto): Promise<{ signature: string }> {
    return { signature: await this.wallet.withdraw(user.userId, user.walletAddress, dto.amountSol) };
  }

  @Post('sweep')
  sweep(@CurrentUser() user: AuthenticatedUser): Promise<{ amountSol: number; signature: string }> {
    return this.wallet.sweepProfit(user.userId, user.walletAddress);
  }
}
