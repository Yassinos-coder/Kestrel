import type { Fill, PoolState } from './trading.interface';

export interface BuyOrder {
  userId: string;
  mint: string;
  decimals: number;
  solAmount: number;
  pool: PoolState;
}

export interface SellOrder {
  userId: string;
  mint: string;
  decimals: number;
  tokenAmount: number;
  sellAll: boolean;
  pool: PoolState;
}

export interface TradeExecutor {
  buy(order: BuyOrder): Promise<Fill>;
  sell(order: SellOrder): Promise<Fill>;
}
