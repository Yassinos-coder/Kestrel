import { z } from 'zod';

const PARAM_KEYS = [
  'minLiquidityUsd',
  'maxTop10HolderPct',
  'maxTop1HolderPct',
  'maxBundledSupplyPct',
  'maxSniperSupplyPct',
  'minTokenAgeSeconds',
  'minMarketCapUsd',
  'maxMarketCapUsd',
  'maxPriceChange5mPct',
  'minUniqueTraders5m',
  'minBuySellRatio5m',
  'maxBuySellRatio5m',
  'minSoftScore',
  'minConfidence',
  'maxPositionPct',
  'maxOpenPositions',
  'dailyLossLimitPct',
  'stopLossPct',
  'trailingStopPct',
  'maxHoldMinutes',
  'sellStreakExit',
  'takeProfit1Multiple',
  'takeProfit1SellPct',
  'takeProfit2Multiple',
  'takeProfit2SellPct',
] as const;

const FEATURES = [
  'top10Pct',
  'top1HolderPct',
  'bundledSupplyPct',
  'sniperSupplyPct',
  'liquidityUsd',
  'marketCapUsd',
  'ageSeconds',
  'priceChange5mPct',
  'uniqueTraders5m',
  'buySellRatio5m',
  'holderGrowth5mPct',
  'liquidityToMarketCapPct',
  'priceChange1hPct',
  'volumeTrendRatio',
] as const;

export const ReviewOutputSchema = z.object({
  summary: z.string(),
  learnedTradeIds: z.array(z.string()),
  noiseTradeIds: z.array(z.string()),
  paramChanges: z.array(
    z.object({
      param: z.enum(PARAM_KEYS),
      value: z.number(),
      rationale: z.string(),
    }),
  ),
  newPlaybooks: z.array(
    z.object({
      name: z.string(),
      conditions: z.array(
        z.object({
          feature: z.enum(FEATURES),
          operator: z.enum(['>', '>=', '<', '<=']),
          value: z.number(),
        }),
      ),
      effect: z.object({
        block: z.boolean().nullable(),
        scalp: z.boolean().nullable(),
        sizeMultiplier: z.number().nullable(),
        maxHoldMinutes: z.number().nullable(),
        takeProfitMultiple: z.number().nullable(),
        stopLossPct: z.number().nullable(),
      }),
      rationale: z.string(),
      evidenceTradeIds: z.array(z.string()),
    }),
  ),
  retirePlaybookIds: z.array(z.string()),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
