import { Injectable } from '@nestjs/common';
import type { BuyOrder, SellOrder, TradeExecutor } from '../interfaces/executor.interface';
import type { Fill } from '../interfaces/trading.interface';
import { PaperFillCalculator } from '../utils/paper-fill.calculator';

@Injectable()
export class PaperExecutor implements TradeExecutor {
  async buy(order: BuyOrder): Promise<Fill> {
    return PaperFillCalculator.buy(order.solAmount, order.pool);
  }

  async sell(order: SellOrder): Promise<Fill> {
    return PaperFillCalculator.sell(order.tokenAmount, order.pool);
  }
}
