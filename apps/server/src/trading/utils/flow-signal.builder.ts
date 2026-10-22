import type { PoolTrade } from '../../market-data/interfaces/market-data.interface';
import { FLOW_WINDOW_MS } from '../constants/flow-exit.constant';
import type { FlowSignal } from '../interfaces/trading.interface';

export class FlowSignalBuilder {
  static build(trades: PoolTrade[], nowMs: number): FlowSignal {
    const recent = trades.filter((trade) => nowMs - trade.timestampMs <= FLOW_WINDOW_MS);
    const buys = recent.filter((trade) => trade.kind === 'buy');
    const sells = recent.filter((trade) => trade.kind === 'sell');

    return {
      trades: recent.length,
      buyers: new Set(buys.map((trade) => trade.wallet)).size,
      sellers: new Set(sells.map((trade) => trade.wallet)).size,
      buyVolumeSol: buys.reduce((sum, trade) => sum + trade.solAmount, 0),
      sellVolumeSol: sells.reduce((sum, trade) => sum + trade.solAmount, 0),
    };
  }
}
