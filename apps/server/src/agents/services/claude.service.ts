import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { StructuredRequest } from '../interfaces/claude.interface';

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 8_000;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic | null;
  readonly traderModel: string;
  readonly lightModel: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('anthropic.apiKey');
    this.client = apiKey ? new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES }) : null;
    this.traderModel = configService.getOrThrow<string>('anthropic.traderModel');
    this.lightModel = configService.getOrThrow<string>('anthropic.lightModel');
    if (!this.client) this.logger.warn('ANTHROPIC_API_KEY is not set, agents fall back to rules-only behaviour');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T> | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.messages.parse({
        model: request.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
        output_config: { effort: request.effort, format: zodOutputFormat(request.schema) },
      });
      if (response.stop_reason === 'refusal') {
        this.logger.warn(`${request.label} was declined by the model`);
        return null;
      }
      if (!response.parsed_output) {
        this.logger.warn(`${request.label} returned no parsable output (stop_reason=${response.stop_reason})`);
        return null;
      }
      return response.parsed_output as z.infer<T>;
    } catch (error) {
      this.logger.warn(`${request.label} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }
}
