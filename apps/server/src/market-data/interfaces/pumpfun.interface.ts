export interface PumpFunCoin {
  mint: string;
  name: string;
  symbol: string;
  created_timestamp: number;
  complete: boolean;
  pump_swap_pool: string | null;
  is_banned?: boolean;
}
