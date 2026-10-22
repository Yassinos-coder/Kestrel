import { Injectable } from '@nestjs/common';
import { HttpFetcher } from '../../shared/utils/http-fetcher.util';
import { PUMPFUN_BASE_URL } from '../constants/market-data.constant';
import type { PoolCandidate } from '../interfaces/market-data.interface';
import type { PumpFunCoin } from '../interfaces/pumpfun.interface';
import { PumpFunCandidateMapper } from '../mappers/pumpfun-candidate.mapper';

const GRADUATED_LIMIT = 50;
const PUMPFUN_TIMEOUT_MS = 6_000;

@Injectable()
export class PumpFunClient {
  async getRecentGraduates(): Promise<PoolCandidate[]> {
    const query = `offset=0&limit=${GRADUATED_LIMIT}&sort=created_timestamp&order=DESC&includeNsfw=false&complete=true`;
    const coins = await HttpFetcher.json<PumpFunCoin[]>(`${PUMPFUN_BASE_URL}/coins?${query}`, { timeoutMs: PUMPFUN_TIMEOUT_MS, retries: 1 });
    return PumpFunCandidateMapper.toCandidates(coins);
  }
}
