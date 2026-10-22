import { describe, expect, it } from 'vitest';
import { JsonExtractor } from './json-extractor.util';

describe('JsonExtractor', () => {
  it('parses a plain JSON object', () => {
    expect(JsonExtractor.extract('{"action":"skip","confidence":40}')).toEqual({ action: 'skip', confidence: 40 });
  });

  it('removes reasoning blocks and markdown fences', () => {
    const text = '<think>Let me weigh this {carefully}.</think>\n```json\n{"action":"buy"}\n```';
    expect(JsonExtractor.extract(text)).toEqual({ action: 'buy' });
  });

  it('finds the object inside surrounding prose and handles braces in strings', () => {
    const text = 'Here is my answer: {"reasoning":"top holder {13%} is a risk","action":"skip"} Hope that helps.';
    expect(JsonExtractor.extract(text)).toEqual({ reasoning: 'top holder {13%} is a risk', action: 'skip' });
  });

  it('returns undefined when there is no JSON', () => {
    expect(JsonExtractor.extract('I cannot decide.')).toBeUndefined();
    expect(JsonExtractor.extract('<think>still thinking')).toBeUndefined();
  });
});
