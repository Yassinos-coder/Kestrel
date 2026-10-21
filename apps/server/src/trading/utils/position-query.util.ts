import type { Paginated, PositionView } from '@kestrel/shared';
import type { PositionQueryDto, PositionSort } from '../dto/table-query.dto';

const DEFAULT_PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const COMPARATORS: Record<PositionSort, (a: PositionView, b: PositionView) => number> = {
  newest: (a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt),
  oldest: (a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt),
  profit_desc: (a, b) => b.pnlSol - a.pnlSol,
  profit_asc: (a, b) => a.pnlSol - b.pnlSol,
  pct_desc: (a, b) => b.pnlPct - a.pnlPct,
  pct_asc: (a, b) => a.pnlPct - b.pnlPct,
  mcap_desc: (a, b) => b.marketCapUsd - a.marketCapUsd,
  mcap_asc: (a, b) => a.marketCapUsd - b.marketCapUsd,
};

export class PositionQueryUtil {
  static apply(positions: PositionView[], query: PositionQueryDto): Paginated<PositionView> {
    const fromMs = query.from ? Date.parse(query.from) : null;
    const toMs = query.to ? Date.parse(query.to) + DAY_MS - 1 : null;
    const search = query.search?.trim().toLowerCase();

    const filtered = positions
      .filter((position) => !query.status || position.status === query.status)
      .filter((position) => fromMs === null || Date.parse(position.openedAt) >= fromMs)
      .filter((position) => toMs === null || Date.parse(position.openedAt) <= toMs)
      .filter((position) => query.minPnlPct === undefined || position.pnlPct >= query.minPnlPct)
      .filter((position) => query.maxPnlPct === undefined || position.pnlPct <= query.maxPnlPct)
      .filter((position) => query.minMarketCap === undefined || position.marketCapUsd >= query.minMarketCap)
      .filter((position) => query.maxMarketCap === undefined || position.marketCapUsd <= query.maxMarketCap)
      .filter((position) => !search || position.symbol.toLowerCase().includes(search) || position.mint.toLowerCase().includes(search))
      .sort(COMPARATORS[query.sort ?? 'newest']);

    return PositionQueryUtil.paginate(filtered, query.page, query.pageSize);
  }

  static paginate<T>(items: T[], page: number | undefined, pageSize: number | undefined): Paginated<T> {
    const size = pageSize ?? DEFAULT_PAGE_SIZE;
    const pages = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(Math.max(page ?? 1, 1), pages);
    return { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pageSize: size, pages };
  }
}
