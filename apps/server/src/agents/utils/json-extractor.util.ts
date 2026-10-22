const THINK_BLOCK = /<think>[\s\S]*?<\/think>/gi;
const UNCLOSED_THINK = /<think>[\s\S]*$/i;
const CODE_FENCE = /```(?:json)?\s*([\s\S]*?)```/i;

export class JsonExtractor {
  static extract(text: string): unknown {
    const cleaned = text.replace(THINK_BLOCK, '').replace(UNCLOSED_THINK, '').trim();
    const fenced = CODE_FENCE.exec(cleaned)?.[1]?.trim();
    const candidates = [cleaned, fenced, JsonExtractor.firstObject(cleaned)].filter((value): value is string => Boolean(value));
    for (const candidate of candidates) {
      const parsed = JsonExtractor.tryParse(candidate);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  }

  private static firstObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index]!;
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) return text.slice(start, index + 1);
    }
    return null;
  }

  private static tryParse(candidate: string): unknown {
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
}
