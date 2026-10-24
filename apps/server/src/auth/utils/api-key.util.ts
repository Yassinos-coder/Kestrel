import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'ksk_';
const SECRET_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = 12;

export class ApiKeyUtil {
  static generate(): { key: string; prefix: string; hash: string } {
    const key = `${API_KEY_PREFIX}${randomBytes(SECRET_BYTES).toString('base64url')}`;
    return { key, prefix: key.slice(0, DISPLAY_PREFIX_LENGTH), hash: ApiKeyUtil.hash(key) };
  }

  static hash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  static isApiKey(token: string): boolean {
    return token.startsWith(API_KEY_PREFIX);
  }
}
