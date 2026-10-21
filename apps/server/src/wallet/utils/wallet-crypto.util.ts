import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { InternalServerErrorException } from '@nestjs/common';
import type { EncryptedSecret } from '../interfaces/encrypted-secret.interface';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

export class WalletCrypto {
  static encrypt(secret: Uint8Array, encodedKey: string | undefined): EncryptedSecret {
    const key = WalletCrypto.parseKey(encodedKey);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
    return {
      encryptedSecret: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  static decrypt(payload: EncryptedSecret, encodedKey: string | undefined): Uint8Array {
    const key = WalletCrypto.parseKey(encodedKey);
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    return new Uint8Array(Buffer.concat([decipher.update(Buffer.from(payload.encryptedSecret, 'base64')), decipher.final()]));
  }

  private static parseKey(encodedKey: string | undefined): Buffer {
    if (!encodedKey) throw new InternalServerErrorException('WALLET_ENCRYPTION_KEY is not configured');
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== KEY_BYTES) {
      throw new InternalServerErrorException('WALLET_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
    }
    return key;
  }
}
