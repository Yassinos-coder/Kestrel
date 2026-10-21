import { Injectable } from '@nestjs/common';
import { LEARNING_AGENT_PROMPT, WRAP_TOKEN_DATA } from '../constants/agent-prompts.constant';
import type { PostMortemInput } from '../interfaces/agent-inputs.interface';
import { PostMortemSchema, type PostMortem } from '../schemas/agent-outputs.schema';
import { ClaudeService } from './claude.service';

const MAX_TAGS = 4;

@Injectable()
export class LearningAgentService {
  constructor(private readonly claude: ClaudeService) {}

  async postMortem(input: PostMortemInput, userId: string): Promise<PostMortem> {
    const ai = await this.claude.structured({
      label: `postmortem:${input.symbol}`,
      userId,
      model: this.claude.lightModel,
      system: LEARNING_AGENT_PROMPT,
      user: WRAP_TOKEN_DATA(JSON.stringify(input)),
      schema: PostMortemSchema,
      effort: 'low',
    });
    if (ai) return { lesson: ai.lesson, tags: ai.tags.slice(0, MAX_TAGS) };
    return this.fallback(input);
  }

  private fallback(input: PostMortemInput): PostMortem {
    const result = input.pnlPct >= 0 ? 'gained' : 'lost';
    const lesson = `${input.symbol} ${result} ${Math.abs(input.pnlPct).toFixed(0)}% over ${Math.round(input.heldMinutes)} minutes, exited because: ${input.exitReason}. Peak was ${input.peakMultiple.toFixed(2)}x.`;
    const tags = [input.pnlPct >= 0 ? 'win' : 'loss', input.plan.style];
    return { lesson, tags };
  }
}
