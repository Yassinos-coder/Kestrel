import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import type { ChatMessage, NvidiaChatResponse } from '../interfaces/nvidia.interface';
import type { LlmProvider, ProviderResult, StructuredRequest } from '../interfaces/llm.interface';
import { JsonExtractor } from '../utils/json-extractor.util';

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const REQUEST_INTERVAL_MS = 1_600;
const REQUEST_TIMEOUT_MS = 150_000;
const DEFAULT_MAX_TOKENS = 8_000;
const TEMPERATURE = 0.2;
const REPAIR_ATTEMPTS = 1;
const SCHEMA_INSTRUCTION =
  'Respond with ONLY one JSON object that satisfies this JSON Schema. Do not add explanations, markdown fences or any text outside the JSON object.';

export class NvidiaProvider implements LlmProvider {
  readonly name = 'nvidia' as const;
  private readonly logger = new Logger(NvidiaProvider.name);
  private nextSlotMs = 0;

  constructor(
    private readonly apiKey: string | undefined,
    readonly traderModel: string,
    readonly lightModel: string,
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<ProviderResult<z.infer<T>> | null> {
    if (!this.apiKey) return null;

    const schema = JSON.stringify(NvidiaProvider.jsonSchema(request.schema));
    const messages: ChatMessage[] = [
      { role: 'system', content: `${request.system}\n\n${SCHEMA_INSTRUCTION}\n${schema}` },
      { role: 'user', content: request.user },
    ];
    let inputTokens = 0;
    let outputTokens = 0;

    for (let attempt = 0; attempt <= REPAIR_ATTEMPTS; attempt++) {
      const response = await this.chat(request, messages);
      inputTokens += response.usage?.prompt_tokens ?? 0;
      outputTokens += response.usage?.completion_tokens ?? 0;
      const content = response.choices?.[0]?.message?.content ?? '';

      const parsed = request.schema.safeParse(JsonExtractor.extract(content));
      if (parsed.success) return { output: parsed.data as z.infer<T>, inputTokens, outputTokens };

      this.logger.warn(`${request.label} reply did not match the schema (attempt ${attempt + 1}): ${NvidiaProvider.describe(parsed.error)}`);
      messages.push({ role: 'assistant', content: content.slice(0, 4_000) });
      messages.push({ role: 'user', content: `That reply was not valid. Problem: ${NvidiaProvider.describe(parsed.error)}. Reply again with ONLY the corrected JSON object.` });
    }
    return null;
  }

  private async chat<T extends z.ZodType>(request: StructuredRequest<T>, messages: ChatMessage[]): Promise<NvidiaChatResponse> {
    await this.waitForSlot();
    return HttpFetcher.json<NvidiaChatResponse>(NVIDIA_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { model: request.model, messages, max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS, temperature: TEMPERATURE, stream: false },
      timeoutMs: REQUEST_TIMEOUT_MS,
      retries: 2,
    });
  }

  private waitForSlot(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, this.nextSlotMs);
    this.nextSlotMs = slot + REQUEST_INTERVAL_MS;
    if (slot === now) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, slot - now));
  }

  private static jsonSchema(schema: z.ZodType): unknown {
    const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
    return rest;
  }

  private static describe(error: z.ZodError): string {
    return error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || 'reply'}: ${issue.message}`)
      .join('; ');
  }
}
