import type { HolderAccount, ParsedSwap, WalletProfile } from '../../market-data/interfaces/helius.interface';
import type { HolderForensics, HolderLine } from '../interfaces/holder-forensics.interface';

const PERCENT = 100;
const TOP_HOLDERS = 10;
const EARLY_WINDOW_MS = 60_000;
const RECENT_WINDOW_MS = 15 * 60_000;
const FRESH_AGE_HOURS = 48;
const FRESH_TX_COUNT = 15;
const MIN_CLUSTER_SIZE = 2;
const EPSILON = 1e-9;
const MAX_EARLY_WALLETS = 40;
const MAX_VOLUME_RATIO = 99;

export interface ForensicsInputs {
  topHolders: HolderAccount[];
  holderCount: number;
  supplyRaw: number;
  excludedOwners: Set<string>;
  swaps: ParsedSwap[];
  swapsReachedStart: boolean;
  profiles: Map<string, WalletProfile>;
  funders: Map<string, string | null>;
  nowMs: number;
}

interface EarlyBuyers {
  wallets: Set<string>;
  bought: number;
  sold: number;
  stillHeld: number;
}

export class ForensicsAnalyzer {
  static analyze(inputs: ForensicsInputs): HolderForensics {
    const knownTotal = inputs.topHolders.reduce((sum, holder) => sum + holder.amount, 0);
    const total = (inputs.supplyRaw > 0 ? Math.max(inputs.supplyRaw, knownTotal) : knownTotal) || EPSILON;
    const ranked = inputs.topHolders.filter((holder) => !inputs.excludedOwners.has(holder.owner)).sort((a, b) => b.amount - a.amount);

    const early = ForensicsAnalyzer.earlyBuyers(inputs.swaps, inputs.swapsReachedStart, inputs.excludedOwners);
    const topHolders = ranked.slice(0, TOP_HOLDERS).map((holder) => ForensicsAnalyzer.line(holder, total, early.wallets, inputs));
    const flow = ForensicsAnalyzer.flow(inputs.swaps, inputs.nowMs);

    return {
      holderCount: inputs.holderCount,
      top10Pct: topHolders.reduce((sum, line) => sum + line.pct, 0),
      top1Pct: topHolders[0]?.pct ?? 0,
      freshWalletPct: topHolders.filter((line) => line.fresh).reduce((sum, line) => sum + line.pct, 0),
      sameFunderPct: ForensicsAnalyzer.largestFunderCluster(topHolders),
      launchVisible: inputs.swapsReachedStart,
      earlyBuyerCount: early.wallets.size,
      earlyBuyerHoldPct: (early.stillHeld / total) * PERCENT,
      earlyBuyersSoldPct: early.bought > 0 ? Math.min(PERCENT, (early.sold / early.bought) * PERCENT) : 0,
      uniqueBuyers: flow.uniqueBuyers,
      uniqueSellers: flow.uniqueSellers,
      sellBuyVolumeRatio: flow.sellBuyVolumeRatio,
      swapsSeen: inputs.swaps.length,
      topHolders,
      earlyBuyerWallets: [...early.wallets].slice(0, MAX_EARLY_WALLETS),
    };
  }

  private static line(holder: HolderAccount, total: number, early: Set<string>, inputs: ForensicsInputs): HolderLine {
    const profile = inputs.profiles.get(holder.owner);
    const fresh = profile ? (profile.ageHours !== null && profile.ageHours < FRESH_AGE_HOURS) || profile.txCount < FRESH_TX_COUNT : false;
    return {
      owner: holder.owner,
      pct: (holder.amount / total) * PERCENT,
      fresh,
      earlyBuyer: early.has(holder.owner),
      funder: inputs.funders.get(holder.owner) ?? null,
    };
  }

  private static earlyBuyers(swaps: ParsedSwap[], reachedStart: boolean, excluded: Set<string>): EarlyBuyers {
    const empty: EarlyBuyers = { wallets: new Set(), bought: 0, sold: 0, stillHeld: 0 };
    if (!reachedStart || !swaps.length) return empty;

    const ordered = [...swaps].sort((a, b) => a.timestampMs - b.timestampMs);
    const cutoff = (ordered[0]?.timestampMs ?? 0) + EARLY_WINDOW_MS;
    const wallets = new Set(ordered.filter((swap) => swap.side === 'buy' && swap.timestampMs <= cutoff && !excluded.has(swap.wallet)).map((swap) => swap.wallet));

    const flows = new Map<string, { bought: number; sold: number }>();
    for (const swap of ordered) {
      if (!wallets.has(swap.wallet)) continue;
      const flow = flows.get(swap.wallet) ?? { bought: 0, sold: 0 };
      if (swap.side === 'buy') flow.bought += swap.tokenAmount;
      else flow.sold += swap.tokenAmount;
      flows.set(swap.wallet, flow);
    }

    const totals = [...flows.values()].reduce<{ bought: number; sold: number; stillHeld: number }>(
      (sum, flow) => ({ bought: sum.bought + flow.bought, sold: sum.sold + flow.sold, stillHeld: sum.stillHeld + Math.max(0, flow.bought - flow.sold) }),
      { bought: 0, sold: 0, stillHeld: 0 },
    );
    return { wallets, ...totals };
  }

  private static flow(swaps: ParsedSwap[], nowMs: number) {
    const buyers = new Set(swaps.filter((swap) => swap.side === 'buy').map((swap) => swap.wallet));
    const sellers = new Set(swaps.filter((swap) => swap.side === 'sell').map((swap) => swap.wallet));
    const recent = swaps.filter((swap) => nowMs - swap.timestampMs <= RECENT_WINDOW_MS);
    const buyVolume = recent.filter((swap) => swap.side === 'buy').reduce((sum, swap) => sum + swap.tokenAmount, 0);
    const sellVolume = recent.filter((swap) => swap.side === 'sell').reduce((sum, swap) => sum + swap.tokenAmount, 0);

    return { uniqueBuyers: buyers.size, uniqueSellers: sellers.size, sellBuyVolumeRatio: Math.min(MAX_VOLUME_RATIO, sellVolume / Math.max(buyVolume, EPSILON)) };
  }

  private static largestFunderCluster(lines: HolderLine[]): number {
    const groups = new Map<string, { count: number; pct: number }>();
    for (const line of lines) {
      if (!line.funder) continue;
      const group = groups.get(line.funder) ?? { count: 0, pct: 0 };
      groups.set(line.funder, { count: group.count + 1, pct: group.pct + line.pct });
    }
    return Math.max(0, ...[...groups.values()].filter((group) => group.count >= MIN_CLUSTER_SIZE).map((group) => group.pct));
  }
}
