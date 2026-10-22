import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';
import type { LlmProvider, StructuredRequest } from '../interfaces/llm.interface';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { NvidiaProvider } from '../providers/nvidia.provider';
import { AiUsageRepository } from '../repositories/ai-usage.repository';
import { AiCostUtil } from '../utils/ai-cost.util';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: LlmProvider;

  constructor(
    configService: ConfigService,
    private readonly usage: AiUsageRepository,
  ) {
    this.provider =
      configService.get<string>('ai.provider') === 'nvidia'
        ? new NvidiaProvider(
            configService.get<string>('nvidia.apiKey'),
            configService.getOrThrow<string>('nvidia.traderModel'),
            configService.getOrThrow<string>('nvidia.lightModel'),
          )
        : new AnthropicProvider(
            configService.get<string>('anthropic.apiKey'),
            configService.getOrThrow<string>('anthropic.traderModel'),
            configService.getOrThrow<string>('anthropic.lightModel'),
          );
    if (!this.provider.isAvailable()) this.logger.warn(`No API key for the ${this.provider.name} AI provider, agents fall back to rules-only behaviour`);
    else this.logger.log(`AI provider: ${this.provider.name} (trader ${this.provider.traderModel}, light ${this.provider.lightModel})`);
  }

  get traderModel(): string {
    return this.provider.traderModel;
  }

  get lightModel(): string {
    return this.provider.lightModel;
  }

  isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  async structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T> | null> {
    if (!this.provider.isAvailable()) return null;

    try {
      const result = await this.provider.structured(request);
      if (!result) return null;
      await this.recordUsage(request, result.inputTokens, result.outputTokens);
      return result.output;
    } catch (error) {
      this.logger.warn(`${request.label} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  private async recordUsage<T extends z.ZodType>(request: StructuredRequest<T>, inputTokens: number, outputTokens: number): Promise<void> {
    try {
      await this.usage.record({
        userId: request.userId ?? null,
        label: request.label,
        model: request.model,
        inputTokens,
        outputTokens,
        costUsd: AiCostUtil.costUsd(request.model, inputTokens, outputTokens),
      });
    } catch (error) {
      this.logger.warn(`Could not record AI usage: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
