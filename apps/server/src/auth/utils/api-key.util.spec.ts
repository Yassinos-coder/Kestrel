import { describe, expect, it } from 'vitest';
import { ApiKeyUtil } from './api-key.util';

describe('ApiKeyUtil', () => {
  it('generates a prefixed key whose hash matches', () => {
    const { key, prefix, hash } = ApiKeyUtil.generate();
    expect(ApiKeyUtil.isApiKey(key)).toBe(true);
    expect(key.startsWith(prefix)).toBe(true);
    expect(ApiKeyUtil.hash(key)).toBe(hash);
  });

  it('does not treat a jwt as an api key', () => {
    expect(ApiKeyUtil.isApiKey('eyJhbGciOiJIUzI1NiJ9.x.y')).toBe(false);
  });
});
