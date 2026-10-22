import { AI_TOKENS_PER_MILLION, FREE_PRICING, HAIKU_PRICING, OPUS_PRICING, type ModelPricing } from '../constants/ai-pricing.constant';

export class AiCostUtil {
  static costUsd(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = AiCostUtil.pricingFor(model);
    return (inputTokens * pricing.inputUsdPerMillion + outputTokens * pricing.outputUsdPerMillion) / AI_TOKENS_PER_MILLION;
  }

  private static pricingFor(model: string): ModelPricing {
    const name = model.toLowerCase();
    if (name.includes('haiku')) return HAIKU_PRICING;
    if (name.includes('claude') || name.includes('opus') || name.includes('sonnet')) return OPUS_PRICING;
    return FREE_PRICING;
  }
}
