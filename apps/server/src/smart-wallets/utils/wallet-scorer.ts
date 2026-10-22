import type { WalletPerformanceSummary } from '../../market-data/interfaces/birdeye.interface';
import type { WalletAssessment, WalletStats, WalletTier } from '../interfaces/wallet.interface';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SWAPS_PER_DAY = 150;
const MIN_SPAN_DAYS = 1;
const MIN_CLOSED_TOKENS = 5;
const MIN_WIN_RATE = 50;
const MIN_PROFIT_SOL = 1;
const MAX_BEST_TOKEN_SHARE = 60;
const MIN_MEDIAN_HOLD_MINUTES = 0.5;
const MIN_SOL_SIDED_PCT = 50;
const MAX_INACTIVE_DAYS = 5;
const NEUTRAL_EARLINESS = 7;
const MIN_READABLE_SWAPS = 5;

export class WalletScorer {
  static assess(stats: WalletStats, nowMs: number): WalletAssessment {
    const rejectReasons = WalletScorer.rejections(stats, nowMs);
    const score = Math.round(WalletScorer.score(stats, nowMs));
    return { stats, score, tier: rejectReasons.length ? null : WalletScorer.tier(score), rejectReasons };
  }

  static assessVetted(stats: WalletStats, summary: WalletPerformanceSummary, solUsd: number, nowMs: number): WalletAssessment {
    const merged: WalletStats = {
      ...stats,
      winRatePct: summary.winRatePct,
      closedTokens: summary.wins + summary.losses,
      tokensTraded: summary.uniqueTokens,
      totalPnlSol: solUsd > 0 ? summary.realizedProfitUsd / solUsd : 0,
    };
    const rejectReasons = WalletScorer.vettedRejections(stats, nowMs);
    const score = Math.round(WalletScorer.vettedScore(merged, summary, nowMs));
    return { stats: merged, score, tier: rejectReasons.length ? null : WalletScorer.tier(score), rejectReasons };
  }

  private static vettedRejections(stats: WalletStats, nowMs: number): string[] {
    const reasons: string[] = [];
    if (stats.swapsAnalyzed < MIN_READABLE_SWAPS) reasons.push('swaps cannot be read, so they could not be copied');
    if (stats.swapsPerDay > MAX_SWAPS_PER_DAY) reasons.push('trades like a bot (too many swaps per day)');
    if (nowMs - stats.lastActiveMs > MAX_INACTIVE_DAYS * DAY_MS) reasons.push('no recent activity');
    return reasons;
  }

  private static vettedScore(stats: WalletStats, summary: WalletPerformanceSummary, nowMs: number): number {
    const winRate = WalletScorer.clamp((summary.winRatePct - 30) / 40) * 25;
    const breadth = WalletScorer.clamp(summary.uniqueTokens / 30) * 10;
    const profit = WalletScorer.clamp(Math.log10(1 + Math.max(0, stats.totalPnlSol)) / Math.log10(101)) * 25;
    const returns = WalletScorer.clamp(summary.realizedProfitPct / 300) * 15;
    const recency = nowMs - stats.lastActiveMs <= 2 * DAY_MS ? 5 : 2;
    const humanLike = stats.swapsPerDay <= 80 ? 10 : 5;
    return winRate + breadth + profit + returns + recency + humanLike;
  }

  private static rejections(stats: WalletStats, nowMs: number): string[] {
    const reasons: string[] = [];
    if (stats.swapsPerDay > MAX_SWAPS_PER_DAY) reasons.push('trades like a bot (too many swaps per day)');
    if (stats.spanDays < MIN_SPAN_DAYS) reasons.push('history is too short');
    if (stats.solSidedPct < MIN_SOL_SIDED_PCT) reasons.push('mostly token-to-token or stablecoin swaps');
    if (stats.closedTokens < MIN_CLOSED_TOKENS) reasons.push('too few completed trades');
    if (stats.winRatePct < MIN_WIN_RATE) reasons.push('win rate is too low');
    if (stats.totalPnlSol < MIN_PROFIT_SOL) reasons.push('not profitable enough');
    if (stats.bestTokenSharePct > MAX_BEST_TOKEN_SHARE) reasons.push('profit comes from one lucky token');
    if (stats.medianHoldMinutes < MIN_MEDIAN_HOLD_MINUTES) reasons.push('holds for seconds, bot-like');
    if (nowMs - stats.lastActiveMs > MAX_INACTIVE_DAYS * DAY_MS) reasons.push('no recent activity');
    return reasons;
  }

  private static score(stats: WalletStats, nowMs: number): number {
    const winRate = WalletScorer.clamp((stats.winRatePct - 45) / 30) * 25;
    const breadth = WalletScorer.clamp(stats.closedTokens / 25) * 10;
    const profit = WalletScorer.clamp(Math.log10(1 + Math.max(0, stats.totalPnlSol)) / Math.log10(101)) * 25;
    const diversification = WalletScorer.clamp(1 - stats.bestTokenSharePct / 100) * 10;
    const earliness = stats.earlyEntryPct === null ? NEUTRAL_EARLINESS : WalletScorer.clamp(stats.earlyEntryPct / 100) * 15;
    const recency = nowMs - stats.lastActiveMs <= 2 * DAY_MS ? 5 : 2;
    const humanLike = stats.medianHoldMinutes >= 2 && stats.swapsPerDay <= 80 ? 10 : 5;
    return winRate + breadth + profit + diversification + earliness + recency + humanLike;
  }

  private static tier(score: number): WalletTier | null {
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return null;
  }

  private static clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
