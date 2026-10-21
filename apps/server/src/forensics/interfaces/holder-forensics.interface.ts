export interface HolderLine {
  owner: string;
  pct: number;
  fresh: boolean;
  earlyBuyer: boolean;
  funder: string | null;
}

export interface HolderForensics {
  holderCount: number;
  top10Pct: number;
  top1Pct: number;
  freshWalletPct: number;
  sameFunderPct: number;
  launchVisible: boolean;
  earlyBuyerCount: number;
  earlyBuyerHoldPct: number;
  earlyBuyersSoldPct: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  sellBuyVolumeRatio: number;
  swapsSeen: number;
  topHolders: HolderLine[];
  earlyBuyerWallets: string[];
}
