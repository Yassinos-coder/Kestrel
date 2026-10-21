import { z } from 'zod';

export const AnalystReportSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

export const TraderDecisionSchema = z.object({
  action: z.enum(['buy', 'skip']),
  confidence: z.number(),
  sizeFraction: z.number(),
  style: z.enum(['scalp', 'swing', 'runner']),
  maxHoldMinutes: z.number(),
  takeProfitMultiple: z.number(),
  stopLossPct: z.number(),
  reasoning: z.string(),
});

export const PostMortemSchema = z.object({
  lesson: z.string(),
  tags: z.array(z.string()),
});

export type AnalystReport = z.infer<typeof AnalystReportSchema>;
export type TraderDecision = z.infer<typeof TraderDecisionSchema>;
export type PostMortem = z.infer<typeof PostMortemSchema>;
