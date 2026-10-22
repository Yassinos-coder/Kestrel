import type { BirdeyeTraderItem, BirdeyeTradersResponse, TopTrader } from '../interfaces/birdeye.interface';

const EXCLUDED_TAGS = new Set(['dev', 'bundler']);
const WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class BirdeyeTraderMapper {
  static toTraders(response: BirdeyeTradersResponse): TopTrader[] {
    const items = BirdeyeTraderMapper.items(response);
    return items.flatMap((item) => {
      const trader = BirdeyeTraderMapper.toTrader(item);
      return trader ? [trader] : [];
    });
  }

  private static items(response: BirdeyeTradersResponse): BirdeyeTraderItem[] {
    const data = response.data;
    if (!data) return [];
    return Array.isArray(data) ? data : (data.items ?? []);
  }

  private static toTrader(item: BirdeyeTraderItem): TopTrader | null {
    const wallet = item.owner ?? item.address ?? item.wallet;
    if (!wallet || !WALLET_PATTERN.test(wallet)) return null;
    const tags = (item.tags ?? []).map((tag) => tag.toLowerCase());
    if (tags.some((tag) => EXCLUDED_TAGS.has(tag))) return null;
    return { wallet, realizedPnlUsd: item.realizedPnl ?? item.totalPnl ?? null, tags };
  }
}
