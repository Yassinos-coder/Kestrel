import { useMutation } from '@tanstack/react-query';
import type { Wallet } from '@wallet-standard/base';
import type { StandardConnectFeature } from '@wallet-standard/features';
import type { SolanaSignMessageFeature } from '@solana/wallet-standard-features';
import { getWallets } from '@wallet-standard/app';
import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { FormatUtils } from '@/utils/FormatUtils';

const CONNECT_FEATURE = 'standard:connect';
const SIGN_FEATURE = 'solana:signMessage';

type SignerWallet = Wallet & {
  features: Wallet['features'] & StandardConnectFeature & SolanaSignMessageFeature;
};

const isSolanaSigner = (wallet: Wallet): wallet is SignerWallet =>
  CONNECT_FEATURE in wallet.features && SIGN_FEATURE in wallet.features && wallet.chains.some((chain) => chain.startsWith('solana:'));

export function useDetectedWallets(): SignerWallet[] {
  const [wallets, setWallets] = useState<SignerWallet[]>(() => getWallets().get().filter(isSolanaSigner));

  useEffect(() => {
    const registry = getWallets();
    const refresh = () => setWallets(registry.get().filter(isSolanaSigner));
    refresh();
    const offRegister = registry.on('register', refresh);
    const offUnregister = registry.on('unregister', refresh);
    return () => {
      offRegister();
      offUnregister();
    };
  }, []);

  return wallets;
}

export function useWalletLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (wallet: SignerWallet) => {
      const { accounts } = await wallet.features[CONNECT_FEATURE].connect();
      const account = accounts.find((candidate) => candidate.chains.some((chain) => chain.startsWith('solana:'))) ?? accounts[0];
      if (!account) throw new Error('The wallet did not share an account');

      const challenge = await authService.challenge(account.address);
      const [signed] = await wallet.features[SIGN_FEATURE].signMessage({
        account,
        message: new TextEncoder().encode(challenge.message),
      });
      if (!signed) throw new Error('The wallet did not sign the message');

      return authService.verify(account.address, challenge.nonce, FormatUtils.base64(signed.signature));
    },
    onSuccess: (session) => setSession(session),
  });
}

export type { SignerWallet };
