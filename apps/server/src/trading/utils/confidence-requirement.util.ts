const WHALE_TOP1_PCT = 10;
const WHALE_MIN_CONFIDENCE = 75;

export class ConfidenceRequirement {
  static required(minConfidence: number, top1HolderPct: number): number {
    if (!ConfidenceRequirement.hasWhale(top1HolderPct)) return minConfidence;
    return Math.max(minConfidence, WHALE_MIN_CONFIDENCE);
  }

  static hasWhale(top1HolderPct: number): boolean {
    return top1HolderPct >= WHALE_TOP1_PCT;
  }
}
