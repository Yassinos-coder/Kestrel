import type { z } from 'zod';

export interface StructuredRequest<T extends z.ZodType> {
  label: string;
  userId?: string;
  model: string;
  system: string;
  user: string;
  schema: T;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}

export interface ProviderResult<T> {
  output: T;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly name: 'anthropic' | 'nvidia';
  readonly traderModel: string;
  readonly lightModel: string;
  isAvailable(): boolean;
  structured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<ProviderResult<z.infer<T>> | null>;
}
