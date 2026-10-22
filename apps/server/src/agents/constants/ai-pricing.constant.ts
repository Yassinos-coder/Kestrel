const TOKENS_PER_MILLION = 1_000_000;

export interface ModelPricing {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export const OPUS_PRICING: ModelPricing = { inputUsdPerMillion: 5, outputUsdPerMillion: 25 };
export const FREE_PRICING: ModelPricing = { inputUsdPerMillion: 0, outputUsdPerMillion: 0 };
export const HAIKU_PRICING: ModelPricing = { inputUsdPerMillion: 1, outputUsdPerMillion: 5 };

export const AI_TOKENS_PER_MILLION = TOKENS_PER_MILLION;
