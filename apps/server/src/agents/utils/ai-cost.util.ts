import { AI_TOKENS_PER_MILLION, HAIKU_PRICING, OPUS_PRICING, type ModelPricing } from '../constants/ai-pricing.constant';

export class AiCostUtil {
  static costUsd(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = AiCostUtil.pricingFor(model);
    return (inputTokens * pricing.inputUsdPerMillion + outputTokens * pricing.outputUsdPerMillion) / AI_TOKENS_PER_MILLION;
  }

  private static pricingFor(model: string): ModelPricing {
    return model.toLowerCase().includes('haiku') ? HAIKU_PRICING : OPUS_PRICING;
  }
}
