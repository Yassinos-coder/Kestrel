import type { TokenMarketSnapshot } from '../../checklist/interfaces/token-snapshot.interface';
import type { DexPair, PoolCandidate, PoolTrade, RugReport } from '../interfaces/market-data.interface';
import type { SnapshotInputs } from '../interfaces/snapshot-inputs.interface';

const TOP_HOLDER_COUNT = 10;
const MAX_RATIO = 10;
const WASH_TRADE_TX_PER_TRADER = 8;
const PERCENT = 100;
const MINUTES_PER_HOUR = 60;
const RECENT_WINDOW_MINUTES = 5;
const RISKY_EXTENSIONS = ['transferHook', 'nonTransferable', 'pausableConfig', 'defaultAccountState'];

export class TokenSnapshotMapper {
  static build(inputs: SnapshotInputs): TokenMarketSnapshot {
    const { pair, candidate, rug, onchain, exitQuote, trades, previousHolders, nowMs } = inputs;
    const holders = TokenSnapshotMapper.mapHolders(rug);

    return {
      mint: pair.mint,
      symbol: pair.symbol,
      name: pair.name,
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      decimals: onchain.decimals,
      ageSeconds: Math.max(0, Math.floor((nowMs - pair.createdAtMs) / 1000)),
      marketCapUsd: pair.marketCapUsd,
      priceSol: pair.priceSol,
      priceChange5mPct: pair.priceChange5mPct,
      authorities: {
        mintRevoked: onchain.mintAuthority === null && rug.mintAuthority === null,
        freezeRevoked: onchain.freezeAuthority === null && rug.freezeAuthority === null,
      },
      extensions: {
        transferFee: onchain.extensions.includes('transferFeeConfig') && rug.transferFeePct > 0,
        transferHook: RISKY_EXTENSIONS.some((extension) => onchain.extensions.includes(extension)) || rug.hasTransferHook,
        permanentDelegate: onchain.extensions.includes('permanentDelegate') || rug.hasPermanentDelegate,
      },
      liquidity: {
        usd: pair.liquidityUsd,
        quoteSol: pair.liquidityQuoteSol,
        lpBurnedOrLockedPct: rug.lpLockedPct,
        exitPriceImpactPct: exitQuote?.priceImpactPct ?? PERCENT,
      },
      holders,
      clusters: {
        bundledSupplyPct: Math.min(PERCENT, rug.insiderNetworkHolding * PERCENT),
        sniperSupplyPct: TokenSnapshotMapper.sumInsiderHolders(rug),
      },
      creator: {
        address: rug.creator,
        hasSold: TokenSnapshotMapper.creatorHasSold(rug.creator, trades),
        priorTokenCount: rug.creatorTokenCount,
        priorRugCount: rug.creatorRugCount,
        flaggedRugged: rug.rugged,
      },
      sellability: {
        routeExists: exitQuote !== null,
        simulatedSellOk: exitQuote !== null && Number(exitQuote.outAmount) > 0,
      },
      activity: TokenSnapshotMapper.mapActivity(pair, candidate, holders.totalHolders, previousHolders),
      momentum: TokenSnapshotMapper.mapMomentum(pair),
    };
  }

  private static mapMomentum(pair: DexPair): TokenMarketSnapshot['momentum'] {
    const hourlyPace = pair.volume1hUsd / MINUTES_PER_HOUR;
    const recentPace = pair.volume5mUsd / RECENT_WINDOW_MINUTES;
    return {
      priceChange1hPct: pair.priceChange1hPct,
      volumeTrendRatio: hourlyPace > 0 ? recentPace / hourlyPace : 0,
    };
  }

  private static mapHolders(rug: RugReport): TokenMarketSnapshot['holders'] {
    const circulating = rug.topHolders.filter((holder) => !rug.ammAccounts.has(holder.owner) && !rug.ammAccounts.has(holder.address));
    const top = circulating.slice(0, TOP_HOLDER_COUNT);
    return {
      top10Pct: top.reduce((sum, holder) => sum + holder.pct, 0),
      top1Pct: top[0]?.pct ?? 0,
      totalHolders: rug.totalHolders,
      topHolderOwners: top.map((holder) => holder.owner),
    };
  }

  private static sumInsiderHolders(rug: RugReport): number {
    return rug.topHolders
      .filter((holder) => holder.insider && !rug.ammAccounts.has(holder.owner) && !rug.ammAccounts.has(holder.address))
      .reduce((sum, holder) => sum + holder.pct, 0);
  }

  private static creatorHasSold(creator: string | null, trades: PoolTrade[]): boolean {
    if (!creator) return false;
    return trades.some((trade) => trade.wallet === creator && trade.kind === 'sell');
  }

  private static mapActivity(
    pair: DexPair,
    candidate: PoolCandidate | null,
    totalHolders: number,
    previousHolders: number | null,
  ): TokenMarketSnapshot['activity'] {
    const uniqueTraders = (candidate?.buyers5m ?? 0) + (candidate?.sellers5m ?? 0);
    const transactions = pair.buys5m + pair.sells5m;
    const ratio = Math.min(MAX_RATIO, pair.buys5m / Math.max(pair.sells5m, 1));

    return {
      uniqueTraders5m: uniqueTraders,
      buySellRatio5m: ratio,
      holderGrowth5mPct: previousHolders && previousHolders > 0 ? ((totalHolders - previousHolders) / previousHolders) * PERCENT : 0,
      washTradeSuspected: uniqueTraders > 0 && transactions / uniqueTraders > WASH_TRADE_TX_PER_TRADER,
    };
  }
}
