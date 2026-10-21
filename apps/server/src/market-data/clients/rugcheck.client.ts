import { Injectable } from '@nestjs/common';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { RUGCHECK_BASE_URL } from '../constants/market-data.constant';
import type { RugReport } from '../interfaces/market-data.interface';

interface RugHolder {
  address: string;
  owner: string;
  pct: number;
  insider: boolean;
}

interface RugMarket {
  lp?: { lpLockedPct?: number };
}

interface RugInsiderNetwork {
  size: number;
  currentHolding: number;
}

interface RugCreatorToken {
  rugged?: boolean;
}

interface RugReportResponse {
  mint: string;
  tokenProgram: string;
  creator: string | null;
  creatorBalance: number;
  rugged: boolean;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  token?: { supply?: number };
  totalHolders?: number;
  transferFee?: { pct?: number };
  token_extensions?: { transferHook?: unknown; permanentDelegate?: unknown } | null;
  topHolders?: RugHolder[] | null;
  knownAccounts?: Record<string, { type: string }> | null;
  markets?: RugMarket[] | null;
  insiderNetworks?: RugInsiderNetwork[] | null;
  creatorTokens?: RugCreatorToken[] | null;
}

const EXCLUDED_ACCOUNT_TYPES = new Set(['AMM', 'LOCKER']);
const MIN_INSIDER_NETWORK_SIZE = 5;

@Injectable()
export class RugCheckClient {
  async getReport(mint: string): Promise<RugReport> {
    const report = await HttpFetcher.json<RugReportResponse>(`${RUGCHECK_BASE_URL}/tokens/${mint}/report`);
    return this.toReport(report);
  }

  private toReport(report: RugReportResponse): RugReport {
    const supply = report.token?.supply ?? 0;
    const insiderNetworks = (report.insiderNetworks ?? []).filter((network) => network.size >= MIN_INSIDER_NETWORK_SIZE);
    const creatorTokens = report.creatorTokens ?? [];

    return {
      mint: report.mint,
      tokenProgram: report.tokenProgram,
      creator: report.creator,
      creatorBalance: report.creatorBalance,
      rugged: report.rugged,
      mintAuthority: report.mintAuthority,
      freezeAuthority: report.freezeAuthority,
      supply,
      totalHolders: report.totalHolders ?? 0,
      transferFeePct: report.transferFee?.pct ?? 0,
      hasTransferHook: Boolean(report.token_extensions?.transferHook),
      hasPermanentDelegate: Boolean(report.token_extensions?.permanentDelegate),
      topHolders: (report.topHolders ?? []).map((holder) => ({
        owner: holder.owner,
        address: holder.address,
        pct: holder.pct,
        insider: holder.insider,
      })),
      ammAccounts: this.collectExcludedAccounts(report),
      lpLockedPct: this.lowestLpLockedPct(report.markets ?? []),
      insiderNetworkHolding: supply > 0 ? insiderNetworks.reduce((sum, network) => sum + network.currentHolding, 0) / supply : 0,
      insiderNetworkCount: insiderNetworks.length,
      creatorTokenCount: creatorTokens.length,
      creatorRugCount: creatorTokens.filter((token) => token.rugged).length,
    };
  }

  private collectExcludedAccounts(report: RugReportResponse): Set<string> {
    const excluded = new Set<string>();
    for (const [address, info] of Object.entries(report.knownAccounts ?? {})) {
      if (EXCLUDED_ACCOUNT_TYPES.has(info.type)) excluded.add(address);
    }
    return excluded;
  }

  private lowestLpLockedPct(markets: RugMarket[]): number {
    const values = markets.map((market) => market.lp?.lpLockedPct).filter((value): value is number => value !== undefined);
    if (!values.length) return 0;
    return Math.min(...values);
  }
}
