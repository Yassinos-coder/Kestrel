import type { Paginated, SmartWalletView } from '@kestrel/shared';
import { PositionQueryUtil } from '../../trading/utils/position-query.util';
import type { SmartWalletQueryDto, WalletSort } from '../dto/smart-wallets.dto';

const COMPARATORS: Record<WalletSort, (a: SmartWalletView, b: SmartWalletView) => number> = {
  score: (a, b) => b.score - a.score,
  profit: (a, b) => b.stats.totalPnlSol - a.stats.totalPnlSol,
  winrate: (a, b) => b.stats.winRatePct - a.stats.winRatePct,
  recent: (a, b) => b.stats.lastActiveMs - a.stats.lastActiveMs,
  early: (a, b) => (b.stats.earlyEntryPct ?? -1) - (a.stats.earlyEntryPct ?? -1),
};

export class SmartWalletQueryUtil {
  static apply(wallets: SmartWalletView[], query: SmartWalletQueryDto): Paginated<SmartWalletView> {
    const search = query.search?.trim().toLowerCase();
    const filtered = wallets
      .filter((wallet) => !query.tier || wallet.tier === query.tier)
      .filter((wallet) => query.minScore === undefined || wallet.score >= query.minScore)
      .filter((wallet) => !search || wallet.address.toLowerCase().includes(search))
      .sort(COMPARATORS[query.sort ?? 'score']);
    return PositionQueryUtil.paginate(filtered, query.page, query.pageSize);
  }
}
