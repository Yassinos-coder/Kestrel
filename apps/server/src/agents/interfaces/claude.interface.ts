import type { z } from 'zod';

export interface StructuredRequest<T extends z.ZodType> {
  label: string;
  model: string;
  system: string;
  user: string;
  schema: T;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}
