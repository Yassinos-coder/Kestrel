import bs58 from 'bs58';
import nacl from 'tweetnacl';

const PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

export class WalletSignatureValidator {
  static buildMessage(walletAddress: string, nonce: string, issuedAtIso: string): string {
    return [
      'Sign in to Kestrel',
      '',
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Issued: ${issuedAtIso}`,
      '',
      'This signature costs nothing and does not authorize any transaction.',
    ].join('\n');
  }

  static isValidAddress(walletAddress: string): boolean {
    return WalletSignatureValidator.decodeAddress(walletAddress) !== null;
  }

  static verify(walletAddress: string, message: string, signatureBase64: string): boolean {
    const publicKey = WalletSignatureValidator.decodeAddress(walletAddress);
    if (!publicKey) return false;

    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length !== SIGNATURE_BYTES) return false;

    return nacl.sign.detached.verify(new TextEncoder().encode(message), new Uint8Array(signature), publicKey);
  }

  private static decodeAddress(walletAddress: string): Uint8Array | null {
    try {
      const decoded = bs58.decode(walletAddress);
      return decoded.length === PUBLIC_KEY_BYTES ? decoded : null;
    } catch {
      return null;
    }
  }
}
