import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { LlmProvider, ProviderResult, StructuredRequest } from '../interfaces/llm.interface';

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 8_000;

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;

  constructor(
    apiKey: string | undefined,
    readonly traderModel: string,
    readonly lightModel: string,
  ) {
    this.client = apiKey ? new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<ProviderResult<z.infer<T>> | null> {
    if (!this.client) return null;

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
    return { output: response.parsed_output as z.infer<T>, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  }
}
